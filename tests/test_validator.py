from data_processor.validator import validate_required_fields


def test_valid_invoice():
    row = {
        "invoice_id": "INV001",
        "supplier_id": "SUP001",
        "department_id": "DEP001",
        "invoice_date": "2026-09-01",
        "invoice_amount": 50000,
        "currency": "USD",
        "payment_terms": "NET30",
        "invoice_type": "STANDARD",
        "submission_hour": 10,
    }

    errors = validate_required_fields(row)

    assert errors == []


def test_missing_supplier_id():
    row = {
        "invoice_id": "INV002",
        "supplier_id": "",
        "department_id": "DEP001",
        "invoice_date": "2026-09-01",
        "invoice_amount": 50000,
        "currency": "USD",
        "payment_terms": "NET30",
        "invoice_type": "STANDARD",
        "submission_hour": 10,
    }

    errors = validate_required_fields(row)

    assert len(errors) == 1
    assert errors[0]["field"] == "supplier_id"


def test_missing_invoice_amount():
    row = {
        "invoice_id": "INV003",
        "supplier_id": "SUP001",
        "department_id": "DEP001",
        "invoice_date": "2026-09-01",
        "invoice_amount": None,
        "currency": "USD",
        "payment_terms": "NET30",
        "invoice_type": "STANDARD",
        "submission_hour": 10,
    }

    errors = validate_required_fields(row)

    assert len(errors) == 1
    assert errors[0]["field"] == "invoice_amount"


def test_missing_multiple_fields():
    row = {
        "invoice_id": "INV004",
        "supplier_id": "",
        "department_id": "",
        "invoice_date": "2026-09-01",
        "invoice_amount": None,
        "currency": "USD",
        "payment_terms": "NET30",
        "invoice_type": "STANDARD",
        "submission_hour": 10,
    }

    errors = validate_required_fields(row)

    assert len(errors) == 3

    missing_fields = {
        error["field"]
        for error in errors
    }

    assert missing_fields == {
        "supplier_id",
        "department_id",
        "invoice_amount",
    }