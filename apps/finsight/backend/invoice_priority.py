"""Explicit invoice review policy. Signal strength is not a fraud probability."""

import math

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ReviewPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    reviews_per_million: int = Field(default=100, ge=0, le=10000, strict=True)
    monitors_per_million: int = Field(default=100, ge=0, le=10000, strict=True)
    review_cost_inr: float = Field(default=100, gt=0)
    recovery_fraction: float = Field(default=0.5, ge=0, le=1)
    currency_to_inr: dict[str, float] = Field(default_factory=lambda: {"INR": 1.0})

    @field_validator("currency_to_inr")
    @classmethod
    def valid_rates(cls, rates):
        if any(key not in {"INR", "USD", "EUR", "ZAR"} or not math.isfinite(value) or value <= 0
               for key, value in rates.items()):
            raise ValueError("Supply finite positive INR conversion rates for supported currencies")
        return rates


def capacities(population: int, policy: ReviewPolicy) -> tuple[int, int]:
    # Round upward for tiny demos; aggregate the population before applying this.
    return (math.ceil(population * policy.reviews_per_million / 1_000_000),
            math.ceil(population * policy.monitors_per_million / 1_000_000))


def priority_evidence(item: dict, policy: ReviewPolicy) -> dict:
    invoice = item["invoice"]
    rate = policy.currency_to_inr.get(invoice["currency"])
    exposure = invoice["amount"] * rate if rate is not None else None
    strength = item["risk_score"] / 100
    priority = exposure * strength * policy.recovery_fraction / policy.review_cost_inr if exposure is not None else None
    return {"index": round(priority, 6) if priority is not None else None,
            "formula": "amount_inr × signal_strength × recovery_fraction / review_cost_inr",
            "amount_inr": exposure, "signal_strength": strength,
            "recovery_fraction": policy.recovery_fraction, "review_cost_inr": policy.review_cost_inr,
            "currency_rate": rate, "critical_first": item["severity"] == "CRITICAL",
            "warning": "Missing caller-supplied currency rate; monetary priority unavailable." if rate is None else None,
            "interpretation": "Exposure-weighted triage index, not expected loss or calibrated fraud probability."}


def allocate(items: list[dict], policy: ReviewPolicy) -> dict:
    review_capacity, monitor_capacity = capacities(len(items), policy)
    flagged = [item for item in items if item["review_required"]]
    ranked = sorted(flagged, key=lambda row: (-int(row["severity"] == "CRITICAL"),
                    -(row["priority"]["index"] or 0), -row["risk_score"], row["invoice"]["id"]))
    review_ids = {row["invoice"]["id"] for row in ranked[:review_capacity]}
    remaining = [row for row in ranked if row["invoice"]["id"] not in review_ids]
    # Medium cases are monitored before other overflow; monitoring is not a human task.
    remaining.sort(key=lambda row: (row["severity"] != "MEDIUM", -(row["priority"]["index"] or 0), row["invoice"]["id"]))
    monitor_ids = {row["invoice"]["id"] for row in remaining[:monitor_capacity]}
    for rank, row in enumerate(ranked, 1):
        ident = row["invoice"]["id"]
        row["queue"] = {"tier": "REVIEW_NOW" if ident in review_ids else "MONITOR" if ident in monitor_ids else "DEFERRED",
                        "rank": rank, "reason": "Priority allocation under the population review budget. All evidence retained."}
    for row in items:
        if not row["review_required"]:
            row["queue"] = {"tier": "NO_REVIEW", "rank": None, "reason": "No configured exception detected; not proof of legitimacy."}
    return {"population": len(items), "flagged": len(flagged), "review_capacity": review_capacity,
            "monitor_capacity": monitor_capacity, "review_now": len(review_ids), "monitor": len(monitor_ids),
            "deferred": len(flagged) - len(review_ids) - len(monitor_ids),
            "critical_overflow": sum(row["severity"] == "CRITICAL" and row["invoice"]["id"] not in review_ids for row in ranked),
            "policy": policy.model_dump(), "rounding": "Ceiling after aggregation; small populations exceed the nominal per-million rate."}
