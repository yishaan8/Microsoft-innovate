from data_processor.loader import load_csv
from data_processor.cleaner import clean_invoice_data
from data_processor.validator import validate_required_fields
from data_processor.rules import run_rule_engine


def process_file(file_path, policy_limit=100000):
    # Step 1: Load CSV
    df = load_csv(file_path)

    # Step 2: Clean data
    df = clean_invoice_data(df)

    # Step 3: Apply business rules to the complete DataFrame
    rule_results = run_rule_engine(df,  policy_limit)

    results = []

    # Step 4: Validate each row
    for _, row in df.iterrows():

        # Validate required fields
        validation_errors = validate_required_fields(row)

        # Get invoice ID
        invoice_id = row.get("invoice_id")

        # Find rule result for this invoice
        invoice_rule_result = {}

        if not rule_results.empty and "invoice_id" in rule_results.columns:
            matching_rules = rule_results[
                rule_results["invoice_id"] == invoice_id
            ]

            if not matching_rules.empty:
                invoice_rule_result = matching_rules.iloc[0].to_dict()

        # Final result for this invoice
        results.append({
            "invoice_id": invoice_id,
            "validation_errors": validation_errors,
            "rule_results": invoice_rule_result
        })

    return results