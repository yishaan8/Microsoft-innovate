import pandas as pd

from data_processor.cleaner import clean_invoices


INPUT_FILE = "data/processed/invoices_master.parquet"
OUTPUT_FILE = "data/processed/invoices_cleaned.parquet"


# Load merged dataset
df = pd.read_parquet(INPUT_FILE)

# Clean dataset
cleaned_df = clean_invoices(
    df,
    output_path=OUTPUT_FILE
)

print("Cleaning completed successfully!")
print("Original shape:", df.shape)
print("Cleaned shape:", cleaned_df.shape)
print("Output file:", OUTPUT_FILE)

print("\nMissing values:")
print(cleaned_df.isna().sum())

print("\nDuplicate invoice IDs:")
print(cleaned_df["invoice_id"].duplicated().sum())