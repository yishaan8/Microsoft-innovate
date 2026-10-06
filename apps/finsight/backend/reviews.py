"""Historical batch review using the trained HGB, existing store and evidence chain."""

import csv
import hashlib
import io
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

import joblib
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import Field, ValidationError

from backend.commerce import StrictInput, canonical, operator_access, store
from backend.config.settings import PROJECT_ROOT
from backend.schemas.transaction import TransactionInput
from ml.evaluation.cost_model import CostAssumptions
from ml.evaluation.review_queue import allocate_reviews
from ml.features.build_features import FEATURE_COLUMNS, RAW_COLUMNS_USED, build_features
from ml.training.train_review_queue import calibrated_probabilities

router = APIRouter()
MODEL_DIR = Path(PROJECT_ROOT) / "ml/models/review_queue"
MAX_ROWS = 10_000


class BatchInput(StrictInput):
    csv_text: str = Field(min_length=1, max_length=2_000_000)
    capacity_per_day: int = Field(default=3, ge=1, le=500, strict=True)
    review_from: date | None = None


class CaseResolution(StrictInput):
    outcome: Literal["suspected_fraud", "legitimate", "inconclusive"]
    reviewer: str = Field(min_length=1, max_length=64, pattern=r"\S")
    note: str = Field(min_length=1, max_length=500, pattern=r"\S")


