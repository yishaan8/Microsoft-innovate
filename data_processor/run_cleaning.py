from cleaner import clean_invoices


INPUT_FILE = "data/raw/invoices.parquet"
OUTPUT_FILE = "data/processed/invoices_cleaned.parquet"


df = clean_invoices(INPUT_FILE, OUTPUT_FILE)

print("Cleaning completed successfully!")
print("Final shape:", df.shape)
print("Output file:", OUTPUT_FILE)

print("\nMissing values:")
print(df.isna().sum())

print("\nDuplicate invoice IDs:")
print(df["invoice_id"].duplicated().sum())