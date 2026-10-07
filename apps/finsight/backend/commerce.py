"""Local commerce decision demo: bounded authority + existing fraud scoring.

No payment execution. SQLite serializes reservations and approval transitions.
Praman-inspired SKU-only intents; independent Python implementation.
"""

import hashlib
import hmac
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.schemas.transaction import RiskRequest
from backend.services import risk_service

router = APIRouter()
CATALOG = {
    "LUNCH": {"merchant_id": "MERCH_001", "category": "food", "price_paise": 25000},
    "OFFICE": {"merchant_id": "MERCH_001", "category": "office", "price_paise": 120000},
}


def canonical(value: dict) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def authorize(operator: bool, supplied: str | None) -> None:
    names = (
        ["COMMERCE_OPERATOR_TOKEN"]
        if operator
        else ["COMMERCE_OPERATOR_TOKEN", "COMMERCE_AGENT_TOKEN"]
    )
    tokens = [os.environ.get(name, "") for name in names]
    if not any(tokens):
        raise HTTPException(503, "Commerce access token is not configured.")
    if not supplied or not any(
        token and hmac.compare_digest(supplied, token) for token in tokens
    ):
        raise HTTPException(401, "Invalid commerce access token.")


def operator_access(x_commerce_token: str | None = Header(default=None)) -> None:
    authorize(True, x_commerce_token)


def agent_access(x_commerce_token: str | None = Header(default=None)) -> None:
    authorize(False, x_commerce_token)


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Mandate(StrictInput):
    customer_id: str = Field(min_length=1, max_length=64, pattern=r"\S")
    merchant_ids: list[str] = Field(min_length=1, max_length=20)
    categories: list[str] = Field(min_length=1, max_length=20)
    max_per_txn_paise: int = Field(gt=0, le=1_000_000_000, strict=True)
    max_total_paise: int = Field(gt=0, le=1_000_000_000, strict=True)
    approval_threshold_paise: int = Field(gt=0, strict=True)
    expires_at: datetime

    @model_validator(mode="after")
    def validate_expiry(self):
        if self.expires_at.tzinfo is None:
            raise ValueError("expires_at must include a timezone")
        if any(not item.strip() for item in self.merchant_ids + self.categories):
            raise ValueError("Scope values must not be blank")
        return self


class LineItem(StrictInput):
    sku: str = Field(min_length=1, max_length=64)
    qty: int = Field(gt=0, le=1000, strict=True)


class Intent(StrictInput):
    idempotency_key: str = Field(min_length=1, max_length=128, pattern=r"\S")
    mandate_id: str = Field(min_length=1, max_length=64)
    merchant_id: str = Field(min_length=1, max_length=64)
    line_items: list[LineItem] = Field(min_length=1, max_length=20)
    risk_context: RiskRequest


class Resolution(StrictInput):
    action: Literal["approve", "reject"]
    note: str = Field(min_length=1, max_length=500, pattern=r"\S")