def initialize_reviews(value):
    with value.connect() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS review_batches (
                id TEXT PRIMARY KEY, fingerprint TEXT UNIQUE NOT NULL, payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS review_days (
                day TEXT PRIMARY KEY, batch_id TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS review_cases (
                id TEXT PRIMARY KEY, batch_id TEXT NOT NULL, transaction_id TEXT NOT NULL,
                priority REAL NOT NULL, status TEXT NOT NULL, receipt TEXT NOT NULL,
                UNIQUE(batch_id, transaction_id));
            CREATE INDEX IF NOT EXISTS review_cases_batch ON review_cases(batch_id, status, priority);
        """)


def load_review_model():
    artifact = MODEL_DIR / "hgb_review.pkl"
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    report = json.loads((MODEL_DIR / "benchmark.json").read_text())
    if digest != report["model_sha256"]:
        raise ValueError("Review model does not match its recorded artifact hash")
    bundle = joblib.load(artifact)  # Trusted, packaged artifact only.
    if bundle["feature_columns"] != FEATURE_COLUMNS:
        raise ValueError("Review feature contract mismatch")
    bundle["model_sha256"] = digest
    return bundle


def parse_transactions(text: str) -> pd.DataFrame:
    reader = csv.DictReader(io.StringIO(text.lstrip("\ufeff")))
    headers = reader.fieldnames or []
    if len(headers) != len(set(headers)) or not set(RAW_COLUMNS_USED).issubset(headers):
        raise ValueError("CSV must have unique headers and all raw transaction columns")
    if set(headers) - set(RAW_COLUMNS_USED) - {"is_fraud"}:
        raise ValueError("Unexpected CSV columns; engineered features are not accepted")
    records = []
    for index, row in enumerate(reader, start=2):
        if len(records) >= MAX_ROWS:
            raise ValueError(f"Upload is limited to {MAX_ROWS} transactions")
        if None in row or any(row.get(key) is None for key in RAW_COLUMNS_USED):
            raise ValueError(f"Malformed CSV row {index}")
        # Labels in an evaluation CSV are deliberately excluded before scoring.
        validated = TransactionInput.model_validate(
            {key: row[key] for key in RAW_COLUMNS_USED}
        )
        record = validated.model_dump()
        for key in ("timestamp", "account_created"):
            ts = record[key]
            record[key] = (
                ts.replace(tzinfo=timezone.utc)
                if ts.tzinfo is None
                else ts.astimezone(timezone.utc)
            )
        records.append(record)
    if not records:
        raise ValueError("CSV has no transactions")
    frame = pd.DataFrame(records)
    if frame.transaction_id.duplicated().any():
        raise ValueError("Transaction IDs must be unique")
    # The inherited feature builder needs a strict event order per customer.
    if frame.duplicated(["customer_id", "timestamp"]).any():
        raise ValueError("Customer timestamps must be unique within the batch")
    return frame.sort_values(["customer_id", "timestamp"]).reset_index(drop=True)


def model_or_503(request):
    bundle = getattr(request.app.state, "review_model", None)
    if bundle is None:
        raise HTTPException(503, "Review model is unavailable")
    return bundle


def verified_case(db, row):
    receipt = json.loads(row["receipt"])
    event = db.execute(
        "SELECT payload FROM events WHERE hash=?", (receipt.get("event_hash"),)
    ).fetchone()
    recorded = json.loads(event[0]).get("receipt") if event else None
    snapshot = {key: val for key, val in receipt.items() if key != "event_hash"}
    if recorded != snapshot or any(
        row[column] != receipt[field]
        for column, field in (
            ("id", "id"),
            ("batch_id", "batch_id"),
            ("transaction_id", "transaction_id"),
            ("status", "status"),
            ("priority", "expected_net_benefit"),
        )
    ):
        raise HTTPException(503, "Stored case does not match its evidence receipt")
    return receipt


def import_transactions(payload: BatchInput, request: Request, provenance: str):
    bundle = model_or_503(request)
    try:
        frame = parse_transactions(payload.csv_text)
        policy = {
            "version": "loss-review-v1",
            "currency": "INR",
            "capacity_per_day": payload.capacity_per_day,
            "review_from": str(payload.review_from) if payload.review_from else None,
            "cost_assumptions": bundle["cost_assumptions"],
            "ranking": "expected_loss",
            "review_unit": "transaction",
            "timezone": "UTC",
        }
        # Canonical records, not whitespace in CSV, determine idempotent identity.
        data_digest = hashlib.sha256(
            frame.to_json(orient="records", date_format="iso").encode()
        ).hexdigest()
        fingerprint = hashlib.sha256(
            canonical(
                {
                    "dataset": data_digest,
                    "model": bundle["model_sha256"],
                    "policy": policy,
                }
            ).encode()
        ).hexdigest()
        value = store(request)
        with value.connect() as db:
            if not value.verify(db)["valid"]:
                raise HTTPException(503, "Evidence chain verification failed")
            prior = db.execute(
                "SELECT payload FROM review_batches WHERE fingerprint=?", (fingerprint,)
            ).fetchone()
            if prior:
                return json.loads(prior[0])
        features = build_features(frame)
        if payload.review_from:
            features = features[
                features.timestamp.dt.date >= payload.review_from
            ].copy()
        if features.empty:
            raise ValueError("No transactions exist on or after review_from")
        probabilities = calibrated_probabilities(
            bundle["model"], bundle["calibrator"], features
        )
        assumptions = CostAssumptions(**bundle["cost_assumptions"])
        queue = allocate_reviews(
            features, probabilities, payload.capacity_per_day, assumptions
        )
    except (ValueError, TypeError, ValidationError, csv.Error) as exc:
        raise HTTPException(422, str(exc)[:600]) from exc
    identifier = str(uuid4())
    days = [str(day.date()) for day in queue.review_day.unique()]
    chosen = queue[queue.selected].copy()
    risk_queue = allocate_reviews(
        features, probabilities, payload.capacity_per_day, assumptions, "risk"
    )
    summary = {
        "id": identifier,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": provenance,
        "dataset_sha256": data_digest,
        "model_sha256": bundle["model_sha256"],
        "policy": policy,
        "history_rows": len(frame),
        "scored_rows": len(features),
        "review_days": len(days),
        "selected_cases": len(chosen),
        "negative_benefit_cases": int(chosen.negative_expected_benefit.sum()),
        "risk_only_expected_net_benefit": float(
            risk_queue.loc[risk_queue.selected, "expected_net_benefit"].sum()
        ),
        "loss_queue_expected_net_benefit": float(chosen.expected_net_benefit.sum()),
        "scope": "Historical shadow review; modeled benefit is not realized savings. Labels were excluded.",
    }
    feature_rows = features.set_index("transaction_id")
    with value.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        if not value.verify(db)["valid"]:
            raise HTTPException(503, "Evidence chain verification failed")
        prior = db.execute(
            "SELECT payload FROM review_batches WHERE fingerprint=?", (fingerprint,)
        ).fetchone()
        if prior:
            return json.loads(prior[0])
        # A historical day is frozen once imported. A second batch cannot silently
        # multiply the enterprise's capacity or reprioritize completed reviews.
        for day in days:
            if db.execute("SELECT 1 FROM review_days WHERE day=?", (day,)).fetchone():
                raise HTTPException(
                    409, f"Review day {day} already belongs to a frozen batch"
                )
        for row in chosen.to_dict(orient="records"):
            feat = feature_rows.loc[row["transaction_id"]]
            case = {
                "id": str(uuid4()),
                "batch_id": identifier,
                "transaction_id": row["transaction_id"],
                "customer_id": str(feat.customer_id),
                "merchant_id": str(feat.merchant_id),
                "timestamp": row["timestamp"].isoformat(),
                "review_day": str(row["review_day"].date()),
                "daily_rank": int(row["daily_rank"]),
                "amount": float(row["amount"]),
                "fraud_probability": float(row["fraud_probability"]),
                "expected_net_benefit": float(row["expected_net_benefit"]),
                "negative_expected_benefit": bool(row["negative_expected_benefit"]),
                "features": {key: float(feat[key]) for key in FEATURE_COLUMNS},
                "model_sha256": bundle["model_sha256"],
                "dataset_sha256": data_digest,
                "policy": policy,
                "status": "OPEN",
                "execution": "NONE_HISTORICAL_REVIEW_ONLY",
                "explanation": "Selected by estimated loss exposure within daily capacity. Feature values describe context, not SHAP attribution or proof of fraud.",
            }
            case["event_hash"] = value.append(
                db, {"type": "REVIEW_CASE_CREATED", "receipt": dict(case)}
            )
            db.execute(
                "INSERT INTO review_cases (id,batch_id,transaction_id,priority,status,receipt) VALUES (?,?,?,?,?,?)",
                (
                    case["id"],
                    identifier,
                    case["transaction_id"],
                    case["expected_net_benefit"],
                    "OPEN",
                    canonical(case),
                ),
            )
        for day in days:
            db.execute("INSERT INTO review_days VALUES (?,?)", (day, identifier))
        summary["event_hash"] = value.append(
            db, {"type": "REVIEW_BATCH_CREATED", "batch": dict(summary)}
        )
        db.execute(
            "INSERT INTO review_batches VALUES (?,?,?)",
            (identifier, fingerprint, canonical(summary)),
        )
    return summary


@router.get("/reviews", include_in_schema=False)
def dashboard():
    return FileResponse(Path(__file__).with_name("reviews.html"))


@router.get("/reviews/info", dependencies=[Depends(operator_access)])
def info(request: Request):
    bundle = model_or_503(request)
    return {
        "model": "hgb_review_v1",
        "model_sha256": bundle["model_sha256"],
        "max_rows": MAX_ROWS,
        "dataset": "MerchantShield synthetic transactions",
        "benchmark": json.loads((MODEL_DIR / "benchmark.json").read_text()),
    }


@router.post("/reviews/batches", dependencies=[Depends(operator_access)])
def import_batch(payload: BatchInput, request: Request):
    return import_transactions(payload, request, "OPERATOR_UPLOADED_UNVERIFIED_HISTORY")


@router.post("/reviews/demo", dependencies=[Depends(operator_access)])
def import_demo(request: Request):
    payload = BatchInput(
        csv_text=(MODEL_DIR / "web_demo_transactions.csv").read_text(),
        capacity_per_day=3,
    )
    return import_transactions(
        payload, request, "MERCHANTSHIELD_SYNTHETIC_FIRST_40_CUSTOMERS"
    )


@router.get("/reviews/batches", dependencies=[Depends(operator_access)])
def batches(request: Request):
    with store(request).connect() as db:
        return [
            json.loads(row[0])
            for row in db.execute(
                "SELECT payload FROM review_batches ORDER BY rowid DESC LIMIT 50"
            )
        ]


@router.get(
    "/reviews/batches/{batch_id}/cases", dependencies=[Depends(operator_access)]
)
def cases(
    batch_id: str,
    request: Request,
    status: Literal["OPEN", "CLOSED", "ALL"] = "OPEN",
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
):
    with store(request).connect() as db:
        if not db.execute(
            "SELECT 1 FROM review_batches WHERE id=?", (batch_id,)
        ).fetchone():
            raise HTTPException(404, "Batch not found")
        total = db.execute(
            "SELECT COUNT(*) FROM review_cases WHERE batch_id=? AND (?='ALL' OR status=?)",
            (batch_id, status, status),
        ).fetchone()[0]
        rows = db.execute(
            "SELECT * FROM review_cases WHERE batch_id=? AND (?='ALL' OR status=?) ORDER BY priority DESC, id LIMIT ? OFFSET ?",
            (batch_id, status, status, limit, offset),
        )
        return {
            "items": [verified_case(db, row) for row in rows],
            "total": total,
            "offset": offset,
            "limit": limit,
        }


@router.get("/reviews/cases/{case_id}", dependencies=[Depends(operator_access)])
def case_detail(case_id: str, request: Request):
    with store(request).connect() as db:
        row = db.execute("SELECT * FROM review_cases WHERE id=?", (case_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Case not found")
        return verified_case(db, row)


@router.post("/reviews/cases/{case_id}", dependencies=[Depends(operator_access)])
def resolve_case(case_id: str, payload: CaseResolution, request: Request):
    value = store(request)
    with value.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        if not value.verify(db)["valid"]:
            raise HTTPException(503, "Evidence chain verification failed")
        row = db.execute("SELECT * FROM review_cases WHERE id=?", (case_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Case not found")
        receipt = verified_case(db, row)
        if row["status"] != "OPEN":
            raise HTTPException(409, "Case is already resolved")
        receipt.update(
            status="CLOSED",
            outcome=payload.outcome,
            reviewer=payload.reviewer,
            review_note=payload.note,
            reviewed_at=datetime.now(timezone.utc).isoformat(),
            label_provenance="HUMAN_DISPOSITION_UNVERIFIED_NOT_TRAINING_LABEL",
        )
        receipt.pop("event_hash", None)
        receipt["event_hash"] = value.append(
            db, {"type": "REVIEW_CASE_RESOLVED", "receipt": dict(receipt)}
        )
        db.execute(
            "UPDATE review_cases SET status='CLOSED', receipt=? WHERE id=?",
            (canonical(receipt), case_id),
        )
        return receipt


@router.get(
    "/reviews/batches/{batch_id}/export", dependencies=[Depends(operator_access)]
)
def export_batch(batch_id: str, request: Request):
    value = store(request)
    with value.connect() as db:
        batch = db.execute(
            "SELECT payload FROM review_batches WHERE id=?", (batch_id,)
        ).fetchone()
        if batch is None:
            raise HTTPException(404, "Batch not found")
        return {
            "batch": json.loads(batch[0]),
            "evidence": value.verify(db),
            "cases": [
                verified_case(db, row)
                for row in db.execute(
                    "SELECT * FROM review_cases WHERE batch_id=? ORDER BY priority DESC",
                    (batch_id,),
                )
            ],
        }
