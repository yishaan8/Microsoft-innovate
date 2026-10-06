# Latest update: persistent population, Helvetica and Framer Motion

The app now opens the latest saved invoice window and displays database-wide totals with paginated records.
If the database is empty or only contains the original six demo invoices, it loads a clearly labelled
5,000-invoice synthetic test population, showing progress while analyzing ten batches of 500.
Use **Load 5,000 test invoices** to retry or reload that reproducible population. It is fictional data,
not MerchantShield invoice data or an invoice accuracy benchmark. Your original transaction dataset is retained.

CSV/JSON imports accept up to 5,000 invoices and 20 MB per file, processing bounded batches of 500.
Use multiple files for larger windows. JSON may provide real supplier history and policy.
Earlier batches may remain saved if a later batch fails; unchanged retries are idempotent.
The dashboard totals cover the entire selected window. Charts, search and severity/rule filters apply
only to the displayed page; use Previous/Next to inspect all saved records.

Helvetica is the first font choice, with Helvetica Neue and Arial fallbacks. Framer Motion powers page,
card, dialog and notification transitions and honors reduced-motion preferences. This is the only new
frontend dependency. The production build is included, so running the package still requires no Node.
Final review decisions and authentication remain partner-owned. Dataset throughput is recorded in
`validation/finsight-5000-invoices.json`; one-million-row throughput remains untested.

The following original guide describes the underlying cascade and budget design. Where its older
six-row demonstration or file-size limits differ, the update above takes precedence.

# FinSight: invoice fraud triage and bounded review

## Run on your Mac

Extract the updated ZIP into a fresh folder, preserving your partner's existing folder and database.
Run `bash setup.sh`, then `bash start.sh`. Open http://127.0.0.1:8000/ and enter the demo workspace.
Python 3.12 or 3.13 is required. The production React build is included; Node and retraining are unnecessary.
The existing transaction HGB workflow remains at `/reviews` and spending controls at `/commerce`.

## Core workflow

1. Validate schema and run caller-supplied rules, then exact/fuzzy invoice matching.
2. Keep rule violations and potential duplicates in the complete flagged list. They skip expensive ML fitting.
3. Early baseline clearance requires no configured violation, at least five strictly earlier supplier/currency records,
   an amount within three robust deviations, and description similarity at least 0.70 to an earlier supplier record.
4. Route all remaining unresolved cases to the ML stage. Isolation Forest executes only when at least 20 strictly
   earlier same-supplier/currency records exist. Missing history gets an explicit exception, never an automatic clearance.
5. Keep every analyzed invoice and its findings, compare evidence and assign the priority index.
6. Allocate REVIEW NOW tasks separately from MONITOR cases. Deferred flags remain in the database and audit trail.
7. After importing the complete population, freeze intake and finalize the queue before assigning human tasks.

The 70% early-stage / 30% ML split is a measured target. The interface displays the actual split and executed-model
count. It never throws away unresolved invoices to force 30%. Similar invoices can indicate duplicates;
similarity alone does not certify legitimacy. The baseline and matching thresholds are prototype rules.

## Priority formula and budget

`priority = amount_in_INR × signal_strength × recovery_fraction / review_cost_in_INR`

Signal strength is the invoice's 0–100 maximum-signal triage score divided by 100. It is **not a calibrated fraud
probability**, so this index is not expected loss or a savings estimate. Defaults are a caller-adjustable recovery
fraction of 0.5 and review cost of INR 100. Critical cases rank first, then the priority index, then score and invoice ID.
The monitoring queue prefers remaining medium cases, then exposure priority. Monitoring is not an additional human task.

Within one named window, default capacity is `ceil(distinct_invoice_count × 100 / 1,000,000)` for human review,
and the same separate capacity for monitoring. At one million invoices this means up to 100 human tasks and 100
monitors; at six invoices it rounds up to one of each. Repeated requests and additional uploads share the window
and do not reset its budget. The default window is `default`; supply `window_id` in JSON for an agreed separate period.
Policies must remain consistent within a window. Separate windows have separate budgets.

Import all batches before **Priority Review Queue → Freeze intake & finalize queue**. Before this step the allocation
is a preview that can change as more evidence arrives. Finalization freezes intake, making selected tasks stable.
New input requires a new window; exact retries remain accepted. Your partner owns task assignment and final review
outcomes. Critical cases outside the budget produce an explicit overflow warning. No deferred invoice is called cleared.

Only INR has a default conversion rate. Supply positive `review_policy.currency_to_inr` rates for other currencies.
Unpriced cases retain a currency warning and their evidence; monetary ranking is unavailable for them.

## Existing database reuse

The application reuses MerchantShield's SQLite engine and `backend/data/audit.db`. The transaction `audit_log` table
and its workflow are preserved. Three additive AP tables store named-window policy, complete current invoice evidence,
and immutable analysis events containing raw input plus the analysis snapshot. No replacement database is created for AP.
Invoice evidence survives restart. Hash-based request replay prevents duplicate population counts. Window allocation
is serialized in a SQLite transaction so concurrent uploads cannot independently allocate the same budget.

To keep using an existing local installation's database, preserve its `backend/data/audit.db` and back it up before
copying updated source/build files, or copy that database into the fresh package's `backend/data/` while the server
is stopped. Database files and your local business records are deliberately not included in the downloadable ZIP.

