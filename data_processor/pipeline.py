import pandas as pd

from data_processor.cleaner import clean_invoices
from data_processor.validator import validate_required_fields
from data_processor.rules import run_rule_engine


def process_file(
    file_path,
    policy_limit=None,
    risk_threshold=0.8
):
    """
    Process a cleaned/master procurement invoice Parquet file.

    Steps:
    1. Load Parquet file
    2. Clean invoice data
    3. Validate required fields
    4. Apply deterministic rule engine
    5. Combine validation and rule results
    """

    # Step 1: Load data
    df = pd.read_parquet(file_path)

    # Step 2: Clean data
    df = clean_invoices(df)

    # Step 3: Apply business rules
    rule_results = run_rule_engine(
        df,
        policy_limit=policy_limit,
        risk_threshold=risk_threshold
    )

    results = []

    # Step 4: Validate each row
    for _, row in df.iterrows():

        validation_errors = validate_required_fields(row)

        invoice_id = row.get("invoice_id")

        invoice_rule_result = {}

        if not rule_results.empty:
            matching_rules = rule_results[
                rule_results["invoice_id"] == invoice_id
            ]

            if not matching_rules.empty:
                invoice_rule_result = (
                    matching_rules.iloc[0].to_dict()
                )

        results.append({
            "invoice_id": invoice_id,
            "validation_errors": validation_errors,
            "rule_results": invoice_rule_result
        })

    return results