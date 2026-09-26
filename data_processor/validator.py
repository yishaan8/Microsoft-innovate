import pandas as pd


REQUIRED_FIELDS = [
    "invoice_id",
    "supplier_id",
    "department_id",
    "invoice_date",
    "invoice_amount",
    "currency",
    "payment_terms",
    "invoice_type",
    "submission_hour",
]


def validate_required_fields(row):
    """
    Check whether all required invoice fields exist and contain values.

    Returns:
        List of validation error dictionaries.
    """

    errors = []

    invoice_id = row.get("invoice_id")

    for field in REQUIRED_FIELDS:
        value = row.get(field)

        if pd.isna(value) or str(value).strip() == "":
            errors.append({
                "invoice_id": invoice_id,
                "field": field,
                "error": "Missing required field"
            })

    return errors