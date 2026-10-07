"""AP contract, duplicate boundary cases and strictly-prior anomaly evidence."""

import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.invoices import AnalysisRequest, Invoice, analyze, demo_invoices, router


@pytest.fixture
def ap_client():
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as client:
        yield client


def invoice(**changes):
    return Invoice.model_validate({"id": "new", "invoice_number": "INV-2026-104",
        "supplier": "Acme Supplies Ltd", "supplier_id": "acme", "department": "Operations",
        "amount": 1000, "date": "2026-10-06", "description": "Steel bolts warehouse delivery",
        "po_number": "PO-1", "tax_id": "TAX-1", **changes})


def result(current=None, history=None, **policy):
    return analyze(AnalysisRequest(invoices=[current or invoice()], history=history or [], **policy))["items"][0]


def test_normal_invoice_with_no_history_is_not_claimed_fraud():
    item = result()
    assert item["status"] == "FLAGGED"
    assert [signal["code"] for signal in item["signals"]] == ["INSUFFICIENT_HISTORY"]
    assert item["pipeline"]["route"] == "ML_REQUIRED"
    assert not item["pipeline"]["ml_executed"]
    assert item["score_type"] == "triage_score_not_probability"
    assert item["anomaly"]["method"] == "insufficient_history"


def test_normalized_exact_duplicate():
    item = result(history=[invoice(id="old", invoice_number="inv_2026 104", date="2026-10-01")])
    assert item["match"]["kind"] == "EXACT_DUPLICATE"
    assert item["match"]["matched_invoice"]["id"] == "old"


def test_near_duplicate_returns_measured_evidence():
    item = result(history=[invoice(id="old", invoice_number="INV-2026-104A", amount=999, date="2026-10-04")])
    assert item["match"]["kind"] == "NEAR_DUPLICATE"
    assert item["match"]["components"]["description_tfidf"] == 1
    assert item["match"]["components"]["date_gap_days"] == 2
    assert item["risk_score"] == 90


@pytest.mark.parametrize("changes", [
    {"supplier_id": "another"}, {"currency": "USD"}, {"date": "2026-10-07"},
    {"invoice_number": "OTHER-REF", "description": "Annual software subscription"},
    {"invoice_number": "INV-2026-104A", "amount": 1500},
    {"invoice_number": "INV-2026-104A", "date": "2026-01-01"},
])
def test_duplicate_blocking_prevents_false_cross_context_matches(changes):
    assert result(history=[invoice(id="old", **changes)])["match"] is None


def test_same_name_but_different_trusted_supplier_ids_is_not_duplicate():
    assert result(history=[invoice(id="old", supplier_id="different")])["match"] is None


def test_missing_supplier_id_uses_name_similarity():
    item = result(history=[invoice(id="old", supplier_id=None, supplier="Acme Supplies, Ltd.")])
    assert item["match"] is not None


def test_repeated_number_with_changed_amount_remains_reviewable():
    assert result(history=[invoice(id="old", amount=1500)])["match"]["kind"] == "NEAR_DUPLICATE"


def test_prior_anomaly_excludes_same_date_future_supplier_and_currency():
    prior = [invoice(id=f"prior-{day}", invoice_number=f"OLD-{day}", date=f"2026-09-{day:02d}") for day in range(1, 21)]
    excluded = [invoice(id="same-day", invoice_number="UNRELATED", amount=100000), invoice(id="future", amount=100000, date="2026-10-07"),
                invoice(id="other", amount=100000, supplier_id="other"), invoice(id="dollars", amount=100000, currency="USD")]
    item = result(invoice(amount=10000), prior + excluded)
    assert item["anomaly"]["prior_count"] == 20
    assert item["anomaly"]["median_amount"] == 1000
    assert item["anomaly"]["amount_ratio"] == 10
    assert item["anomaly"]["isolation_outlier"] is not None
    assert any(signal["code"] == "AMOUNT_ANOMALY" for signal in item["signals"])


def test_stable_amount_history_does_not_flag_tiny_variations():
    prior = [invoice(id=f"p-{day}", invoice_number=f"OLD-{day}", date=f"2026-09-{day:02d}") for day in range(1, 7)]
    item = result(invoice(amount=1001), prior)
    assert item["anomaly"]["score"] == 0
    assert item["status"] == "CLEARED"


