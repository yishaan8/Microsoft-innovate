import pandas as pd


# Policy limit for invoice amount
POLICY_LIMIT = 100000


# Required fields for an invoice
REQUIRED_FIELDS = [
    "vendor_name",
    "invoice_date",
    "due_date",
    "amount",
    "currency",
    "category",
    "description"
]


def check_missing_fields(row):
    """
    Check whether any required invoice fields are missing.

    Returns:
        List of error messages.
    """

    errors = []

    for field in REQUIRED_FIELDS:
        value = row.get(field)

        if pd.isna(value) or str(value).strip() == "":
            errors.append(f"Missing required field: {field}")

    return errors


def check_policy_limit(row, policy_limit=100000):
    """
    Check whether the invoice amount exceeds the policy limit.

    Args:
        row: Invoice row.
        policy_limit: Maximum allowed invoice amount.
                       Default is 100000.

    Returns:
        List of policy violation messages.
    """

    amount = row.get("amount")

    # If amount is missing, missing-field validation handles it
    if pd.isna(amount) or str(amount).strip() == "":
        return []

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return []

    if amount > policy_limit:
        return [
            f"Invoice amount {amount:g} exceeds policy limit of {policy_limit:g}"
        ]

    return []


def find_exact_duplicates(df):
    """
    Find exact duplicate invoice records.

    The invoice_id is ignored while checking for duplicates because
    two invoices with different IDs can still contain identical
    invoice information.

    Returns:
        Set containing the row indices of duplicate records.
    """

    if df.empty:
        return set()

    # Columns used to determine whether two invoice records
    # contain exactly the same information.
    duplicate_columns = [
        column
        for column in df.columns
        if column != "invoice_id"
    ]

    if not duplicate_columns:
        return set()

    duplicate_rows = df.duplicated(
        subset=duplicate_columns,
        keep="first"
    )

    return set(df.index[duplicate_rows])


def run_rule_engine(df, policy_limit=100000):
    """
    Apply all business rules to every invoice.

    Rules:
    1. Missing required fields
    2. Policy limit violation
    3. Exact duplicate detection

    Returns:
        DataFrame containing:
        invoice_id
        status
        exception_count
        exceptions
    """

    results = []

    # Find duplicate rows once for the complete DataFrame
    duplicate_indices = find_exact_duplicates(df)

    for index, row in df.iterrows():

        invoice_id = row.get("invoice_id")

        exceptions = []

        # Rule 1: Missing required fields
        missing_errors = check_missing_fields(row)
        exceptions.extend(missing_errors)

        # Rule 2: Policy limit
        policy_errors = check_policy_limit(row, policy_limit)
        exceptions.extend(policy_errors)

        # Rule 3: Exact duplicate
        if index in duplicate_indices:
            exceptions.append("Exact duplicate invoice detected")

        # Determine final status
        if exceptions:
            status = "EXCEPTION"
        else:
            status = "PASS"

        results.append({
            "invoice_id": invoice_id,
            "status": status,
            "exception_count": len(exceptions),
            "exceptions": exceptions
        })

    return pd.DataFrame(results)