The **Audit Trail** displays paginated, persisted invoice evidence: findings, references, measured matching components,
ML routing/skipping reason, prior-history statistics, priority components, queue disposition, policy version and saved
timestamp. It also retains the existing transaction-audit view. Export applies to the displayed ledger page;
use the paginated API to retrieve every invoice. Original analysis snapshots remain in `ap_analysis_events`.
A database save failure is reported explicitly; the interface does not claim unsaved evidence is persisted.

Authentication, tenant authorization, reviewer identity, final approve/reject decisions and external BI remain your
partner's scope. Demo personas are presentation choices, not access-control roles. Review handoffs still explicitly
say `persisted: false` because they are proposed reviewer notes, even though analysis evidence itself is saved.
The AP Copilot is a deterministic evidence assistant; no conversational LLM is connected.

## API and integration

| Endpoint | Purpose |
|---|---|
| `GET /ap/demo` | Fictional six-invoice example and prior history |
| `POST /ap/analyze` | Analyze inputs and save complete evidence using the existing audit database |
| `POST /ap/import` | Validate CSV and analyze/save its rows |
| `GET /ap/audit` | Paginated persisted evidence; `window_id`, `limit`, `offset`, `tier` filters |
| `POST /ap/windows/{window_id}/finalize` | Freeze intake and finalize the population allocation |

JSON accepts `invoices`, optional `history`, `department_limits`, `watchlist_tax_ids`, `review_policy`, `window_id`.
An invoice requires `id`, `invoice_number`, `supplier`, `department`, `amount`, `date`, `description`.
Optional fields: `supplier_id`, `currency` (INR default; USD/EUR/ZAR), `po_number`, `tax_id`.
Dates use YYYY-MM-DD. Internal IDs must be unique across batch and history. Fraud labels and unknown fields are rejected.
Limits: 500 incoming invoices, 2,000 history records, 2 MB CSV text. The partner supplies candidate history per batch.
These limits keep the interactive prototype bounded; million-invoice scoring throughput has not been load-tested.
The per-million budget arithmetic is tested, not a claim that one API call accepts a million invoices.

`review_policy` fields: `reviews_per_million`, `monitors_per_million`, `review_cost_inr`, `recovery_fraction`,
`currency_to_inr`. Department limits are INR only. CSV imports use default policy and contain no external history;
use JSON to supply history, currency rates and a named window. Download the current input from Batch Ingestion.

Matching respects trusted supplier IDs and currency. For non-exact invoice numbers, candidates must fall within
14 days and 2% amount difference. Near matches require weighted similarity ≥0.78, description ≥0.55 and number ≥0.65.
Weights: invoice number 0.35, TF-IDF description 0.35, amount 0.20, date 0.10. Exact normalized supplier invoice-number
repetition remains reviewable when amount/date changes. Matching uses no future records; statistical and recurring
baseline evidence use strictly earlier dates. Isolation Forest fits 50 trees on log amounts with seed 42.

## Demonstration

The included six invoices produce five exceptions: one human review, one medium monitor, three deferred flagged
records and one baseline clearance. Four cases are resolved as rule/duplicate findings; one reaches and executes ML
(16.7%, rather than a forced 30%). Investigate Delta for the side-by-side duplicate evidence, Zenith for the amount
anomaly, Acme for the critical human task and Azure for medium monitoring. Open the audit trail to show saved evidence.
Finalize only after you finish importing the intended population.

## Responsibility and source boundaries

| Responsibility | Implemented scope |
|---|---|
| Member 1 | Validation, normalization, missing fields, supplied watchlist/limits and cascade gates |
| Member 2 | Exact/fuzzy duplicate blocking and measured component evidence |
| Member 3 | Prior-history anomaly evidence, unresolved-case ML and exposure/cost priority |
| Frontend | Enterprise workspace, complete flagged list, review/monitor queue, investigations and ledger |
| Database integration | Reuse existing MerchantShield engine; additive AP evidence/window tables |
| Partner | Auth/tenant boundaries, reviewer decisions, upstream invoice records and external BI |

The original MerchantShield seed-42 synthetic transaction dataset and LightGBM/SHAP artifacts remain included.
Its 212,960 transaction rows lack invoice numbers, descriptions, PO references and tax identifiers. They do not
train or validate this AP matching logic. The six AP invoices are fictional fixtures, not a real invoice dataset.
The calibrated transaction HGB remains separate from this unsupervised invoice amount model. No AP precision,
recall, real savings, commercial superiority or 200% improvement has been established.

## Changed files and validation

New policy/store files are `backend/invoice_priority.py`, `backend/services/invoice_audit.py` and
`tests/test_invoice_priority.py`. Updated AP integration is in `backend/invoices.py`, `backend/main.py`,
`frontend/src/FinSight.jsx`, `frontend/src/api/client.js`, the FinSight stylesheet, production `frontend/dist/`,
`START_HERE.md` and this guide. No dependency or upstream repository commit was added.

AP tests: **56 passed**. Full non-integration suite: **382 passed, 10 skipped, 6 deselected**.
Production build and new Python lint pass; frontend lint has two inherited warnings and zero new warnings.
Final verification results are in `validation/finsight-verification.json`. Startup, AP analysis, database reuse,
static frontend serving, queue finalization and persisted evidence after restart were checked with the real FastAPI
application. Million-row throughput and browser-to-live-Python transport are not verified. The included screenshot
shows the earlier duplicate UI verification; it is not proof of the new queue's live browser transport.
