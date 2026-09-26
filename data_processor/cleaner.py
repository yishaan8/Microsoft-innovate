import pandas as pd


REQUIRED_COLUMNS = [
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


def clean_invoices(df, output_path=None):
    """
    Clean the merged procurement invoice dataset.

    Input:
        df - pandas DataFrame

    Output:
        cleaned pandas DataFrame
    """

    df = df.copy()

    # ---------------------------------------------------------
    # 1. Remove completely empty rows
    # ---------------------------------------------------------
    df = df.dropna(how="all")

    # ---------------------------------------------------------
    # 2. Check required columns
    # ---------------------------------------------------------
    missing_columns = [
        column for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    # ---------------------------------------------------------
    # 3. Remove duplicate invoice IDs
    # ---------------------------------------------------------
    df = df.drop_duplicates(
        subset=["invoice_id"],
        keep="first"
    )

    # ---------------------------------------------------------
    # 4. Convert invoice date
    # ---------------------------------------------------------
    df["invoice_date"] = pd.to_datetime(
        df["invoice_date"],
        errors="coerce"
    )

    # ---------------------------------------------------------
    # 5. Convert invoice amount to numeric
    # ---------------------------------------------------------
    df["invoice_amount"] = pd.to_numeric(
        df["invoice_amount"],
        errors="coerce"
    )

    # ---------------------------------------------------------
    # 6. Remove records with critical missing values
    # ---------------------------------------------------------
    critical_columns = [
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

    df = df.dropna(subset=critical_columns)

    # ---------------------------------------------------------
    # 7. Invoice amount must be positive
    # ---------------------------------------------------------
    df = df[df["invoice_amount"] > 0]

    # ---------------------------------------------------------
    # 8. Submission hour must be between 0 and 23
    # ---------------------------------------------------------
    df = df[
        df["submission_hour"].between(0, 23)
    ]

    # ---------------------------------------------------------
    # 9. Standardize text fields
    # ---------------------------------------------------------
    text_columns = [
        "invoice_id",
        "supplier_id",
        "department_id",
        "currency",
        "payment_terms",
        "invoice_type",
    ]

    # Add optional text columns only if they exist
    optional_text_columns = [
        "supplier_country",
        "region",
        "fraud_type",
        "fraud_tags",
        "explanations",
    ]

    text_columns += [
        column
        for column in optional_text_columns
        if column in df.columns
    ]

    for column in text_columns:
        df[column] = (
            df[column]
            .astype(str)
            .str.strip()
        )

    # ---------------------------------------------------------
    # 10. Standardize currency
    # ---------------------------------------------------------
    if "currency" in df.columns:
        df["currency"] = (
            df["currency"]
            .str.upper()
        )

    # ---------------------------------------------------------
    # 11. Standardize invoice type
    # ---------------------------------------------------------
    if "invoice_type" in df.columns:
        df["invoice_type"] = (
            df["invoice_type"]
            .str.strip()
            .str.upper()
        )

    # ---------------------------------------------------------
    # 12. Convert numeric columns
    # ---------------------------------------------------------
    numeric_columns = [
        "invoice_amount",
        "submission_hour",
        "supplier_age_days",
        "supplier_risk_score",
        "blacklisted_flag",
        "avg_invoice_amount",
        "annual_budget",
        "is_fraud",
    ]

    for column in numeric_columns:
        if column in df.columns:
            df[column] = pd.to_numeric(
                df[column],
                errors="coerce"
            )

    # ---------------------------------------------------------
    # 13. Validate supplier risk score
    # ---------------------------------------------------------
    if "supplier_risk_score" in df.columns:
        df = df[
            df["supplier_risk_score"].between(0, 1)
        ]

    # ---------------------------------------------------------
    # 14. Validate blacklisted flag
    # ---------------------------------------------------------
    if "blacklisted_flag" in df.columns:
        df = df[
            df["blacklisted_flag"].isin([0, 1])
        ]

    # ---------------------------------------------------------
    # 15. Validate fraud label
    # ---------------------------------------------------------
    if "is_fraud" in df.columns:
        df = df[
            df["is_fraud"].isin([0, 1])
        ]

    # ---------------------------------------------------------
    # 16. Reset index
    # ---------------------------------------------------------
    df = df.reset_index(drop=True)

    # ---------------------------------------------------------
    # 17. Save cleaned dataset if output path is provided
    # ---------------------------------------------------------
    if output_path is not None:
        df.to_parquet(
            output_path,
            index=False
        )

    return df