import os
import pandas as pd


def load_file(file_path):
    """
    Load invoice data from CSV or Excel file.
    """

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    extension = os.path.splitext(file_path)[1].lower()

    if extension == ".csv":
        return pd.read_csv(file_path)

    elif extension in [".xlsx", ".xls"]:
        return pd.read_excel(file_path)

    else:
        raise ValueError(
            "Unsupported file format. Please use CSV or Excel."
        )


def load_csv(file_path):
    """
    Backward-compatible CSV loader.
    """
    return load_file(file_path)