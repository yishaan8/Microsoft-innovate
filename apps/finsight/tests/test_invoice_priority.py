"""Budget, cascade and persistence invariants, independent of fraud labels."""

import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import func, inspect, select

from backend.invoice_priority import (
    ReviewPolicy,
    allocate,
    capacities,
    priority_evidence,
)
from backend.invoices import AnalysisRequest, analyze, demo_invoices, router
from backend.services.audit_service import AuditStore
from backend.services.invoice_audit import InvoiceAuditStore, batches
from tests.test_invoices import invoice, result


@pytest.fixture
def stored_client(tmp_path):
    audit = AuditStore(f"sqlite:///{tmp_path / 'audit.db'}")
    app = FastAPI()
    app.state.invoice_audit_store = InvoiceAuditStore(audit)
    app.include_router(router)
    with TestClient(app) as client:
        yield client, app.state.invoice_audit_store
    audit.engine.dispose()


def test_million_budget_and_rounding():
    assert capacities(1_000_000, ReviewPolicy()) == (100, 100)
    assert capacities(2_000_000, ReviewPolicy()) == (200, 200)
    assert capacities(6, ReviewPolicy()) == (1, 1)
    assert capacities(1000, ReviewPolicy(reviews_per_million=0, monitors_per_million=0)) == (0, 0)


def test_priority_formula_and_currency_conversion_are_explicit():
    item = result(invoice(amount=10000, po_number=""))
    policy = ReviewPolicy(review_cost_inr=100, recovery_fraction=0.5)
    evidence = priority_evidence(item, policy)
    assert evidence["index"] == 22.5
    dollar = result(invoice(currency="USD", po_number=""))
    assert priority_evidence(dollar, policy)["index"] is None
    assert priority_evidence(dollar, ReviewPolicy(currency_to_inr={"USD": 80}))["index"] == 180


@pytest.mark.parametrize("changes", [{"reviews_per_million": True}, {"reviews_per_million": -1},
    {"monitors_per_million": 1.5}, {"review_cost_inr": 0}, {"review_cost_inr": float("inf")},
    {"recovery_fraction": 1.1}, {"currency_to_inr": {"USD": -1}}, {"currency_to_inr": {"GBP": 1}}])
def test_bad_review_policy_rejected(changes):
    with pytest.raises(ValidationError):
        ReviewPolicy(**changes)


def test_critical_first_medium_monitor_and_all_flags_retained():
    payload = demo_invoices()
    payload.pop("provenance")
    data = analyze(AnalysisRequest(**payload))
    assert data["queue"]["review_now"] == data["queue"]["monitor"] == 1
    assert data["queue"]["deferred"] == 3
    assert data["summary"]["flagged"] == 5
    assert next(row for row in data["items"] if row["queue"]["tier"] == "REVIEW_NOW")["severity"] == "CRITICAL"
    assert next(row for row in data["items"] if row["queue"]["tier"] == "MONITOR")["severity"] == "MEDIUM"
    assert data["cascade"]["ml_routed"] == data["cascade"]["ml_executed"] == 1
    assert data["cascade"]["rule_flagged"] == 4
    assert data["cascade"]["baseline_clear"] == 1
    assert data["cascade"]["ml_fraction"] != 0.3
    assert all(row["audit"]["conclusion"] and row["pipeline"]["reason"] for row in data["items"])


