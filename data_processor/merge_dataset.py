import pandas as pd
from pathlib import Path


def merge_datasets():
    # Paths
    base_path = Path("data/raw")
    output_path = Path("data/processed")

    output_path.mkdir(parents=True, exist_ok=True)

    # Load datasets
    invoices = pd.read_parquet(base_path / "invoices.parquet")
    suppliers = pd.read_parquet(base_path / "suppliers.parquet")
    departments = pd.read_parquet(base_path / "departments.parquet")
    labels = pd.read_parquet(base_path / "labels.parquet")

    # Merge supplier information
    df = invoices.merge(
        suppliers,
        on="supplier_id",
        how="left"
    )

    # Merge department information
    df = df.merge(
        departments,
        on="department_id",
        how="left"
    )

    # Merge labels / ground truth
    df = df.merge(
        labels,
        on="invoice_id",
        how="left"
    )

    # Save merged dataset
    output_file = output_path / "invoices_master.parquet"
    df.to_parquet(output_file, index=False)

    print("Merge completed successfully!")
    print("Final shape:", df.shape)
    print("Output file:", output_file)

    print("\nMissing values after merge:")
    print(df.isna().sum())

    print("\nDuplicate invoice IDs:")
    print(df["invoice_id"].duplicated().sum())


if __name__ == "__main__":
    merge_datasets()