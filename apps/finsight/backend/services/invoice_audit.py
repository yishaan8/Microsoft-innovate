"""Invoice evidence and shared-window budgets on MerchantShield's existing engine."""

import hashlib
import json
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Float,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    case,
    func,
    select,
)
from sqlalchemy.dialects.sqlite import insert

from backend.invoice_priority import ReviewPolicy, capacities

metadata = MetaData()
windows = Table("ap_review_windows", metadata,
                Column("id", String(64), primary_key=True), Column("policy_json", Text, nullable=False),
                Column("finalized", Integer, nullable=False, default=0))
invoices = Table("ap_invoice_evidence", metadata,
                 Column("window_id", String(64), primary_key=True), Column("invoice_id", String(64), primary_key=True),
                 Column("flagged", Integer, nullable=False, index=True), Column("critical", Integer, nullable=False),
                 Column("medium", Integer, nullable=False), Column("priority", Float, nullable=False),
                 Column("score", Integer, nullable=False), Column("tier", String(24), nullable=False),
                 Column("rank", Integer), Column("evidence_json", Text, nullable=False), Column("updated_at", String(64), nullable=False))
batches = Table("ap_analysis_events", metadata,
                Column("id", String(64), primary_key=True), Column("window_id", String(64), nullable=False, index=True),
                Column("input_json", Text, nullable=False), Column("result_json", Text, nullable=False),
                Column("created_at", String(64), nullable=False))


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


