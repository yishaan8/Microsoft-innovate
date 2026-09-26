import pandas as pd

from data_processor.rules import (
    check_missing_fields,
    check_policy_limit,
    check_blacklisted_supplier,
    check_supplier_risk,
    check_submission_hour,
    find_exact_duplicates,
    run_rule_engine,
)


def test_missing_field():
    row = pd.Series({
        "invoice_id": "INV001",
        "supplier_id": "",
        "department_id": "DEP001",
        "invoice_date": "2026-01-01",
        "invoice_amount": 5000,
        "currency": "USD",
        "payment_terms": "NET30",
        "invoice_type": "STANDARD",
        "submission_hour": 10,
    })

    errors = check_missing_fields(row)

    assert len(errors) > 0
    assert "supplier_id" in errors[0]


def test_policy_limit():
    row = pd.Series({
        "invoice_id": "INV002",
        "invoice_amount": 150000,
    })

    errors = check_policy_limit(
        row,
        policy_limit=100000
    )

    assert len(errors) == 1
    assert "exceeds" in errors[0]


def test_policy_limit_not_exceeded():
    row = pd.Series({
        "invoice_id": "INV003",
        "invoice_amount": 120000,
    })

    errors = check_policy_limit(
        row,
        policy_limit=150000
    )

    assert errors == []


def test_blacklisted_supplier():
    row = pd.Series({
        "invoice_id": "INV004",
        "blacklisted_flag": 1,
    })

    errors = check_blacklisted_supplier(row)

    assert errors == ["Supplier is blacklisted"]


def test_non_blacklisted_supplier():
    row = pd.Series({
        "invoice_id": "INV005",
        "blacklisted_flag": 0,
    })

    errors = check_blacklisted_supplier(row)

    assert errors == []


def test_supplier_risk():
    row = pd.Series({
        "invoice_id": "INV006",
        "supplier_risk_score": 0.9,
    })

    errors = check_supplier_risk(
        row,
        risk_threshold=0.8
    )

    assert len(errors) == 1
    assert "risk score" in errors[0]


def test_supplier_risk_below_threshold():
    row = pd.Series({
        "invoice_id": "INV007",
        "supplier_risk_score": 0.5,
    })

    errors = check_supplier_risk(
        row,
        risk_threshold=0.8
    )

    assert errors == []


def test_valid_submission_hour():
    row = pd.Series({
        "invoice_id": "INV008",
        "submission_hour": 15,
    })

    assert check_submission_hour(row) == []


def test_invalid_submission_hour():
    row = pd.Series({
        "invoice_id": "INV009",
        "submission_hour": 25,
    })

    errors = check_submission_hour(row)

    assert errors == ["Invalid submission hour"]


def test_exact_duplicates():
    df = pd.DataFrame([
        {
            "invoice_id": "INV010",
            "supplier_id": "SUP001",
            "department_id": "DEP001",
            "invoice_date": "2026-01-01",
            "invoice_amount": 5000,
            "currency": "USD",
            "payment_terms": "NET30",
            "invoice_type": "STANDARD",
            "submission_hour": 10,
        },
        {
            "invoice_id": "INV011",
            "supplier_id": "SUP001",
            "department_id": "DEP001",
            "invoice_date": "2026-01-01",
            "invoice_amount": 5000,
            "currency": "USD",
            "payment_terms": "NET30",
            "invoice_type": "STANDARD",
            "submission_hour": 10,
        }
    ])

    duplicates = find_exact_duplicates(df)

    assert 1 in duplicates


def test_rule_engine():
    df = pd.DataFrame([
        {
            "invoice_id": "INV012",
            "supplier_id": "SUP001",
            "department_id": "DEP001",
            "invoice_date": "2026-01-01",
            "invoice_amount": 5000,
            "currency": "USD",
            "payment_terms": "NET30",
            "invoice_type": "STANDARD",
            "submission_hour": 10,
            "blacklisted_flag": 0,
            "supplier_risk_score": 0.2,
        },
        {
            "invoice_id": "INV013",
            "supplier_id": "SUP002",
            "department_id": "DEP002",
            "invoice_date": "2026-01-01",
            "invoice_amount": 5000,
            "currency": "USD",
            "payment_terms": "NET30",
            "invoice_type": "STANDARD",
            "submission_hour": 10,
            "blacklisted_flag": 1,
            "supplier_risk_score": 0.9,
        }
    ])

    results = run_rule_engine(df)

    assert len(results) == 2

    first_result = results.iloc[0]
    second_result = results.iloc[1]

    assert first_result["status"] == "PASS"
    assert second_result["status"] == "EXCEPTION"
    assert second_result["exception_count"] >= 2