import copy
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from backend.commerce import CommerceStore
from backend.main import app
from backend.services import risk_service


@pytest.fixture
def commerce(tmp_path, monkeypatch):
    monkeypatch.setenv("COMMERCE_OPERATOR_TOKEN", "test-operator")
    monkeypatch.setenv("COMMERCE_AGENT_TOKEN", "test-agent")
    monkeypatch.setenv("COMMERCE_DB_PATH", str(tmp_path / "commerce.db"))
    with TestClient(app) as client:
        yield client


HEADERS = {"X-Commerce-Token": "test-operator"}


def mandate(client, **overrides):
    body = {
        "customer_id": "C1",
        "merchant_ids": ["MERCH_001"],
        "categories": ["food"],
        "max_per_txn_paise": 100000,
        "max_total_paise": 100000,
        "approval_threshold_paise": 20000,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
    }
    body.update(overrides)
    result = client.post("/commerce/mandates", json=body, headers=HEADERS)
    assert result.status_code == 200, result.text
    return result.json()["mandate_id"]


def intent(mid, qty=1, sku="LUNCH"):
    now = datetime.now(timezone.utc)
    return {
        "idempotency_key": str(uuid4()),
        "mandate_id": mid,
        "merchant_id": "MERCH_001",
        "line_items": [{"sku": sku, "qty": qty}],
        "risk_context": {
            "source": "demo",
            "prior_transactions": [],
            "transaction": {
                "transaction_id": str(uuid4()),
                "customer_id": "C1",
                "merchant_id": "MERCH_001",
                "merchant_category": "food" if sku == "LUNCH" else "office",
                "timestamp": now.isoformat(),
                "amount": 250 * qty if sku == "LUNCH" else 1200 * qty,
                "device_id": "D1",
                "geo_region": "north",
                "payment_method": "upi",
                "status": "success",
                "account_created": (now - timedelta(days=90)).isoformat(),
            },
        },
    }


def post(client, body, token="test-operator"):
    return client.post(
        "/commerce/intents", json=body, headers={"X-Commerce-Token": token}
    )


def resolve(client, rid, action="approve"):
    return client.post(
        f"/commerce/reviews/{rid}",
        json={"action": action, "note": "Checked evidence"},
        headers=HEADERS,
    )


def test_real_model_review_receipt_and_replay(commerce):
    body = intent(mandate(commerce))
    result = post(commerce, body)
    assert result.status_code == 200, result.text
    receipt = result.json()
    assert receipt["status"] == "PENDING_REVIEW"
    assert receipt["risk"]["model_version"] == "lgbm_v1"
    assert receipt["risk"]["explanation_available"] is True
    assert receipt["execution"] == "NONE_DECISION_ONLY"
    assert post(commerce, body).json() == receipt
    assert resolve(commerce, receipt["id"]).json()["status"] == "AUTHORIZED"
    assert post(commerce, body).json()["reason_code"] == "HUMAN_APPROVED"
    assert resolve(commerce, receipt["id"]).status_code == 409
    evidence = commerce.get("/commerce/evidence", headers=HEADERS).json()
    assert evidence["valid"] and evidence["events"] == 3


@pytest.mark.parametrize(
    "change,reason",
    [
        ({"qty": 5}, "TRANSACTION_LIMIT"),
        ({"sku": "OFFICE"}, "CATEGORY_OUT_OF_SCOPE"),
        ({"sku": "UNKNOWN"}, "SKU_OR_MERCHANT_UNKNOWN"),
    ],
)
def test_scope_and_cap(commerce, change, reason):
    result = post(commerce, intent(mandate(commerce), **change)).json()
    assert result["status"] == "DENIED"
    assert result["reason_code"] == reason
    assert result["risk"] is None


def test_revoke_before_review(commerce):
    mid = mandate(commerce)
    receipt = post(commerce, intent(mid)).json()
    assert (
        commerce.post(
            f"/commerce/mandates/{mid}/revoke", json={}, headers=HEADERS
        ).status_code
        == 200
    )
    assert resolve(commerce, receipt["id"]).json()["reason_code"] == "MANDATE_REVOKED"


def test_expiry_before_review(commerce):
    mid = mandate(commerce)
    receipt = post(commerce, intent(mid)).json()
    value = app.state.commerce_store
    with value.connect() as db:
        import json

        data = json.loads(
            db.execute("SELECT payload FROM mandates WHERE id=?", (mid,)).fetchone()[0]
        )
        data["expires_at"] = (
            datetime.now(timezone.utc) - timedelta(seconds=1)
        ).isoformat()
        db.execute("UPDATE mandates SET payload=? WHERE id=?", (json.dumps(data), mid))
    assert resolve(commerce, receipt["id"]).json()["reason_code"] == "MANDATE_EXPIRED"


