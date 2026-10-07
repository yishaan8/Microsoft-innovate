# Database teammate handoff

## Run and test

From repository root:

```bash
cd apps/finsight
bash setup.sh
bash start.sh
```

Open http://127.0.0.1:8000/. The app loads the latest saved analysis window.
An empty/six-demo database automatically receives a clearly labelled, reproducible 5,000-row
synthetic invoice test population. This is a functional demo, not a real invoice accuracy benchmark.
The original 212,960-row MerchantShield synthetic **transaction** dataset and model artifacts
remain separate from invoice evidence.

Run the two suites in separate processes to avoid their independent `tests` package names:

```bash
# From repository root; needs pandas, openpyxl, pyarrow and pytest.
python -m pytest tests/ -q

# From apps/finsight, after setup.
.venv/bin/python -m pytest tests/ -m 'not integration' -q
```

Frontend development uses `npm ci`, `npm run build`, `npm run lint` inside `frontend`.
Production startup uses the included `frontend/dist`; Node is unnecessary for the local demo.

## Preserve the current work

The root `data_processor/` and root tests are kept intact. Member 1 cleaning and rules are already
implemented there; integrate their structured output rather than rebuilding those checks.
`apps/finsight/backend/invoices.py` provides independently testable matching, cascade and AP evidence.
Its rules are the standalone fallback until the shared pipeline feeds your API.

Keep both services separate initially: query authorized invoice/history records in your database
service, map them into the contract below, send bounded batches to `POST /ap/analyze`, then persist
the response under your invoice IDs. Apply tenant checks and authenticated reviewer identity
in your service. This prototype currently has demo personas and no enterprise authentication.

## Input contract

```json
{
  "window_id": "company1-2026-10",
  "invoices": [{
    "id": "internal-row-123",
    "invoice_number": "supplier-issued-INV-123",
    "supplier_id": "supplier-9",
    "supplier": "Supplier name",
    "department": "Operations",
    "amount": 10000,
    "currency": "INR",
    "date": "2026-10-03",
    "description": "Actual invoice line-item description",
    "po_number": "PO-17",
    "tax_id": "Actual supplier tax identifier"
  }],
  "history": [],
  "department_limits": {},
  "watchlist_tax_ids": [],
  "review_policy": {
    "reviews_per_million": 100,
    "monitors_per_million": 100,
    "review_cost_inr": 100,
    "recovery_fraction": 0.5,
    "currency_to_inr": {"INR": 1}
  }
}
```

At most 500 incoming invoices and 2,000 candidate history records per API request.
CSV/JSON UI imports accept 5,000 records / 20 MB per file and divide them into bounded batches.
All input IDs must be unique across the batch and candidate history. Candidate matching must
retain earlier invoices across batches; pass references from your database rather than relying
only on the current upload. The interactive importer carries up to 2,000 earlier uploaded rows.

| Existing procurement/source field | AP field | Integration requirement |
|---|---|---|
| `invoice_id` | `id` | Unique internal record key, not proof of supplier invoice number |
| Supplier-issued invoice reference | `invoice_number` | Retrieve the real reference; do not invent one to conceal missing data |
| `supplier_id` | `supplier_id` | Preserve the trusted supplier identifier |
| Supplier lookup, or CSV `vendor_name` | `supplier` | Map from authorized supplier master data |
| Department lookup, or CSV `category` | `department` | Use the real department; category mapping must be explicit |
| `invoice_amount`, or CSV `amount` | `amount` | Positive finite numeric value |
| `invoice_date` | `date` | ISO date `YYYY-MM-DD` |
| `currency` | `currency` | INR/USD/EUR/ZAR; caller provides any currency conversion rates |
| Actual line-item text, or CSV `description` | `description` | Required for semantic matching; invoice type is not equivalent |
| Real purchase order / tax identifier | `po_number` / `tax_id` | Leave absent values blank; missing-field findings remain explicit |
| `blacklisted_flag`, `supplier_risk_score`, `submission_hour` | Member 1 rule output | Preserve its existing structured findings in your service; do not manufacture tax IDs |
| Fraud labels / ground truth | Evaluation only | Never send them as input features; the AP schema rejects extra fields |

The repository's small CSV has a different schema from the procurement Parquet pipeline.
The large raw Parquet files described by the root README are not checked into this branch.
Connect your actual database/export; no real invoice rows or credentials are committed here.

## Output, persistence and review limits

`items` retains invoice data, every signal/reason, matching reference and component scores,
prior supplier statistics, ML route/skipping reason, policy version, priority formula components
and queue tier. Triage score is not a calibrated fraud probability. The 70/30 cascade split is
a measured target; unresolved cases are never discarded to meet that target.

The prototype reuses MerchantShield's `AuditStore.engine` and `backend/data/audit.db`:

| Table | Purpose |
|---|---|
| `audit_log` | Existing transaction decision ledger; preserved |
| `ap_review_windows` | Policy and intake-finalization state for one shared population |
| `ap_invoice_evidence` | Latest descriptive evidence and allocation per window/invoice ID |
| `ap_analysis_events` | Immutable raw-input and analysis snapshots, keyed by request hash |

The source is `backend/services/invoice_audit.py`; the app initializes it in `backend/main.py`.
This store is SQLite-specific (`BEGIN IMMEDIATE`, SQLite upserts). For another database,
implement equivalent atomic allocation and idempotency with your existing persistence code;
do not directly swap its URL and assume SQLite locking/upserts still work.

`GET /ap/dataset` returns whole-window totals plus a page; `GET /ap/audit` exposes paginated
evidence and tier filters. `POST /ap/windows/{window_id}/finalize` freezes intake after all batches.
Policies must match across a window. Exact retries do not duplicate population counts.
Default budgets are `ceil(population × 100 / 1,000,000)` each for human review and monitoring.
Small populations round upward. Deferred flags stay stored; critical overflow is surfaced.
Allocate human tasks only after finalization so intake cannot continually replace selected tasks.

Your service owns approval/rejection, task assignment, completed-review accounting, auth, tenants,
source retention and external BI. Exported reviewer handoffs contain `persisted: false` because
they are proposed notes, while the analysis evidence itself has already been saved.

The verified 5,000-row synthetic run took about 52 seconds in the development environment.
Million-row throughput, real AP precision/recall and production identity controls are unverified.
See `validation/` and `FINSIGHT_GUIDE.md` for the recorded tests, dataset scope and limitations.
