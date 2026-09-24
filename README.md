# AP Exception Intelligence

## Project Overview

AP Exception Intelligence is a Python-based invoice processing system that loads invoice data, cleans and standardizes the data, validates required fields, and applies deterministic business rules to identify invoice exceptions.

The system processes invoice records through the following pipeline:

**Load → Clean → Validate → Apply Rules → Generate Results**

The project is designed as a modular data-processing system where each stage has a separate responsibility.

---

## Project Objectives

The main objectives of the project are:

- Load invoice data from CSV and Excel files.
- Clean and standardize invoice data.
- Validate required invoice fields.
- Detect missing or invalid fields.
- Apply deterministic business rules.
- Detect invoice amounts exceeding a configurable policy limit.
- Detect exact duplicate invoices.
- Generate a common input/output format for downstream modules.
- Provide automated tests for the implemented functionality.

---

## Project Structure

```text
AP_Exception_Intelligence/
│
├── data/
│   └── invoices.csv
│
├── data_processor/
│   ├── __init__.py
│   ├── loader.py
│   ├── cleaner.py
│   ├── validator.py
│   ├── rules.py
│   └── pipeline.py
│
├── tests/
│   ├── __init__.py
│   ├── test_cleaner.py
│   ├── test_loader.py
│   ├── test_rules.py
│   └── test_validator.py
│
├── .gitignore
└── README.md