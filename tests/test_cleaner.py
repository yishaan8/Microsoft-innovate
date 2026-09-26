import pandas as pd

from data_processor.cleaner import clean_invoices


def create_test_data():
    return pd.DataFrame({
        "invoice_id": ["INV001", "INV002"],
        "supplier_id": ["SUP001", "SUP002"],
        "department_id": ["DEP001", "DEP002"],
        "invoice_date": ["2026-01-15", "2026-01-16"],
        "invoice_amount": [12500, 25000],
        "currency": ["inr", "usd"],
        "payment_terms": [" NET 30 ", "NET 45"],
        "invoice_type": ["standard", "credit"],
        "submission_hour": [10, 15],
        "supplier_country": ["IN", "US"],
        "supplier_age_days": [500, 1000],
        "supplier_risk_score": [0.25, 0.40],
        "blacklisted_flag": [0, 0],
        "avg_invoice_amount": [12000, 24000],
        "region": ["North", "South"],
        "annual_budget": [1000000, 2000000],
        "is_fraud": [0, 1],
        "fraud_type": ["NONE", "DUPLICATE"],
        "fraud_tags": ["", "DUPLICATE"],
        "explanations": ["No exception", "Duplicate invoice detected"],
    })


def test_clean_invoices_removes_duplicate_ids():
    df = create_test_data()

    duplicate = df.iloc[[0]].copy()
    df = pd.concat([df, duplicate], ignore_index=True)

    result = clean_invoices(df)

    assert result["invoice_id"].duplicated().sum() == 0


def test_clean_invoices_converts_date():
    df = create_test_data()

    result = clean_invoices(df)

    assert pd.api.types.is_datetime64_any_dtype(
        result["invoice_date"]
    )


def test_clean_invoices_converts_amount_to_numeric():
    df = create_test_data()

    df["invoice_amount"] = ["12500", "25000"]

    result = clean_invoices(df)

    assert pd.api.types.is_numeric_dtype(
        result["invoice_amount"]
    )

    assert result.loc[0, "invoice_amount"] == 12500


def test_clean_invoices_removes_missing_critical_values():
    df = create_test_data()

    df.loc[0, "invoice_id"] = None

    result = clean_invoices(df)

    assert len(result) == 1
    assert result.iloc[0]["invoice_id"] == "INV002"


def test_clean_invoices_keeps_positive_amounts():
    df = create_test_data()

    df.loc[0, "invoice_amount"] = -500

    result = clean_invoices(df)

    assert len(result) == 1
    assert result.iloc[0]["invoice_id"] == "INV002"


def test_clean_invoices_validates_submission_hour():
    df = create_test_data()

    df.loc[0, "submission_hour"] = 25

    result = clean_invoices(df)

    assert len(result) == 1
    assert result.iloc[0]["invoice_id"] == "INV002"


def test_clean_invoices_strips_text_fields():
    df = create_test_data()

    df.loc[0, "supplier_id"] = "  SUP001  "
    df.loc[0, "payment_terms"] = "  NET 30  "

    result = clean_invoices(df)

    assert result.loc[0, "supplier_id"] == "SUP001"
    assert result.loc[0, "payment_terms"] == "NET 30"


def test_clean_invoices_standardizes_currency():
    df = create_test_data()

    df.loc[0, "currency"] = "inr"

    result = clean_invoices(df)

    assert result.loc[0, "currency"] == "INR"


def test_clean_invoices_standardizes_invoice_type():
    df = create_test_data()

    df.loc[0, "invoice_type"] = "standard"

    result = clean_invoices(df)

    assert result.loc[0, "invoice_type"] == "STANDARD"


def test_clean_invoices_validates_supplier_risk_score():
    df = create_test_data()

    df.loc[0, "supplier_risk_score"] = 1.5

    result = clean_invoices(df)

    assert len(result) == 1
    assert result.iloc[0]["invoice_id"] == "INV002"


def test_clean_invoices_validates_blacklisted_flag():
    df = create_test_data()

    df.loc[0, "blacklisted_flag"] = 5

    result = clean_invoices(df)

    assert len(result) == 1
    assert result.iloc[0]["invoice_id"] == "INV002"


def test_clean_invoices_validates_fraud_label():
    df = create_test_data()

    df.loc[0, "is_fraud"] = 5

    result = clean_invoices(df)

    assert len(result) == 1
    assert result.iloc[0]["invoice_id"] == "INV002"