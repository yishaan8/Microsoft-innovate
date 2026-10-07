import csv
import io
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from backend.commerce import CommerceStore
from backend.main import app
from backend.reviews import initialize_reviews, parse_transactions

HEADERS = {"X-Commerce-Token": "test-operator"}


@pytest.fixture
def reviews(tmp_path, monkeypatch):
    monkeypatch.setenv("COMMERCE_OPERATOR_TOKEN", "test-operator")
    monkeypatch.setenv("COMMERCE_AGENT_TOKEN", "test-agent")
    monkeypatch.setenv("COMMERCE_DB_PATH", str(tmp_path / "commerce.db"))
    with TestClient(app) as client:
        yield client


def raw_csv(**changes):
    rows = []
    for index in range(6):
        row = {
            "transaction_id": f"t{index}",
            "customer_id": "C1",
            "merchant_id": "M1",
            "merchant_category": "electronics",
            "timestamp": f"2026-04-{1 + index // 3:02d}T{10 + index % 3:02d}:00:00Z",
            "amount": 100 + 100 * index,
            "device_id": "D1",
            "geo_region": "north",
            "payment_method": "upi",
            "status": "success",
            "account_created": "2026-01-01T00:00:00Z",
            "is_fraud": 0,
        }
        row.update(changes)
        rows.append(row)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0])
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def import_batch(client, text=None, capacity=1, **extra):
    return client.post(
        "/reviews/batches",
        headers=HEADERS,
        json={"csv_text": text or raw_csv(), "capacity_per_day": capacity, **extra},
    )


def test_import_review_export_and_restart(reviews):
    batch = import_batch(reviews)
    assert batch.status_code == 200, batch.text
    batch = batch.json()
    assert batch["selected_cases"] == 2
    result = reviews.get(
        f"/reviews/batches/{batch['id']}/cases", headers=HEADERS
    ).json()
    assert result["total"] == 2
    case = result["items"][0]
    assert "is_fraud" not in case["features"]
    assert case["daily_rank"] == 1
    resolution = reviews.post(
        f"/reviews/cases/{case['id']}",
        headers=HEADERS,
        json={
            "outcome": "legitimate",
            "reviewer": "Operator",
            "note": "Checked context",
        },
    )
    assert resolution.status_code == 200
    assert (
        resolution.json()["label_provenance"]
        == "HUMAN_DISPOSITION_UNVERIFIED_NOT_TRAINING_LABEL"
    )
    assert resolution.json()["execution"] == "NONE_HISTORICAL_REVIEW_ONLY"
    app.state.commerce_store = CommerceStore(app.state.commerce_store.path)
    initialize_reviews(app.state.commerce_store)
    restored = reviews.get(f"/reviews/cases/{case['id']}", headers=HEADERS).json()
    assert restored == resolution.json()
    exported = reviews.get(
        f"/reviews/batches/{batch['id']}/export", headers=HEADERS
    ).json()
    assert len(exported["cases"]) == 2
    assert exported["evidence"]["valid"]


def test_idempotence_excludes_labels_and_preserves_capacity(reviews):
    first = import_batch(reviews).json()
    second = import_batch(reviews, raw_csv(is_fraud=1)).json()
    assert first == second
    assert import_batch(reviews, capacity=2).status_code == 409
    with app.state.commerce_store.connect() as db:
        assert db.execute("SELECT COUNT(*) FROM review_cases").fetchone()[0] == 2


def test_concurrent_import_and_resolution(reviews):
    with ThreadPoolExecutor(max_workers=2) as pool:
        batches = list(pool.map(lambda _: import_batch(reviews), range(2)))
    assert all(response.status_code == 200 for response in batches)
    assert batches[0].json() == batches[1].json()
    case = reviews.get(
        f"/reviews/batches/{batches[0].json()['id']}/cases", headers=HEADERS
    ).json()["items"][0]
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(
            pool.map(
                lambda _: reviews.post(
                    f"/reviews/cases/{case['id']}",
                    headers=HEADERS,
                    json={
                        "outcome": "inconclusive",
                        "reviewer": "Operator",
                        "note": "Concurrent review",
                    },
                ),
                range(2),
            )
        )
    assert sorted(response.status_code for response in responses) == [200, 409]


@pytest.mark.parametrize(
    "changes",
    [
        {"amount": -1},
        {"timestamp": "bad"},
        {"transaction_id": "same"},
        {"customer_id": " "},
        {"amount": "NaN"},
    ],
)
def test_invalid_data_does_not_persist(reviews, changes):
    assert import_batch(reviews, raw_csv(**changes)).status_code == 422
    assert reviews.get("/reviews/batches", headers=HEADERS).json() == []


def test_history_cutoff_and_pagination(reviews):
    batch = import_batch(reviews, review_from="2026-04-02").json()
    assert batch["history_rows"] == 6 and batch["scored_rows"] == 3
    page = reviews.get(
        f"/reviews/batches/{batch['id']}/cases?limit=1&offset=0", headers=HEADERS
    ).json()
    assert page["total"] == 1
    assert page["items"][0]["features"]["prior_txn_count"] >= 3
    assert import_batch(reviews, review_from="2027-01-01").status_code == 422


def test_auth_missing_model_and_missing_cases(reviews, monkeypatch):
    assert reviews.get("/reviews/info").status_code == 401
    assert (
        reviews.post(
            "/reviews/demo", headers={"X-Commerce-Token": "test-agent"}
        ).status_code
        == 401
    )
    assert reviews.get("/reviews/cases/missing", headers=HEADERS).status_code == 404
    monkeypatch.setattr(app.state, "review_model", None)
    assert import_batch(reviews).status_code == 503
    assert reviews.get("/reviews/batches", headers=HEADERS).json() == []


def test_duplicate_headers_and_equal_timestamps():
    with pytest.raises(ValueError):
        parse_transactions("transaction_id,transaction_id\na,b\n")
    with pytest.raises(ValueError):
        parse_transactions(raw_csv(timestamp="2026-04-01T10:00:00Z"))


def test_integrity_failure_prevents_mutation(reviews):
    batch = import_batch(reviews).json()
    case = reviews.get(f"/reviews/batches/{batch['id']}/cases", headers=HEADERS).json()[
        "items"
    ][0]
    with app.state.commerce_store.connect() as db:
        db.execute("DROP TRIGGER events_no_update")
        db.execute("UPDATE events SET payload='{}' WHERE seq=1")
    response = reviews.post(
        f"/reviews/cases/{case['id']}",
        headers=HEADERS,
        json={"outcome": "legitimate", "reviewer": "Operator", "note": "Check"},
    )
    assert response.status_code == 503
    assert import_batch(reviews).status_code == 503


def test_case_tampering_is_not_reported_as_valid_evidence(reviews):
    batch = import_batch(reviews).json()
    case = reviews.get(f"/reviews/batches/{batch['id']}/cases", headers=HEADERS).json()[
        "items"
    ][0]
    with app.state.commerce_store.connect() as db:
        db.execute("UPDATE review_cases SET priority=999999 WHERE id=?", (case["id"],))
    assert (
        reviews.get(f"/reviews/cases/{case['id']}", headers=HEADERS).status_code == 503
    )
    assert (
        reviews.get(
            f"/reviews/batches/{batch['id']}/export", headers=HEADERS
        ).status_code
        == 503
    )
