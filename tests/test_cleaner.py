import pandas as pd

from data_processor.cleaner import clean_invoice_data


def test_clean_column_names():
    df = pd.DataFrame({
        " Invoice ID ": ["INV001"],
        "Vendor Name": ["ABC Supplies"],
        "Amount": [12500],
        "Currency": ["INR"],
        "Category": ["Office Supplies"]
    })

    result = clean_invoice_data(df)

    assert "invoice_id" in result.columns
    assert "vendor_name" in result.columns


def test_remove_empty_rows():
    df = pd.DataFrame({
        "invoice_id": ["INV001", None],
        "vendor_name": ["ABC Supplies", None],
        "amount": [12500, None]
    })

    result = clean_invoice_data(df)

    assert len(result) == 1


def test_clean_text_fields():
    df = pd.DataFrame({
        "invoice_id": ["  INV001  "],
        "vendor_name": ["  ABC Supplies  "],
        "currency": ["INR"],
        "category": ["  office supplies  "],
        "description": ["  Printer paper  "]
    })

    result = clean_invoice_data(df)

    assert result.loc[0, "invoice_id"] == "INV001"
    assert result.loc[0, "vendor_name"] == "ABC Supplies"
    assert result.loc[0, "category"] == "Office Supplies"
    assert result.loc[0, "description"] == "Printer paper"


def test_convert_amount_to_numeric():
    df = pd.DataFrame({
        "invoice_id": ["INV001"],
        "amount": ["12500"]
    })

    result = clean_invoice_data(df)

    assert result.loc[0, "amount"] == 12500
    assert pd.api.types.is_numeric_dtype(result["amount"])


def test_standardize_currency():
    df = pd.DataFrame({
        "invoice_id": ["INV001"],
        "currency": ["inr"]
    })

    result = clean_invoice_data(df)

    assert result.loc[0, "currency"] == "INR"


def test_standardize_category():
    df = pd.DataFrame({
        "invoice_id": ["INV001"],
        "category": ["  office supplies  "]
    })

    result = clean_invoice_data(df)

    assert result.loc[0, "category"] == "Office Supplies"