def test_pending_budget_and_rejection_release(commerce):
    mid = mandate(commerce, max_total_paise=25000)
    receipt = post(commerce, intent(mid)).json()
    assert post(commerce, intent(mid)).json()["reason_code"] == "BUDGET_EXHAUSTED"
    assert resolve(commerce, receipt["id"], "reject").json()["status"] == "DENIED"
    assert post(commerce, intent(mid)).json()["status"] == "PENDING_REVIEW"


def test_concurrent_budget_and_duplicate(commerce):
    mid = mandate(commerce, max_total_paise=25000)
    bodies = [intent(mid), intent(mid)]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda body: post(commerce, body).json(), bodies))
    assert sorted(r["status"] for r in results) == ["DENIED", "PENDING_REVIEW"]
    body = bodies[0]
    with ThreadPoolExecutor(max_workers=2) as pool:
        replays = list(pool.map(lambda _: post(commerce, body).json(), range(2)))
    assert replays[0] == replays[1] == results[0]


def test_idempotency_conflict_and_transaction_reuse(commerce):
    body = intent(mandate(commerce))
    assert post(commerce, body).status_code == 200
    changed = copy.deepcopy(body)
    changed["line_items"][0]["qty"] = 2
    assert post(commerce, changed).status_code == 409
    changed = copy.deepcopy(body)
    changed["idempotency_key"] = str(uuid4())
    assert post(commerce, changed).status_code == 409


def test_identity_price_and_extra_fields(commerce):
    mid = mandate(commerce)
    body = intent(mid)
    body["risk_context"]["transaction"]["amount"] = 1
    assert post(commerce, body).status_code == 422
    body = intent(mid)
    body["risk_context"]["transaction"]["customer_id"] = "attacker"
    assert post(commerce, body).status_code == 422
    body = intent(mid)
    body["line_items"][0]["price_paise"] = 1
    assert post(commerce, body).status_code == 422


def test_access_control_and_model_failure(commerce, monkeypatch):
    assert commerce.get("/commerce/evidence").status_code == 401
    assert (
        commerce.post(
            "/commerce/mandates", json={}, headers={"X-Commerce-Token": "test-agent"}
        ).status_code
        == 401
    )
    mid = mandate(commerce)
    monkeypatch.setattr(app.state, "model_bundle", None)
    assert post(commerce, intent(mid)).status_code == 503
    assert commerce.get("/commerce/receipts", headers=HEADERS).json() == []


@pytest.mark.parametrize(
    "action,expected",
    [
        ("BLOCK", "DENIED"),
        ("STEP_UP_VERIFICATION", "PENDING_REVIEW"),
        ("ALLOW", "AUTHORIZED"),
    ],
)
def test_risk_policy_composition(commerce, monkeypatch, action, expected):
    decision = SimpleNamespace(
        fraud_probability=0.9 if action == "BLOCK" else 0.1,
        model_version="test",
        action=action,
    )
    monkeypatch.setattr(
        risk_service,
        "evaluate_full",
        lambda *_: (decision, {"reasons": []}, "r", 10, None),
    )
    mid = mandate(commerce, approval_threshold_paise=100000)
    assert post(commerce, intent(mid)).json()["status"] == expected
    if action == "ALLOW":
        assert (
            post(commerce, intent(mid), token="test-agent").json()["status"]
            == "PENDING_REVIEW"
        )


def test_evidence_triggers_and_tamper_detection(commerce):
    mid = mandate(commerce)
    post(commerce, intent(mid))
    value = app.state.commerce_store
    with pytest.raises(sqlite3.IntegrityError), value.connect() as db:
        db.execute("UPDATE events SET payload='{}' WHERE seq=1")
    with value.connect() as db:
        db.execute("DROP TRIGGER events_no_update")
        db.execute("UPDATE events SET payload='{}' WHERE seq=1")
    assert commerce.get("/commerce/evidence", headers=HEADERS).json()["valid"] is False
    assert post(commerce, intent(mid)).status_code == 503


def test_restart_and_checkpoint(commerce):
    mid = mandate(commerce)
    body = intent(mid)
    receipt = post(commerce, body).json()
    app.state.commerce_store = CommerceStore(app.state.commerce_store.path)
    assert post(commerce, body).json() == receipt
    result = commerce.get(
        "/commerce/evidence?expected_head=" + "0" * 64, headers=HEADERS
    ).json()
    assert result["valid"] and not result["checkpoint_matches"]


def test_dashboard(commerce):
    response = commerce.get("/commerce")
    assert response.status_code == 200
    assert "Authority before action" in response.text