def test_rule_and_duplicate_cases_never_fit_isolation_forest(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("ML should have been gated out")
    monkeypatch.setattr("backend.invoices.IsolationForest", forbidden)
    assert not result(invoice(po_number=""))["pipeline"]["ml_executed"]
    assert not result(history=[invoice(id="old", date="2026-10-01")])["pipeline"]["ml_executed"]
    history = [invoice(id=f"p{i}", invoice_number=f"OLD-{i}", date=f"2026-09-{i:02d}") for i in range(1, 21)]
    assert result(history=history)["pipeline"]["route"] == "BASELINE_CLEAR"


def test_zero_budget_retains_critical_overflow():
    payload = demo_invoices()
    payload.pop("provenance")
    payload["review_policy"] = {"reviews_per_million": 0, "monitors_per_million": 0}
    data = analyze(AnalysisRequest(**payload))
    assert data["queue"]["deferred"] == 5
    assert data["queue"]["critical_overflow"] == 1
    assert len(data["items"]) == 6


def test_new_description_reaches_ml_even_when_amount_is_normal():
    history = [invoice(id=f"p{i}", invoice_number=f"OLD-{i}", date=f"2026-09-{i:02d}") for i in range(1, 21)]
    item = result(invoice(description="International consulting annual license subscription"), history)
    assert item["pipeline"]["recurring_description"]["similarity"] < 0.7
    assert item["pipeline"]["route"] == "ML_REQUIRED"
    assert item["pipeline"]["ml_executed"]


def test_ties_deterministic_without_mutating_invoice_input():
    request = AnalysisRequest(invoices=[invoice(id="z", po_number=""), invoice(id="a", supplier_id="other", po_number="")])
    before = request.model_dump_json()
    data = analyze(request)
    assert next(row for row in data["items"] if row["queue"]["tier"] == "REVIEW_NOW")["invoice"]["id"] == "a"
    assert request.model_dump_json() == before
    assert allocate(data["items"], request.review_policy)["flagged"] == 2


def test_persistence_reuses_database_and_survives_restart(stored_client):
    client, store = stored_client
    payload = {"invoices": [invoice(po_number="").model_dump(mode="json")]}
    response = client.post("/ap/analyze", json=payload)
    assert response.status_code == 200
    assert response.json()["audit_persisted"]
    tables = inspect(store.engine).get_table_names()
    assert "audit_log" in tables and "ap_invoice_evidence" in tables
    another = InvoiceAuditStore(type("ExistingStore", (), {"engine": store.engine})())
    ledger = another.get_recent("default")
    assert ledger["population"] == 1
    assert ledger["items"][0]["audit"]["persisted"]
    with store.engine.connect() as connection:
        event = connection.execute(select(batches)).one()
        assert json.loads(event.input_json)["invoices"][0]["id"] == "new"
        assert json.loads(event.result_json)["items"][0]["priority"]["formula"]


def test_multiple_uploads_and_retries_share_budget(stored_client):
    client, store = stored_client
    for i in range(3):
        payload = {"invoices": [invoice(id=str(i), po_number="").model_dump(mode="json")]}
        data = client.post("/ap/analyze", json=payload).json()
        assert data["queue"]["population"] == i + 1
        assert data["queue"]["review_now"] == 1
    replay = client.post("/ap/analyze", json=payload).json()
    assert replay["idempotent_replay"]
    assert replay["queue"]["population"] == 3
    assert replay["queue"]["monitor"] == 1
    assert replay["queue"]["deferred"] == 1
    with store.engine.connect() as connection:
        assert connection.scalar(select(func.count()).select_from(batches)) == 3
    assert client.get("/ap/audit?limit=1").json()["has_more"]
    assert client.get("/ap/audit?tier=ALLOCATED").json()["population"] == 2
    assert client.get("/ap/audit?limit=0").status_code == 422


def test_finalization_freezes_intake_and_policy(stored_client):
    client, _ = stored_client
    payload = {"invoices": [invoice(po_number="").model_dump(mode="json")]}
    assert client.post("/ap/analyze", json=payload).status_code == 200
    changed = {**payload, "review_policy": {"reviews_per_million": 200}}
    assert client.post("/ap/analyze", json=changed).status_code == 409
    assert client.post("/ap/windows/default/finalize").json()["finalized"]
    assert client.get("/ap/audit").json()["finalized"]
    new = {"invoices": [invoice(id="newer").model_dump(mode="json")]}
    assert client.post("/ap/analyze", json=new).status_code == 409
    assert client.post("/ap/analyze", json=payload).status_code == 200
    assert client.post("/ap/analyze", json={**new, "window_id": "next"}).status_code == 200


def test_save_failure_is_not_reported_as_success(stored_client, monkeypatch):
    client, store = stored_client
    def broken(*args):
        raise RuntimeError("disk unavailable")
    monkeypatch.setattr(store, "record", broken)
    assert client.post("/ap/analyze", json={"invoices": [invoice().model_dump(mode="json")]}).status_code == 503


def test_database_totals_and_pagination_are_population_wide(stored_client):
    client, _ = stored_client
    for i in range(3):
        assert client.post("/ap/analyze", json={"invoices": [invoice(id=str(i), po_number="").model_dump(mode="json")]}).status_code == 200
    page = client.get("/ap/dataset?limit=1&offset=1").json()
    assert page["summary"]["invoices"] == page["summary"]["flagged"] == 3
    assert len(page["items"]) == 1 and page["has_more"]
    assert page["summary"]["flagged_exposure_inr"] == 3000
    assert page["queue"]["review_now"] == 1
    assert page["cascade"]["rule_flagged"] == 3


def test_synthetic_population_has_five_thousand_unique_invoices(stored_client):
    client, _ = stored_client
    ids = set()
    for offset in range(0, 5000, 500):
        payload = client.get(f"/ap/sample?offset={offset}").json()
        request = AnalysisRequest.model_validate(payload)
        ids.update(row.id for row in request.invoices)
        assert len(request.history) == 400
    assert len(ids) == 5000
    assert client.get("/ap/sample?offset=5000").status_code == 422


def test_csv_import_processes_more_than_five_hundred_rows(stored_client):
    client, _ = stored_client
    rows = ['id,invoice_number,supplier,supplier_id,department,amount,date,description,po_number,tax_id']
    rows.extend(f'{i},REF-{i},Supplier {i},s{i},Operations,1000,2026-10-03,Services,,TAX' for i in range(501))
    data = client.post('/ap/import', json={'csv_text': '\n'.join(rows)})
    assert data.status_code == 200, data.text
    assert data.json()['analysis']['summary']['invoices'] == 501
    assert client.get('/ap/dataset?offset=400').json()['population'] == 501
