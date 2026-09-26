import pandas as pd

from data_processor.pipeline import process_file


def test_process_file(tmp_path):
    input_file = tmp_path / "test_invoices.parquet"

    df = pd.DataFrame([
        {
            "invoice_id": "INV001",
            "supplier_id": "SUP001",
            "department_id": "DEP001",
            "invoice_date": "2026-09-01",
            "invoice_amount": 5000,
            "currency": "USD",
            "payment_terms": "NET30",
            "invoice_type": "STANDARD",
            "submission_hour": 10,
            "blacklisted_flag": 0,
            "supplier_risk_score": 0.20,
        },
        {
            "invoice_id": "INV002",
            "supplier_id": "SUP002",
            "department_id": "DEP001",
            "invoice_date": "2026-09-02",
            "invoice_amount": 7000,
            "currency": "USD",
            "payment_terms": "NET30",
            "invoice_type": "STANDARD",
            "submission_hour": 11,
            "blacklisted_flag": 1,
            "supplier_risk_score": 0.30,
        },
    ])

    df.to_parquet(input_file, index=False)

    results = process_file(input_file)

    assert len(results) == 2

    assert results[0]["invoice_id"] == "INV001"
    assert results[0]["rule_results"]["status"] == "PASS"

    assert results[1]["invoice_id"] == "INV002"
    assert results[1]["rule_results"]["status"] == "EXCEPTION"