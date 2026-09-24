from data_processor.validator import validate_required_fields


def test_valid_invoice():
    row = {
        "invoice_id": "INV001",
        "vendor_name": "ABC Ltd",
        "invoice_date": "2026-09-01",
        "due_date": "2026-09-15",
        "amount": 50000,
        "currency": "INR",
        "category": "Software",
        "description": "Software purchase"
    }

    errors = validate_required_fields(row)

    assert errors == []


def test_missing_vendor_name():
    row = {
        "invoice_id": "INV002",
        "vendor_name": "",
        "invoice_date": "2026-09-01",
        "due_date": "2026-09-15",
        "amount": 50000,
        "currency": "INR",
        "category": "Software",
        "description": "Software purchase"
    }

    errors = validate_required_fields(row)

    assert len(errors) == 1
    assert errors[0]["field"] == "vendor_name"


def test_missing_amount():
    row = {
        "invoice_id": "INV003",
        "vendor_name": "ABC Ltd",
        "invoice_date": "2026-09-01",
        "due_date": "2026-09-15",
        "amount": None,
        "currency": "INR",
        "category": "Software",
        "description": "Software purchase"
    }

    errors = validate_required_fields(row)

    assert len(errors) == 1
    assert errors[0]["field"] == "amount"