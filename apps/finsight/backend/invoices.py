"""AP cascade; pure analysis plus evidence persistence in the existing audit DB."""

import csv
import hashlib
import io
import math
import re
import statistics
import unicodedata
from datetime import date
from difflib import SequenceMatcher
from typing import Literal

import numpy as np
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer

from backend.invoice_priority import ReviewPolicy, allocate, priority_evidence

router = APIRouter(prefix="/ap", tags=["accounts-payable"])


def normalize(value: str) -> str:
    return re.sub(r"[\W_]+", "", unicodedata.normalize("NFKC", value).casefold())


class Invoice(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)

    id: str = Field(min_length=1, max_length=64)
    invoice_number: str = Field(min_length=1, max_length=100)
    supplier: str = Field(min_length=1, max_length=160)
    supplier_id: str | None = Field(default=None, min_length=1, max_length=100)
    department: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0, le=100_000_000)
    currency: Literal["INR", "USD", "EUR", "ZAR"] = "INR"
    date: date
    description: str = Field(min_length=1, max_length=1000)
    po_number: str = Field(default="", max_length=100)
    tax_id: str = Field(default="", max_length=100)

    @field_validator("id", "invoice_number", "supplier", "department", "description", "supplier_id")
    @classmethod
    def nonblank(cls, value):
        if value is not None and not normalize(value):
            raise ValueError("must contain letters or numbers")
        return value

    @field_validator("amount", mode="before")
    @classmethod
    def amount_not_boolean(cls, value):
        if isinstance(value, bool):
            raise ValueError("amount must be numeric, not boolean")  # noqa: TRY004 -- Pydantic validation
        return value


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    invoices: list[Invoice] = Field(min_length=1, max_length=500)
    history: list[Invoice] = Field(default_factory=list, max_length=2000)
    department_limits: dict[str, float] = Field(default_factory=dict, max_length=100)
    watchlist_tax_ids: list[str] = Field(default_factory=list, max_length=1000)
    review_policy: ReviewPolicy = Field(default_factory=ReviewPolicy)
    window_id: str = Field(default="default", min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")

    @model_validator(mode="after")
    def validate_context(self):
        ids = [item.id for item in self.invoices + self.history]
        if len(ids) != len(set(ids)):
            raise ValueError("internal invoice IDs must be unique across invoices and history")
        if any(not key.strip() or not math.isfinite(value) or value <= 0
               for key, value in self.department_limits.items()):
            raise ValueError("department limits must have nonblank names and finite positive amounts")
        return self


def same_supplier(a: Invoice, b: Invoice) -> bool:
    if a.supplier_id and b.supplier_id:
        return a.supplier_id == b.supplier_id
    return SequenceMatcher(None, normalize(a.supplier), normalize(b.supplier)).ratio() >= 0.88


def description_similarity(a: str, b: str) -> float:
    if normalize(a) == normalize(b):
        return 1.0
    try:
        vectors = TfidfVectorizer(strip_accents="unicode", ngram_range=(1, 2)).fit_transform([a, b])
        return float((vectors[0] @ vectors[1].T).toarray()[0, 0])
    except ValueError:  # Single-character-only descriptions have no TF-IDF vocabulary.
        return SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def match_invoice(invoice: Invoice, candidates: list[Invoice]) -> dict | None:
    """Block by supplier, currency, date and amount before expensive text comparison."""
    best = None
    for other in candidates:
        if (other.date > invoice.date or other.currency != invoice.currency
                or not same_supplier(invoice, other)):
            continue
        days = (invoice.date - other.date).days
        amount_gap = abs(invoice.amount - other.amount) / max(invoice.amount, other.amount)
        number = SequenceMatcher(None, normalize(invoice.invoice_number), normalize(other.invoice_number)).ratio()
        exact_number = normalize(invoice.invoice_number) == normalize(other.invoice_number)
        # A repeated supplier invoice number is worth checking even if the amount changed.
        if not exact_number and (days > 14 or amount_gap > 0.02):
            continue
        description = description_similarity(invoice.description, other.description)
        exact = exact_number and abs(invoice.amount - other.amount) < 0.005
        similarity = 0.35 * number + 0.35 * description + 0.2 * (1 - amount_gap) + 0.1 * max(0, 1 - days / 14)
        if not (exact_number or (similarity >= 0.78 and description >= 0.55 and number >= 0.65)):
            continue
        result = {
            "kind": "EXACT_DUPLICATE" if exact else "NEAR_DUPLICATE",
            "similarity": round(similarity, 4),
            "matched_invoice": other.model_dump(mode="json"),
            "components": {"invoice_number": round(number, 4), "description_tfidf": round(description, 4),
                           "amount_difference_pct": round(amount_gap * 100, 3), "date_gap_days": days},
            "reason": "Supplier and normalized invoice number repeat." if exact_number
                      else "Supplier, amount, invoice number and description are similar within 14 days.",
        }
        rank = (exact, exact_number, similarity)
        if best is None or rank > best[0]:
            best = (rank, result)
    return best[1] if best else None


def anomaly_evidence(invoice: Invoice, history: list[Invoice], run_model: bool = True) -> dict:
    prior = [row.amount for row in history if row.date < invoice.date
             and row.currency == invoice.currency and same_supplier(invoice, row)]
    result = {"prior_count": len(prior), "method": "insufficient_history", "score": 0,
              "median_amount": None, "amount_ratio": None, "isolation_outlier": None}
    if len(prior) < 5:
        return result
    median = statistics.median(prior)
    mad = statistics.median(abs(value - median) for value in prior)
    # A floor avoids treating tiny variations in a constant history as extreme.
    robust_z = abs(invoice.amount - median) / max(1.4826 * mad, median * 0.1, 1)
    score = min(75, round(max(0, robust_z - 3) * 12))
    result.update(method="historical_median_mad", median_amount=round(median, 2),
                  amount_ratio=round(invoice.amount / median, 3), robust_z=round(robust_z, 3), score=score)
    if run_model and len(prior) >= 20:
        detector = IsolationForest(n_estimators=50, random_state=42, contamination="auto", n_jobs=1)
        detector.fit(np.log1p(prior).reshape(-1, 1))
        value = [[math.log1p(invoice.amount)]]
        result.update(method="historical_median_mad+isolation_forest",
                      isolation_outlier=bool(detector.predict(value)[0] == -1),
                      isolation_decision=round(float(detector.decision_function(value)[0]), 4))
    return result


def recurring_description_evidence(invoice: Invoice, history: list[Invoice]) -> dict:
    best = {"similarity": 0.0, "reference_id": None, "threshold": 0.7}
    seen = set()
    for row in history:
        if row.date >= invoice.date or row.currency != invoice.currency or not same_supplier(invoice, row):
            continue
        description = normalize(row.description)
        if description in seen:
            continue
        seen.add(description)
        similarity = description_similarity(invoice.description, row.description)
        if similarity > best["similarity"]:
            best.update(similarity=round(similarity, 4), reference_id=row.id)
        if similarity == 1:
            break
    return best


def analyze(payload: AnalysisRequest) -> dict:
    results = []
    candidates = list(payload.history)
    watchlist = {normalize(value) for value in payload.watchlist_tax_ids if normalize(value)}
    for invoice in sorted(payload.invoices, key=lambda row: row.date):
        signals = []
        if not invoice.po_number.strip():
            signals.append({"code": "MISSING_PO", "severity": "MEDIUM", "score": 45,
                            "reason": "No purchase order reference was supplied."})
        if not invoice.tax_id.strip():
            signals.append({"code": "MISSING_TAX_ID", "severity": "MEDIUM", "score": 45,
                            "reason": "No supplier tax identifier was supplied."})
        if normalize(invoice.tax_id) in watchlist:
            signals.append({"code": "WATCHLIST_MATCH", "severity": "CRITICAL", "score": 100,
                            "reason": "Tax ID matches the watchlist supplied by the caller; verify the source."})
        limit = payload.department_limits.get(invoice.department)
        if limit and invoice.currency == "INR" and invoice.amount > limit:
            signals.append({"code": "DEPARTMENT_LIMIT", "severity": "HIGH", "score": 80,
                            "reason": f"Amount {invoice.amount:,.2f} INR exceeds {invoice.department} limit {limit:,.2f} INR."})
        match = match_invoice(invoice, candidates)
        if match:
            signals.append({"code": match["kind"], "severity": "HIGH", "score": 90,
                            "reason": f"Potential duplicate of {match['matched_invoice']['invoice_number']}. {match['reason']}"})
        # Cheap matching/rules/baseline first. Only unresolved cases fit the ML model.
        anomaly = anomaly_evidence(invoice, candidates, run_model=False)
        recurring = recurring_description_evidence(invoice, candidates) if not signals else None
        if signals:
            route, route_reason = "RULE_FLAGGED", "Rule or duplicate evidence already identifies an exception; ML skipped."
        elif anomaly["prior_count"] >= 5 and anomaly.get("robust_z", 0) <= 3 and recurring["similarity"] >= recurring["threshold"]:
            route, route_reason = "BASELINE_CLEAR", "No rule/duplicate finding; stable amount and description similar to strictly earlier supplier history."
        else:
            route, route_reason = "ML_REQUIRED", "Insufficient baseline or atypical amount requires the second-stage check."
            anomaly = anomaly_evidence(invoice, candidates, run_model=True)
            if anomaly["prior_count"] < 20:
                signals.append({"code": "INSUFFICIENT_HISTORY", "severity": "MEDIUM", "score": 35,
                                "reason": "Fewer than 20 strictly earlier supplier records; Isolation Forest could not run. Obtain history; do not treat as verified."})
        if anomaly["score"] >= 40:
            signals.append({"code": "AMOUNT_ANOMALY", "severity": "HIGH", "score": anomaly["score"],
                            "reason": f"Amount is {anomaly['amount_ratio']:.2f} times the strictly earlier supplier median."})
        elif anomaly["isolation_outlier"]:
            signals.append({"code": "ML_AMOUNT_OUTLIER", "severity": "HIGH", "score": 65,
                            "reason": "Second-stage Isolation Forest classifies the amount as atypical against strictly earlier supplier records."})
        score = max((item["score"] for item in signals), default=anomaly["score"])
        severity = "CRITICAL" if score >= 95 else "HIGH" if score >= 65 else "MEDIUM" if score >= 35 else "LOW"
        results.append({"invoice": invoice.model_dump(mode="json"), "signals": signals,
                        "match": match, "anomaly": anomaly, "risk_score": score, "severity": severity,
                        "status": "FLAGGED" if signals else "CLEARED",
                        "review_required": bool(signals), "score_type": "triage_score_not_probability",
                        "pipeline": {"route": route, "reason": route_reason,
                                     "recurring_description": recurring,
                                     "ml_executed": anomaly["isolation_outlier"] is not None},
                        "audit": {"policy_version": "ap-cascade-v2", "checks": ["schema", "rules", "exact_fuzzy_match", "prior_amount_baseline"],
                                  "findings": [signal["reason"] for signal in signals],
                                  "conclusion": "Potential exception; requires verification." if signals else "No configured exception found; not proof of legitimacy."}})
        results[-1]["priority"] = priority_evidence(results[-1], payload.review_policy)
        candidates.append(invoice)
    queue = allocate(results, payload.review_policy)
    routed = sum(row["pipeline"]["route"] == "ML_REQUIRED" for row in results)
    return {"items": results, "queue": queue, "window_id": payload.window_id,
            "cascade": {"total": len(results), "rule_flagged": sum(row["pipeline"]["route"] == "RULE_FLAGGED" for row in results),
                        "baseline_clear": sum(row["pipeline"]["route"] == "BASELINE_CLEAR" for row in results),
                        "ml_routed": routed, "ml_executed": sum(row["pipeline"]["ml_executed"] for row in results),
                        "ml_fraction": routed / len(results), "target_ml_fraction": 0.3,
                        "target_note": "Measured target, not a forced quota. Unresolved cases are never discarded to meet 30%."},
            "summary": {"invoices": len(results),
            "flagged": sum(item["review_required"] for item in results),
            "duplicates": sum(item["match"] is not None for item in results),
            "critical": sum(item["severity"] == "CRITICAL" for item in results)},
            "methodology": "Rules/fuzzy matching → robust baseline gate → unresolved ML → exposure/cost priority. All findings retained.",
            "model_scope": "Invoice triage is separate from MerchantShield's trained transaction HGB/LightGBM models."}


@router.post("/analyze")
def analyze_invoices(payload: AnalysisRequest, request: Request):
    return persist_analysis(payload, analyze(payload), request)


def persist_analysis(payload: AnalysisRequest, result: dict, request: Request) -> dict:
    store = getattr(request.app.state, "invoice_audit_store", None)
    if store is None:
        # Pure router is also usable in unit tests; a real application must initialize the store.
        result.update(audit_persisted=False, audit_warning="Invoice audit database unavailable; this result is not saved.")
        return result
    try:
        return store.record(payload, result)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not save complete invoice evidence; retry after restoring the audit database.") from exc


@router.get("/audit")
def invoice_audit(request: Request, window_id: str = Query(default="default", pattern=r"^[a-zA-Z0-9_-]{1,64}$"),
                  limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0),
                  tier: Literal["ALL", "REVIEW_NOW", "MONITOR", "DEFERRED", "NO_REVIEW", "ALLOCATED"] = "ALL"):
    store = getattr(request.app.state, "invoice_audit_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="Invoice audit database unavailable.")
    return store.get_recent(window_id, limit, offset, tier)


@router.post("/windows/{window_id}/finalize")
def finalize_window(window_id: str, request: Request):
    store = getattr(request.app.state, "invoice_audit_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="Invoice audit database unavailable.")
    try:
        return store.finalize(window_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/dataset")
def invoice_dataset(request: Request, window_id: str | None = Query(default=None, pattern=r"^[a-zA-Z0-9_-]{1,64}$"),
                    limit: int = Query(default=200, ge=1, le=500), offset: int = Query(default=0, ge=0)):
    store = getattr(request.app.state, "invoice_audit_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="Invoice audit database unavailable.")
    return store.dataset(window_id, offset, limit)


@router.get("/sample")
def invoice_sample(offset: int = Query(default=0, ge=0, le=4999), limit: int = Query(default=500, ge=1, le=500)):
    """Reproducible synthetic invoices; no fraud labels or benchmark accuracy claims."""
    rows, history = [], []
    for supplier in range(20):
        base = {"supplier": f"Test Supplier {supplier + 1:02d}", "supplier_id": f"sample-supplier-{supplier}",
                "department": ["Operations", "IT & Cloud", "Manufacturing", "Supply Chain"][supplier % 4],
                "currency": "INR", "description": "Monthly contracted maintenance services",
                "po_number": f"PO-SAMPLE-{supplier}", "tax_id": f"TEST-TAX-{supplier}"}
        for day in range(1, 21):
            history.append({**base, "id": f"sample-history-{supplier}-{day}", "invoice_number": f"SETTLED-{supplier}-{day}",
                            "date": f"2026-09-{day:02d}", "amount": (10000 + supplier * 1000) * (0.96 + day % 5 * .02)})
    for index in range(offset, min(5000, offset + limit)):
        supplier = index % 20
        base = history[supplier * 20]
        rows.append({**base, "id": f"sample-{index:05d}",
                     "invoice_number": hashlib.blake2s(f"invoice-{index}".encode(), digest_size=10).hexdigest(),
                     "date": "2026-10-03", "amount": (10000 + supplier * 1000) * (8 if index % 10 == 9 else 1),
                     "po_number": "" if index % 50 == 0 else base["po_number"]})
    return {"invoices": rows, "history": history, "window_id": "synthetic-5000-v1"}


class CsvImport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    csv_text: str = Field(min_length=1, max_length=20_000_000)


@router.post("/import")
def import_csv(payload: CsvImport, request: Request):
    try:
        reader = csv.DictReader(io.StringIO(payload.csv_text.lstrip("\ufeff")), strict=True)
        fields = reader.fieldnames or []
        if len(fields) != len(set(fields)) or set(fields) - Invoice.model_fields.keys():
            raise ValueError("CSV contains duplicate or unknown columns")
        rows = []
        for row in reader:
            if len(rows) >= 5000:
                raise ValueError("CSV import is limited to 5,000 invoices; use multiple files in the same window for more")
            if None in row or any(value is None for value in row.values()):
                raise ValueError("CSV row width does not match its header")
            rows.append(Invoice.model_validate({key: value for key, value in row.items()
                                               if value != "" or key in {"po_number", "tax_id"}}))
        if not rows:
            raise ValueError("CSV contains no invoices")
        if len({row.id for row in rows}) != len(rows):
            raise ValueError("CSV invoice IDs must be unique")
        rows.sort(key=lambda row: row.date)
        combined = []
        for offset in range(0, len(rows), 500):
            analysis_input = AnalysisRequest(invoices=rows[offset:offset + 500], history=rows[max(0, offset - 2000):offset])
            result = persist_analysis(analysis_input, analyze(analysis_input), request)
            combined.extend(result["items"])
        store = getattr(request.app.state, "invoice_audit_store", None)
        if store is not None:
            result = store.dataset("default")
        elif len(rows) > 500:
            result["items"] = combined
            result["queue"] = allocate(combined, analysis_input.review_policy)
            result["summary"] = {"invoices": len(combined), "flagged": sum(row["review_required"] for row in combined),
                                 "duplicates": sum(row["match"] is not None for row in combined),
                                 "critical": sum(row["severity"] == "CRITICAL" for row in combined)}
        return {"input": {"invoices": [row.model_dump(mode="json") for row in rows], "window_id": "default"}, "analysis": result}
    except (ValueError, csv.Error, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=f"Invalid invoice CSV: {exc}") from exc


@router.get("/demo")
def demo_invoices():
    """Fictional invoice fixtures, deliberately distinct from the MerchantShield dataset."""
    suppliers = [("zenith", "Zenith Global Logistics Ltd", "Supply Chain", 845000),
                 ("acme", "Acme Cyber Solutions", "IT & Cloud", 1420000),
                 ("delta", "Delta Industrial Supplies", "Manufacturing", 320000),
                 ("azure", "Azure Cloud Reseller India", "IT & Cloud", 28500),
                 ("nexus", "Nexus Creative & Media Agency", "Marketing", 4950000),
                 ("apex", "Apex Facilities & Workplace Mgmt", "Operations", 185000)]
    invoices, history = [], []
    for index, (sid, supplier, department, amount) in enumerate(suppliers):
        item = {"id": f"demo-{index}", "invoice_number": f"INV-2026-{8801 + index}",
                "supplier_id": sid, "supplier": supplier, "department": department, "amount": amount,
                "date": "2026-10-03", "description": "Monthly contracted services and delivery",
                "po_number": f"PO-{2020 + index}", "tax_id": f"DEMO-TAX-{index}", "currency": "INR"}
        if sid == "zenith":
            item["description"] = "Freight delivery and handling surcharge"
        if sid == "delta":
            item["description"] = "Industrial steel supplies warehouse delivery"
            history.append({**item, "id": "delta-reference", "invoice_number": "INV-2026-8803A",
                            "date": "2026-10-01", "amount": 319500})
        if sid == "azure":
            item["tax_id"] = ""
        invoices.append(item)
        for day in range(1, 26):
            history.append({**item, "id": f"history-{sid}-{day}", "invoice_number": f"PAID-{sid}-{day}",
                            "date": f"2026-09-{day:02d}", "amount": (amount / 8 if sid == "zenith" else amount) * (0.96 + day % 5 * .02)})
    return {"invoices": invoices, "history": history,
            "department_limits": {"Marketing": 2500000}, "watchlist_tax_ids": ["DEMO-TAX-1"],
            "provenance": "Fictional AP demonstration; not MerchantShield training or benchmark data."}
