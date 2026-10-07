import numpy as np
import pandas as pd
import pytest

from ml.evaluation.cost_model import CostAssumptions
from ml.evaluation.review_queue import allocate_reviews
from ml.training.train_review_queue import queue_metrics


@pytest.fixture
def transactions():
    return pd.DataFrame(
        {
            "transaction_id": ["b", "a", "c"],
            "timestamp": [
                "2026-10-01T10:00:00Z",
                "2026-10-01T11:00:00Z",
                "2026-10-02T10:00:00Z",
            ],
            "amount": [100.0, 10000.0, 50.0],
            "is_fraud": [0, 1, 0],
        }
    )


def test_value_priority_and_daily_capacity(transactions):
    cost = CostAssumptions()
    risk = allocate_reviews(transactions, [0.9, 0.6, 0.1], 1, cost, "risk")
    value = allocate_reviews(transactions, [0.9, 0.6, 0.1], 1, cost)
    assert set(risk.loc[risk.selected, "transaction_id"]) == {"b", "c"}
    assert set(value.loc[value.selected, "transaction_id"]) == {"a", "c"}
    assert value.groupby("review_day").selected.sum().max() == 1
    metrics = queue_metrics(transactions, value, cost)
    assert metrics["fraud_value_identified"] == 10000
    assert metrics["false_alerts"] == 1
    assert metrics["negative_benefit_reviews"] == 1


def test_labels_and_input_order_do_not_affect_queue(transactions):
    a = allocate_reviews(transactions, [0.5, 0.5, 0.5], 1, CostAssumptions(), "risk")
    changed = transactions.iloc[::-1].copy()
    changed["is_fraud"] = 1 - changed["is_fraud"]
    b = allocate_reviews(changed, [0.5, 0.5, 0.5], 1, CostAssumptions(), "risk")
    assert a.transaction_id.tolist() == b.transaction_id.tolist()
    assert a.selected.tolist() == b.selected.tolist()
    assert a.iloc[0].transaction_id == "a"


@pytest.mark.parametrize(
    "p",
    [
        [np.nan, 0.5, 0.5],
        [np.inf, 0.5, 0.5],
        [-0.1, 0.5, 0.5],
        [1.1, 0.5, 0.5],
        [0.5],
        [[0.5, 0.5, 0.5]],
    ],
)
def test_invalid_probabilities_fail(transactions, p):
    with pytest.raises(ValueError):
        allocate_reviews(transactions, p, 1, CostAssumptions())


@pytest.mark.parametrize("capacity", [-1, 1.5, True])
def test_invalid_capacity_fails(transactions, capacity):
    with pytest.raises(ValueError):
        allocate_reviews(transactions, [0.5] * 3, capacity, CostAssumptions())


def test_empty_queue_and_zero_capacity(transactions):
    assert not allocate_reviews(
        transactions, [0.5] * 3, 0, CostAssumptions()
    ).selected.any()
    assert allocate_reviews(transactions.iloc[:0], [], 1, CostAssumptions()).empty


@pytest.mark.parametrize(
    "field,value",
    [("amount", 0), ("amount", np.inf), ("timestamp", None), ("transaction_id", None)],
)
def test_invalid_transactions_fail(transactions, field, value):
    transactions.loc[0, field] = value
    with pytest.raises(ValueError):
        allocate_reviews(transactions, [0.5] * 3, 1, CostAssumptions())


def test_duplicate_ids_fail(transactions):
    transactions.loc[0, "transaction_id"] = "a"
    with pytest.raises(ValueError):
        allocate_reviews(transactions, [0.5] * 3, 1, CostAssumptions())


def test_invalid_assumptions_fail(transactions):
    with pytest.raises(ValueError):
        allocate_reviews(
            transactions, [0.5] * 3, 1, CostAssumptions(fn_cost_fraction=2)
        )
