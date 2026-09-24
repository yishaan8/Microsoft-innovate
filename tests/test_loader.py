import pandas as pd

from data_processor.loader import load_file


def test_load_csv():
    df = load_file("data/invoices.csv")

    assert isinstance(df, pd.DataFrame)
    assert len(df) > 0


def test_load_excel():
    df = load_file("data/invoices.xlsx")

    assert isinstance(df, pd.DataFrame)
    assert len(df) > 0