class InvoiceAuditStore:
    def __init__(self, audit_store):
        # Reuse the existing connection, path and transaction database; no second DB.
        self.engine = audit_store.engine
        metadata.create_all(self.engine)

    def _allocate(self, connection, window_id, policy):
        scope = invoices.c.window_id == window_id
        population = connection.scalar(select(func.count()).select_from(invoices).where(scope))
        flagged = connection.scalar(select(func.count()).select_from(invoices).where(scope, invoices.c.flagged == 1))
        review_capacity, monitor_capacity = capacities(population, policy)
        ranking = select(invoices.c.invoice_id, invoices.c.critical).where(scope, invoices.c.flagged == 1)
        review = connection.execute(ranking.order_by(invoices.c.critical.desc(), invoices.c.priority.desc(),
                                    invoices.c.score.desc(), invoices.c.invoice_id).limit(review_capacity)).all()
        review_ids = [row.invoice_id for row in review]
        monitor_query = ranking.where(invoices.c.invoice_id.not_in(review_ids)) if review_ids else ranking
        monitor = connection.execute(monitor_query.order_by(invoices.c.medium.desc(), invoices.c.priority.desc(),
                                     invoices.c.invoice_id).limit(monitor_capacity)).all()
        connection.execute(invoices.update().where(scope).values(tier="NO_REVIEW", rank=None))
        connection.execute(invoices.update().where(scope, invoices.c.flagged == 1).values(tier="DEFERRED"))
        for tier, rows in [("REVIEW_NOW", review), ("MONITOR", monitor)]:
            for rank, row in enumerate(rows, 1):
                connection.execute(invoices.update().where(scope, invoices.c.invoice_id == row.invoice_id).values(tier=tier, rank=rank))
        critical = connection.scalar(select(func.count()).select_from(invoices).where(scope, invoices.c.critical == 1))
        return {"population": population, "flagged": flagged, "review_capacity": review_capacity,
                "monitor_capacity": monitor_capacity, "review_now": len(review), "monitor": len(monitor),
                "deferred": flagged - len(review) - len(monitor),
                "critical_overflow": critical - sum(row.critical for row in review),
                "policy": policy.model_dump(), "scope": f"shared database window: {window_id}",
                "rounding": "Ceiling after aggregation. At one million: 100 reviews + 100 monitors. Small windows round up."}

    @staticmethod
    def _decode(row):
        item = json.loads(row.evidence_json)
        item["queue"] = {"tier": row.tier, "rank": row.rank,
                         "reason": "Shared-window budget; rank is within the allocated tier. Deferred flags remain stored."}
        item["audit"].update(saved_at=row.updated_at, persisted=True)
        return item

    def record(self, payload, result):
        window_id = payload.window_id
        input_json = canonical(payload.model_dump(mode="json"))
        event_id = hashlib.sha256(input_json.encode()).hexdigest()
        policy_json = canonical(payload.review_policy.model_dump())
        now = datetime.now(timezone.utc).isoformat()
        with self.engine.connect() as connection:
            # Serialize window allocations across concurrent SQLite uploads.
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            try:
                existing_policy = connection.scalar(select(windows.c.policy_json).where(windows.c.id == window_id))
                if existing_policy is not None and existing_policy != policy_json:
                    raise ValueError("Review policy differs from this existing window. Use the agreed policy or a new window_id.")
                connection.execute(insert(windows).values(id=window_id, policy_json=policy_json).on_conflict_do_nothing())
                seen = connection.scalar(select(batches.c.id).where(batches.c.id == event_id))
                finalized = bool(connection.scalar(select(windows.c.finalized).where(windows.c.id == window_id)))
                if finalized and not seen:
                    raise ValueError("This window is finalized. Intake is frozen to protect its review budget; use a new window_id for new invoices.")
                if not seen:
                    for item in result["items"]:
                        values = {"window_id": window_id, "invoice_id": item["invoice"]["id"],
                                  "flagged": int(item["review_required"]), "critical": int(item["severity"] == "CRITICAL"),
                                  "medium": int(item["severity"] == "MEDIUM"), "priority": item["priority"]["index"] or 0,
                                  "score": item["risk_score"], "tier": item["queue"]["tier"], "rank": None,
                                  "evidence_json": canonical(item), "updated_at": now}
                        statement = insert(invoices).values(**values)
                        connection.execute(statement.on_conflict_do_update(index_elements=["window_id", "invoice_id"], set_=values))
                result["queue"] = self._allocate(connection, window_id, payload.review_policy)
                result["queue"]["finalized"] = finalized
                ids = [item["invoice"]["id"] for item in result["items"]]
                saved = {row.invoice_id: self._decode(row) for row in connection.execute(
                    select(invoices).where(invoices.c.window_id == window_id, invoices.c.invoice_id.in_(ids)))}
                result["items"] = [saved[item["invoice"]["id"]] for item in result["items"]]
                result.update(audit_persisted=True, audit_event_id=event_id, idempotent_replay=bool(seen))
                if not seen:
                    connection.execute(batches.insert().values(id=event_id, window_id=window_id, input_json=input_json,
                                       result_json=canonical(result), created_at=now))
                connection.commit()
            except Exception:
                connection.rollback()
                raise
        return result

    def get_recent(self, window_id, limit=100, offset=0, tier="ALL"):
        with self.engine.connect() as connection:
            scope = invoices.c.window_id == window_id
            if tier == "ALLOCATED":
                scope = scope & invoices.c.tier.in_(["REVIEW_NOW", "MONITOR"])
            elif tier != "ALL":
                scope = scope & (invoices.c.tier == tier)
            rows = connection.execute(select(invoices).where(scope).order_by(invoices.c.updated_at.desc(), invoices.c.invoice_id)
                                      .limit(limit).offset(offset)).all()
            population = connection.scalar(select(func.count()).select_from(invoices).where(scope))
            finalized = bool(connection.scalar(select(windows.c.finalized).where(windows.c.id == window_id)))
            return {"items": [self._decode(row) for row in rows], "population": population,
                    "offset": offset, "limit": limit, "has_more": offset + len(rows) < population,
                    "database": "MerchantShield audit.db", "window_id": window_id, "finalized": finalized}

    def finalize(self, window_id):
        with self.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            try:
                policy_json = connection.scalar(select(windows.c.policy_json).where(windows.c.id == window_id))
                if policy_json is None:
                    raise ValueError("No analyzed invoices in this window.")
                queue = self._allocate(connection, window_id, ReviewPolicy.model_validate_json(policy_json))
                connection.execute(windows.update().where(windows.c.id == window_id).values(finalized=1))
                queue["finalized"] = True
                connection.commit()
                return queue
            except Exception:
                connection.rollback()
                raise

    def dataset(self, window_id=None, offset=0, limit=200):
        with self.engine.connect() as connection:
            if window_id is None:
                window_id = connection.scalar(select(batches.c.window_id).order_by(batches.c.created_at.desc()).limit(1))
            window_id = window_id or "default"
            scope = invoices.c.window_id == window_id
            def count_where(condition):
                return connection.scalar(select(func.count()).select_from(invoices).where(scope, condition))
            population = count_where(invoices.c.invoice_id.is_not(None))
            flagged = count_where(invoices.c.flagged == 1)
            critical = count_where(invoices.c.critical == 1)
            critical_overflow = count_where((invoices.c.critical == 1) & (invoices.c.tier != "REVIEW_NOW"))
            duplicate = count_where(func.json_extract(invoices.c.evidence_json, "$.match.kind").is_not(None))
            routed = count_where(func.json_extract(invoices.c.evidence_json, "$.pipeline.route") == "ML_REQUIRED")
            executed = count_where(func.json_extract(invoices.c.evidence_json, "$.pipeline.ml_executed") == 1)
            rule_flagged = count_where(func.json_extract(invoices.c.evidence_json, "$.pipeline.route") == "RULE_FLAGGED")
            baseline = count_where(func.json_extract(invoices.c.evidence_json, "$.pipeline.route") == "BASELINE_CLEAR")
            policy_json = connection.scalar(select(windows.c.policy_json).where(windows.c.id == window_id))
            policy = ReviewPolicy.model_validate_json(policy_json) if policy_json else ReviewPolicy()
            review_capacity, monitor_capacity = capacities(population, policy)
            review = count_where(invoices.c.tier == "REVIEW_NOW")
            monitor = count_where(invoices.c.tier == "MONITOR")
            exposure = connection.scalar(select(func.sum(case((invoices.c.flagged == 1,
                case((func.json_extract(invoices.c.evidence_json, "$.invoice.currency") == "INR",
                      func.json_extract(invoices.c.evidence_json, "$.invoice.amount")), else_=0)), else_=0))).where(scope)) or 0
            finalized = bool(connection.scalar(select(windows.c.finalized).where(windows.c.id == window_id)))
        page = self.get_recent(window_id, limit, offset)
        return {**page, "summary": {"invoices": population, "flagged": flagged, "critical": critical,
                "duplicates": duplicate, "flagged_exposure_inr": exposure},
                "queue": {"population": population, "flagged": flagged, "review_now": review, "monitor": monitor,
                          "deferred": flagged - review - monitor, "review_capacity": review_capacity,
                          "monitor_capacity": monitor_capacity, "policy": policy.model_dump(), "finalized": finalized,
                          "critical_overflow": critical_overflow},
                "cascade": {"total": population, "rule_flagged": rule_flagged, "baseline_clear": baseline,
                            "ml_routed": routed, "ml_executed": executed, "ml_fraction": routed / population if population else 0,
                            "target_ml_fraction": 0.3}, "audit_persisted": True,
                "provenance": "Synthetic invoice test population." if window_id.startswith("synthetic-") else "Persisted invoice records from the selected database window.",
                "view_scope": "Database-wide totals; charts and filters show the current page."}
