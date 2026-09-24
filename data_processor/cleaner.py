import pandas as pd


def clean_invoice_data(df):
    """
    Clean and standardize invoice/expense data.

    Steps:
    1. Remove unnecessary spaces from column names.
    2. Remove completely empty rows.
    3. Clean text fields.
    4. Convert dates into standard datetime format.
    5. Convert amount into numeric format.
    6. Standardize currency and category.
    7. Create a common cleaned DataFrame.
    """

    df = df.copy()

    # ---------------------------------------------------------
    # 1. Clean column names
    # ---------------------------------------------------------
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
    )

    # ---------------------------------------------------------
    # 2. Remove completely empty rows
    # ---------------------------------------------------------
    df = df.dropna(how="all")

    # ---------------------------------------------------------
    # 3. Clean text columns
    # ---------------------------------------------------------
    text_columns = [
        "invoice_id",
        "vendor_name",
        "currency",
        "category",
        "description"
    ]

    for column in text_columns:
        if column in df.columns:
            df[column] = (
                df[column]
                .astype("string")
                .str.strip()
            )

    # ---------------------------------------------------------
    # 4. Convert dates
    # ---------------------------------------------------------
    date_columns = [
        "invoice_date",
        "due_date"
    ]

    for column in date_columns:
        if column in df.columns:
            df[column] = pd.to_datetime(
                df[column],
                errors="coerce"
            )

    # ---------------------------------------------------------
    # 5. Convert amount to numeric
    # ---------------------------------------------------------
    if "amount" in df.columns:
        df["amount"] = pd.to_numeric(
            df["amount"],
            errors="coerce"
        )

    # ---------------------------------------------------------
    # 6. Standardize currency
    # ---------------------------------------------------------
    if "currency" in df.columns:
        df["currency"] = (
            df["currency"]
            .str.upper()
        )

    # ---------------------------------------------------------
    # 7. Standardize category
    # ---------------------------------------------------------
    if "category" in df.columns:
        df["category"] = (
            df["category"]
            .str.strip()
            .str.title()
        )

    # ---------------------------------------------------------
    # 8. Reset index
    # ---------------------------------------------------------
    df = df.reset_index(drop=True)

    return df