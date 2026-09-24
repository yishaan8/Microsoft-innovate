import pandas as pd

from data_processor.rules import (
    check_missing_fields,
    check_policy_limit,
    find_exact_duplicates,
)


def test_missing_field():
    row = pd.Series({
        "invoice_id": "INV001",
        "vendor_name": "",
        "invoice_date": "2026-01-01",
        "due_date": "2026-01-10",
        "amount": 5000,
        "currency": "INR",
        "category": "Office",
        "description": "Office supplies"
    })

    errors = check_missing_fields(row)

    assert len(errors) > 0

def test_policy_limit():
    row = pd.Series({
        "invoice_id": "INV002",
        "vendor_name": "ABC Ltd",
        "invoice_date": "2026-01-01",
        "due_date": "2026-01-10",
        "amount": 150000,
        "currency": "INR",
        "category": "Office",
        "description": "Office supplies"
    })

    errors = check_policy_limit(row)

    assert len(errors) == 1
    assert "exceeds" in errors[0]

def test_exact_duplicates():
    df = pd.DataFrame([
        {
            "invoice_id": "INV003",
            "vendor_name": "ABC Ltd",
            "invoice_date": "2026-01-01",
            "due_date": "2026-01-10",
            "amount": 5000,
            "currency": "INR",
            "category": "Office",
            "description": "Office supplies"
        },
        {
            "invoice_id": "INV004",
            "vendor_name": "ABC Ltd",
            "invoice_date": "2026-01-01",
            "due_date": "2026-01-10",
            "amount": 5000,
            "currency": "INR",
            "category": "Office",
            "description": "Office supplies"
        }
    ])

    duplicates = find_exact_duplicates(df)

    assert 1 in duplicates

def test_configurable_policy_limit():
    from data_processor.rules import check_policy_limit

    assert check_policy_limit(
        {"amount": 120000},
        policy_limit=100000
    ) == ["Invoice amount 120000 exceeds policy limit of 100000"]

    assert check_policy_limit(
        {"amount": 120000},
        policy_limit=150000
    ) == []