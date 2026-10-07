# AP Exception Intelligence

## FinSight application and database integration

The complete React/FastAPI application is in [`apps/finsight`](apps/finsight), alongside
the existing Member 1 data/rule engine. Run `bash setup.sh` and `bash start.sh` from that folder.
The built frontend, trained transaction models, reproducible synthetic data, AP cascade,
budgeted review queue and tests are included.

The database teammate should read [`apps/finsight/DATABASE_INTEGRATION.md`](apps/finsight/DATABASE_INTEGRATION.md)
for the request contract, existing SQLite tables, field mapping and integration boundaries.
The root procurement pipeline and its existing datasets are preserved. The original
Member 1 description below remains unchanged.

## Project Overview

AP Exception Intelligence is a Python-based invoice processing system designed to identify exceptions in procurement invoice data.

The system loads procurement invoice data, merges related supplier and department information, cleans and validates the data, and applies deterministic business rules to identify invoice exceptions.

The current data-processing pipeline is:

**Raw Parquet Data → Merge → Clean → Validate → Apply Rules → Generate Results**

The project is designed as a modular data-processing system where each stage has a separate responsibility.

---

## Project Objectives

The main objectives of the project are:

- Load procurement invoice data from Parquet files.
- Merge invoice, supplier, department, and label datasets.
- Clean and standardize invoice data.
- Validate required invoice fields.
- Detect missing or invalid fields.
- Detect blacklisted suppliers.
- Detect suppliers with high risk scores.
- Detect invalid invoice submission hours.
- Detect exact duplicate invoice records.
- Support an optional configurable invoice policy limit.
- Generate a common rule-engine output format for downstream modules.
- Provide automated tests for the implemented functionality.

---

## Dataset

The project uses a procurement invoice fraud dataset containing:

- **300,000 invoices**
- **2,000 suppliers**
- **50 departments**

The selected data files are:

```text
data/raw/
├── invoices.parquet
├── suppliers.parquet
├── departments.parquet
└── labels.parquet

https://finsight-ap.vercel.app/login
