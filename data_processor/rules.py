import pandas as pd


# Required fields for the new procurement invoice dataset
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


def check_policy_limit(row, policy_limit=None):
    """
    Check whether the invoice amount exceeds a configured policy limit.

    The policy limit is optional because the selected dataset does not
    provide a documented per-invoice company policy limit.

    Args:
        row: Invoice row.
        policy_limit: Optional maximum allowed invoice amount.

    Returns:
        List of policy violation messages.
    """

    if policy_limit is None:
        return []

    amount = row.get("invoice_amount")

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


def check_blacklisted_supplier(row):
    """
    Check whether the supplier is blacklisted.

    Returns:
        List containing an exception message if the supplier is blacklisted.
    """

    flag = row.get("blacklisted_flag")

    if pd.isna(flag):
        return []

    try:
        flag = int(flag)
    except (ValueError, TypeError):
        return []

    if flag == 1:
        return ["Supplier is blacklisted"]

    return []


def check_supplier_risk(row, risk_threshold=0.8):
    """
    Check whether supplier risk score exceeds the configured threshold.

    Note:
        The threshold is an engineering rule for the MVP and is not
        presented as an official business policy from the dataset.

    Returns:
        List containing a risk exception when applicable.
    """

    risk_score = row.get("supplier_risk_score")

    if pd.isna(risk_score):
        return []

    try:
        risk_score = float(risk_score)
    except (ValueError, TypeError):
        return []

    if risk_score > risk_threshold:
        return [
            f"Supplier risk score {risk_score:.2f} exceeds threshold "
            f"of {risk_threshold:.2f}"
        ]

    return []


def check_submission_hour(row):
    """
    Check whether the invoice submission hour is valid.

    Valid hours are 0 through 23.
    """

    hour = row.get("submission_hour")

    if pd.isna(hour):
        return []

    try:
        hour = float(hour)
    except (ValueError, TypeError):
        return ["Invalid submission hour"]

    if not 0 <= hour <= 23:
        return ["Invalid submission hour"]

    return []


def find_exact_duplicates(df):
    """
    Find exact duplicate invoice records.

    invoice_id is ignored so that two different invoice IDs containing
    otherwise identical invoice information can still be detected.

    Returns:
        Set containing the row indices of duplicate records.
    """

    if df.empty:
        return set()

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


def run_rule_engine(
    df,
    policy_limit=None,
    risk_threshold=0.8
):
    """
    Apply deterministic business rules to every invoice.

    Rules:
    1. Missing required fields
    2. Optional policy-limit violation
    3. Blacklisted supplier
    4. High supplier risk
    5. Invalid submission hour
    6. Exact duplicate detection

    Returns:
        DataFrame containing:
        invoice_id
        status
        exception_count
        exceptions
    """

    results = []

    duplicate_indices = find_exact_duplicates(df)

    for index, row in df.iterrows():

        invoice_id = row.get("invoice_id")

        exceptions = []

        # Rule 1: Missing required fields
        exceptions.extend(
            check_missing_fields(row)
        )

        # Rule 2: Optional policy limit
        exceptions.extend(
            check_policy_limit(row, policy_limit)
        )

        # Rule 3: Blacklisted supplier
        exceptions.extend(
            check_blacklisted_supplier(row)
        )

        # Rule 4: Supplier risk
        exceptions.extend(
            check_supplier_risk(row, risk_threshold)
        )

        # Rule 5: Submission hour
        exceptions.extend(
            check_submission_hour(row)
        )

        # Rule 6: Exact duplicate
        if index in duplicate_indices:
            exceptions.append(
                "Exact duplicate invoice detected"
            )

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