def test_rules_match_only_supplied_policy_and_currency():
    item = result(invoice(po_number="", tax_id="WATCH-ME", amount=5000), watchlist_tax_ids=["watch me"], department_limits={"Operations": 1000})
    assert {signal["code"] for signal in item["signals"]} == {"MISSING_PO", "WATCHLIST_MATCH", "DEPARTMENT_LIMIT"}
    assert item["severity"] == "CRITICAL"
    dollar_item = result(invoice(amount=5000, currency="USD"), department_limits={"Operations": 1000})
    assert "DEPARTMENT_LIMIT" not in {signal["code"] for signal in dollar_item["signals"]}


@pytest.mark.parametrize("changes", [{"amount": 0}, {"amount": -1}, {"amount": float("nan")},
    {"amount": float("inf")}, {"amount": True}, {"supplier": "  "}, {"supplier": "---"},
    {"date": "not-a-date"}, {"currency": "GBP"}, {"is_fraud": 1}])
def test_invalid_or_label_leaking_invoices_are_rejected(changes):
    with pytest.raises(ValidationError):
        invoice(**changes)


def test_context_limits_and_unique_ids():
    with pytest.raises(ValidationError):
        AnalysisRequest(invoices=[invoice()], history=[invoice()])
    for value in [-1, float("inf"), float("nan")]:
        with pytest.raises(ValidationError):
            AnalysisRequest(invoices=[invoice()], department_limits={"Operations": value})
    with pytest.raises(ValidationError):
        AnalysisRequest(invoices=[])
    with pytest.raises(ValidationError):
        AnalysisRequest(invoices=[invoice(id=str(index)) for index in range(501)])


def test_batch_is_chronological_and_matches_earlier_input():
    older = invoice(id="older", date="2026-10-01")
    response = analyze(AnalysisRequest(invoices=[invoice(), older]))
    assert response["items"][0]["invoice"]["id"] == "older"
    assert response["items"][1]["match"]["matched_invoice"]["id"] == "older"


def test_demo_endpoint_and_analysis_contract(ap_client):
    response = ap_client.get("/ap/demo")
    assert response.status_code == 200
    payload = response.json()
    assert "Fictional" in payload.pop("provenance")
    response = ap_client.post("/ap/analyze", json=payload)
    assert response.status_code == 200
    assert response.json()["summary"] == {"invoices": 6, "flagged": 5, "duplicates": 1, "critical": 1}
    assert ap_client.post("/ap/analyze", json={"invoices": []}).status_code == 422
    assert ap_client.post("/ap/analyze", json={**payload, "trusted_fraud_score": 1}).status_code == 422


def test_csv_import_quoted_values_and_empty_optional_fields(ap_client):
    text = 'id,invoice_number,supplier,department,amount,date,description,po_number,tax_id\n1,INV-1,"Acme, Ltd",Operations,1000,2026-10-06,"Steel, bolts",,\n'
    response = ap_client.post("/ap/import", json={"csv_text": text})
    assert response.status_code == 200
    assert response.json()["input"]["invoices"][0]["supplier"] == "Acme, Ltd"
    assert response.json()["analysis"]["summary"]["flagged"] == 1


@pytest.mark.parametrize("text", ["", "id,id\n1,2", "id,is_fraud\n1,1",
    "id,invoice_number\n1", 'id,invoice_number\n1,"unterminated', "id\n1", "id\n1,2"])
def test_csv_malformed_or_unknown_columns_are_rejected(ap_client, text):
    assert ap_client.post("/ap/import", json={"csv_text": text}).status_code == 422


def test_analysis_is_stateless_and_repeated_input_reproduces_results():
    payload = demo_invoices()
    payload.pop("provenance")
    request = AnalysisRequest(**payload)
    original = json.dumps(request.model_dump(mode="json"), sort_keys=True)
    first = analyze(request)
    assert analyze(request) == first
    assert json.dumps(request.model_dump(mode="json"), sort_keys=True) == original