class CommerceStore:
    def __init__(self, path: str):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS mandates (id TEXT PRIMARY KEY, payload TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
                CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL,
                    mandate_id TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL, receipt TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY, payload TEXT NOT NULL, prev_hash TEXT NOT NULL, hash TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS transaction_keys (transaction_id TEXT PRIMARY KEY, order_id TEXT NOT NULL);
                CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT, 'append only'); END;
                CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT, 'append only'); END;
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def append(self, db, payload: dict) -> str:
        last = db.execute(
            "SELECT hash FROM events ORDER BY seq DESC LIMIT 1"
        ).fetchone()
        prev = last[0] if last else "0" * 64
        data = canonical(payload)
        digest = hashlib.sha256((prev + data).encode()).hexdigest()
        db.execute(
            "INSERT INTO events(payload, prev_hash, hash) VALUES (?, ?, ?)",
            (data, prev, digest),
        )
        return digest

    def verify(self, db) -> dict:
        prev = "0" * 64
        count = 0
        for row in db.execute("SELECT * FROM events ORDER BY seq"):
            digest = hashlib.sha256((prev + row["payload"]).encode()).hexdigest()
            if (
                row["prev_hash"] != prev
                or row["hash"] != digest
                or row["seq"] != count + 1
            ):
                return {"valid": False, "first_bad_event": row["seq"]}
            prev = digest
            count += 1
        return {"valid": True, "events": count, "head_hash": prev}

    def mandate(self, db, mandate_id: str) -> tuple[Mandate, bool]:
        row = db.execute("SELECT * FROM mandates WHERE id=?", (mandate_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Mandate not found")
        return Mandate.model_validate_json(row["payload"]), bool(row["revoked"])

    def gate(self, db, mandate_id: str, amount: int, now: datetime) -> str | None:
        mandate, revoked = self.mandate(db, mandate_id)
        if revoked:
            return "MANDATE_REVOKED"
        if now >= mandate.expires_at:
            return "MANDATE_EXPIRED"
        if amount > mandate.max_per_txn_paise:
            return "TRANSACTION_LIMIT"
        reserved = db.execute(
            "SELECT COALESCE(SUM(amount),0) FROM orders WHERE mandate_id=? AND status IN ('AUTHORIZED','PENDING_REVIEW')",
            (mandate_id,),
        ).fetchone()[0]
        if reserved + amount > mandate.max_total_paise:
            return "BUDGET_EXHAUSTED"
        return None


def store(request: Request) -> CommerceStore:
    value = getattr(request.app.state, "commerce_store", None)
    if value is None:
        raise HTTPException(503, "Commerce store unavailable")
    return value


@router.get("/commerce", include_in_schema=False)
def dashboard():
    return FileResponse(Path(__file__).with_name("commerce.html"))


@router.get("/commerce/catalog", dependencies=[Depends(agent_access)])
def catalog():
    return CATALOG


@router.post("/commerce/mandates", dependencies=[Depends(operator_access)])
def create_mandate(payload: Mandate, request: Request):
    now = datetime.now(timezone.utc)
    if payload.expires_at <= now:
        raise HTTPException(422, "Mandate must expire in the future")
    value = store(request)
    identifier = str(uuid4())
    with value.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute(
            "INSERT INTO mandates(id,payload) VALUES (?,?)",
            (identifier, payload.model_dump_json()),
        )
        head = value.append(
            db,
            {
                "type": "MANDATE_CREATED",
                "id": identifier,
                "mandate": payload.model_dump(mode="json"),
                "timestamp": now.isoformat(),
            },
        )
    return {"mandate_id": identifier, "head_hash": head}


@router.post(
    "/commerce/mandates/{mandate_id}/revoke", dependencies=[Depends(operator_access)]
)
def revoke(mandate_id: str, request: Request):
    value = store(request)
    with value.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        value.mandate(db, mandate_id)
        db.execute("UPDATE mandates SET revoked=1 WHERE id=?", (mandate_id,))
        head = value.append(
            db,
            {
                "type": "MANDATE_REVOKED",
                "id": mandate_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
    return {"revoked": True, "head_hash": head}


@router.post("/commerce/intents", dependencies=[Depends(agent_access)])
def evaluate(
    payload: Intent,
    request: Request,
    x_commerce_token: str | None = Header(default=None),
):
    value = store(request)
    fingerprint = hashlib.sha256(
        canonical(payload.model_dump(mode="json")).encode()
    ).hexdigest()
    with value.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        if not value.verify(db)["valid"]:
            raise HTTPException(503, "Evidence chain verification failed")
        prior = db.execute(
            "SELECT * FROM orders WHERE key=?", (payload.idempotency_key,)
        ).fetchone()
        if prior:
            if prior["fingerprint"] != fingerprint:
                raise HTTPException(
                    409, "Idempotency key reused with different content"
                )
            return json.loads(prior["receipt"])
        mandate, _ = value.mandate(db, payload.mandate_id)
        txn = payload.risk_context.transaction
        if db.execute(
            "SELECT 1 FROM transaction_keys WHERE transaction_id=?",
            (txn.transaction_id,),
        ).fetchone():
            raise HTTPException(
                409, "Transaction already evaluated with another idempotency key"
            )
        if (
            txn.customer_id != mandate.customer_id
            or txn.merchant_id != payload.merchant_id
        ):
            raise HTTPException(
                422, "Transaction context does not match mandate subject/merchant"
            )
        amount = 0
        reason = None
        categories = set()
        for line in payload.line_items:
            item = CATALOG.get(line.sku)
            if item is None or item["merchant_id"] != payload.merchant_id:
                reason = "SKU_OR_MERCHANT_UNKNOWN"
                break
            categories.add(item["category"])
            amount += item["price_paise"] * line.qty
        now = datetime.now(timezone.utc)
        if payload.merchant_id not in mandate.merchant_ids:
            reason = "MERCHANT_OUT_OF_SCOPE"
        elif not categories.issubset(mandate.categories):
            reason = "CATEGORY_OUT_OF_SCOPE"
        reason = reason or value.gate(db, payload.mandate_id, amount, now)
        risk = None
        status = "DENIED"
        if reason is None:
            if (
                len(categories) != 1
                or txn.merchant_category not in categories
                or round(txn.amount * 100) != amount
            ):
                raise HTTPException(
                    422, "Risk context amount/category must match server catalog total"
                )
            bundle = getattr(request.app.state, "model_bundle", None)
            if bundle is None:
                raise HTTPException(
                    503, "Model unavailable; intent cannot be authorized"
                )
            try:
                decision, explanation, _, count, explanation_error = (
                    risk_service.evaluate_full(bundle, payload.risk_context)
                )
            except (
                risk_service.FeatureGenerationError,
                risk_service.ModelOutputError,
            ) as exc:
                raise HTTPException(422, str(exc)) from exc
            risk = {
                "context_provenance": "CALLER_SUPPLIED_UNVERIFIED",
                "probability": decision.fraud_probability,
                "model_version": decision.model_version,
                "action": decision.action,
                "signal_quality": risk_service._calculate_signal_quality(count),
                "reasons": explanation.get("reasons", [])
                if explanation and not explanation_error
                else [],
                "explanation_available": bool(explanation and not explanation_error),
            }
            if decision.action == "BLOCK":
                reason = "FRAUD_POLICY_BLOCK"
            elif (
                not hmac.compare_digest(
                    x_commerce_token or "",
                    os.environ.get("COMMERCE_OPERATOR_TOKEN", ""),
                )
                or count < 5
                or decision.action == "STEP_UP_VERIFICATION"
                or amount >= mandate.approval_threshold_paise
            ):
                status, reason = "PENDING_REVIEW", "HUMAN_REVIEW_REQUIRED"
            else:
                status, reason = "AUTHORIZED", "WITHIN_AUTHORITY_AND_RISK_POLICY"
        receipt = {
            "id": str(uuid4()),
            "mandate_id": payload.mandate_id,
            "status": status,
            "reason_code": reason,
            "amount_paise": amount,
            "risk": risk,
            "timestamp": now.isoformat(),
            "execution": "NONE_DECISION_ONLY",
            "intent_digest": fingerprint,
        }
        receipt["event_hash"] = value.append(
            db, {"type": "INTENT_DECIDED", "receipt": dict(receipt)}
        )
        db.execute(
            "INSERT INTO orders VALUES (?,?,?,?,?,?,?)",
            (
                receipt["id"],
                payload.idempotency_key,
                fingerprint,
                payload.mandate_id,
                amount,
                status,
                canonical(receipt),
            ),
        )
        db.execute(
            "INSERT INTO transaction_keys VALUES (?,?)",
            (txn.transaction_id, receipt["id"]),
        )
    return receipt


@router.post("/commerce/reviews/{order_id}", dependencies=[Depends(operator_access)])
def resolve(order_id: str, payload: Resolution, request: Request):
    value = store(request)
    with value.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        if not value.verify(db)["valid"]:
            raise HTTPException(503, "Evidence chain verification failed")
        row = db.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Review not found")
        if row["status"] != "PENDING_REVIEW":
            raise HTTPException(409, "Review already resolved or not required")
        receipt = json.loads(row["receipt"])
        now = datetime.now(timezone.utc)
        # Release this reservation within the same transaction before rechecking.
        db.execute("UPDATE orders SET status='REJECTED' WHERE id=?", (order_id,))
        reason = (
            value.gate(db, row["mandate_id"], row["amount"], now)
            if payload.action == "approve"
            else "HUMAN_REJECTED"
        )
        receipt.update(
            status="DENIED" if reason else "AUTHORIZED",
            reason_code=reason or "HUMAN_APPROVED",
            reviewed_at=now.isoformat(),
            review_note=payload.note,
        )
        receipt["event_hash"] = value.append(
            db, {"type": "REVIEW_RESOLVED", "receipt": dict(receipt)}
        )
        db.execute(
            "UPDATE orders SET status=?,receipt=? WHERE id=?",
            (receipt["status"], canonical(receipt), order_id),
        )
    return receipt


@router.get("/commerce/receipts", dependencies=[Depends(operator_access)])
def receipts(request: Request):
    with store(request).connect() as db:
        return [
            json.loads(row[0])
            for row in db.execute(
                "SELECT receipt FROM orders ORDER BY rowid DESC LIMIT 100"
            )
        ]


@router.get("/commerce/evidence", dependencies=[Depends(operator_access)])
def evidence(request: Request, expected_head: str | None = None):
    value = store(request)
    with value.connect() as db:
        result = value.verify(db)
        if expected_head is not None:
            result["checkpoint_matches"] = result.get("head_hash") == expected_head
        result["entries"] = [
            dict(row) for row in db.execute("SELECT * FROM events ORDER BY seq")
        ]
    return result
