import pandas as pd

from data_processor.rules import run_rule_engine


INPUT_FILE = "data/processed/invoices_cleaned.parquet"
OUTPUT_FILE = "data/processed/rule_results.parquet"


# Load cleaned dataset
df = pd.read_parquet(INPUT_FILE)

print("Loaded dataset:", df.shape)

# Run deterministic rule engine
results = run_rule_engine(
    df,
    policy_limit=None,
    risk_threshold=0.8
)

# Save results
results.to_parquet(
    OUTPUT_FILE,
    index=False
)

print("\nRule Engine completed successfully!")
print("Input rows:", len(df))
print("Output rows:", len(results))

print("\nStatus counts:")
print(results["status"].value_counts())

print("\nException percentage:")
exception_count = (results["status"] == "EXCEPTION").sum()
exception_percentage = exception_count / len(results) * 100
print(f"{exception_percentage:.2f}%")

print("\nRule breakdown:")

print(
    "Blacklisted suppliers:",
    results["exceptions"].apply(
        lambda x: any("blacklisted" in str(v).lower() for v in x)
    ).sum()
)

print(
    "High supplier risk:",
    results["exceptions"].apply(
        lambda x: any("risk score" in str(v).lower() for v in x)
    ).sum()
)

print(
    "Missing fields:",
    results["exceptions"].apply(
        lambda x: any("Missing required field" in str(v) for v in x)
    ).sum()
)

print(
    "Invalid submission hour:",
    results["exceptions"].apply(
        lambda x: any("Invalid submission hour" in str(v) for v in x)
    ).sum()
)

print(
    "Exact duplicates:",
    results["exceptions"].apply(
        lambda x: any("Exact duplicate" in str(v) for v in x)
    ).sum()
)

print("\nOutput file:")
print(OUTPUT_FILE)