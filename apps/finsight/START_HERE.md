# CommerceGuard — complete local project

## FinSight frontend update — start here

The default page now recreates the supplied FinSight recording: dark sidebar, invoice explorer,
exception workbench, investigation dialog, charts, audit view and evidence assistant.
Read `FINSIGHT_GUIDE.md` for the implemented Member 1/2/3 scope and your partner's API handoff.

Extract this updated package into a **new folder**, keeping your existing Desktop folder intact.
Run `bash setup.sh`, then `bash start.sh` from this folder and open http://127.0.0.1:8000/.
Choose a demo persona and click **Enter demo workspace**. The latest saved invoice window loads automatically. Empty/six-demo databases load the labelled 5,000-row synthetic test population with progress.
Node is not needed to run the included production frontend.

Invoice analysis now saves its complete evidence into MerchantShield's existing `backend/data/audit.db`.
The priority queue shares a budget across uploads: 100 human reviews plus 100 monitoring cases per million
distinct invoices in a named window. Small windows round upward. Import all batches, then open
**Priority Review Queue** and **Freeze intake & finalize queue** before assigning human tasks.
Rules/fuzzy matching and a recurring-invoice baseline gate precede unresolved-case ML.
The observed split is displayed; 70/30 is a target, never a discard quota.
Authentication and final reviewer decisions remain your partner's work. Demo personas do not enforce permissions.

The following sections describe the previously included CommerceGuard workflows, which remain available.

This folder contains the whole runnable local application: the original MerchantShield fraud model and SHAP dashboard, the trained HGB review model, persistent review operations, spending controls, evidence receipts, source code, datasets, benchmarks and tests. No repository clone, patch application, model training or frontend build is required to run the included demo.

## Start on your Mac

Extract `CommerceGuard-Complete.zip` on your Desktop. Open Terminal and run commands one at a time:

```bash
cd ~/Desktop/CommerceGuard-Complete
bash setup.sh
bash start.sh
```

Python 3.12 or 3.13 is required. If needed, install the Mac prerequisites first:

```bash
brew install python@3.12 libomp
```

Setup needs internet to install Python dependencies. The built React frontend is included, so Node/npm is unnecessary for running the downloaded package. Setup is repeatable after an interrupted dependency installation. Start checks dependencies and the HGB artifact before printing the URL and a fresh operator token. Keep Terminal running.

Open http://127.0.0.1:8000/reviews and paste the printed operator token. Click **Load included dataset**. The included sample contains 3,826 transactions for the first 40 customers in MerchantShield's seed-42 generator snapshot. Customer ID, not fraud label, selects this demonstration. It is not a new performance benchmark.

## Five-minute demonstration

1. Load the included dataset. Show daily capacity, selected case count and negative-benefit cases.
2. Open a case. Explain probability, amount, daily rank, historical feature values and cost assumptions. These HGB feature values are context, not SHAP attribution.
3. Enter a reviewer name and note. Choose suspected fraud, legitimate or inconclusive, and record the decision. A closed case cannot be resolved twice. Download its receipt.
4. Reload the page, reconnect using the token and show the persisted case under CLOSED. Stop and restart the app to demonstrate persistence; use the new printed token.
5. Export the batch and evidence chain. The record contains model, dataset and policy hashes. Independent retention of a checkpoint is required to detect complete chain replacement.
6. Follow **Spending controls & receipts**. Create a mandate and show valid purchase review, request replay, spending-limit denial and revocation before approval.
7. Open **Transaction risk & SHAP**. Use the existing dashboard's synthetic scenarios to show LightGBM scoring, bounded policy decisions and SHAP explanations.

## Your project in one sentence

CommerceGuard helps an enterprise spend limited human-review capacity on financial exposure, while keeping authorization boundaries and inspectable decision evidence.

The batch HGB and transaction LightGBM serve different purposes. The HGB is calibrated and used for loss-aware queue ranking. The existing LightGBM is used for individual risk decisions and SHAP explanations. Their probabilities and metrics must not be mixed into one accuracy claim.

## Dataset and measured evidence

The data comes from `KunalMK25/merchantshield-ai`'s synthetic transaction generator, not a real enterprise dataset. `ml/data/raw_transactions.csv` contains the exact 212,960-row development snapshot, with 3,200 fraud labels. `DATASET_PROVENANCE.json` records the upstream source and snapshot hash. The generator is included unchanged.

The HGB was trained on days 0–34, calibrated on days 35–39 and selected on days 40–49. The final ten days of that original stream are development evidence because they had been examined earlier. Three newly generated streams provide the separate frozen synthetic evaluation.

Across those streams and identical 1,500 reviews, loss ranking identified 4.01% more fraud value and lowered assumed error cost by 33.68% compared with risk ranking. Precision fell from 70.33% to 61.27%; false alerts increased from 445 to 581. Assumptions: 50% unrecoverable fraud amount and ₹50 false-alert cost. No 200% improvement, realized savings or commercial-vendor superiority has been measured.

Read `docs/REVIEW_ARCHITECTURE.md` for architecture and tradeoffs, `VERIFICATION.md` for validation, and `ml/models/review_queue/benchmark.json` for complete results. Original MerchantShield documentation remains in `README.md` and `docs/` for source context.

## CSV imports and history

The review screen accepts a CSV with the raw transaction columns shown in `ml/models/review_queue/web_demo_transactions.csv`. Amounts are in INR. Naive timestamps are interpreted as UTC; explicit offsets are normalized to UTC. Optional `is_fraud` values are discarded before scoring and case creation. Engineered features are rejected.

Upload at most 10,000 rows and 2 MB of CSV text. Include earlier customer history. The optional review-from date excludes earlier rows from allocation while retaining them for feature computation. Same-customer equal timestamps and duplicate transaction IDs are rejected. Daily capacity counts transactions, not grouped investigations or reviewer minutes.

A review day belongs to one frozen batch in this local workspace. Exact retries return the same batch; another batch covering the same review day returns a conflict. Closing a case does not release its already-used review slot. The full 212,960-row snapshot is for offline training and analysis; use the provided small sample for web import.

## Reproduce and develop

Activate the installed environment:

```bash
source .venv/bin/activate
python -m pytest tests/ -m 'not integration' -q
python -m ml.training.train_review_queue --output ml/models/review_queue/rerun
```

The test suite generates `ml/data/features.csv` if needed. The training command runs the four-candidate search and new streams without overwriting the packaged evidence. Seeds reproduce statistical simulation; UUIDs prevent byte-identical regenerated CSVs. Supplied raw snapshots preserve the original hashes.

For React edits, use Node.js 22.12+:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
npm --prefix frontend run lint
```

The Dockerfile and compose configuration are included as optional packaging. Set strong `COMMERCE_OPERATOR_TOKEN` and `COMMERCE_AGENT_TOKEN` environment variables before `docker compose up --build`. Container execution was not validated in this environment.

## Scope

This completes the local decision-and-review application. No live payments, refunds or automatic financial execution occur. Risk endpoints inherited from MerchantShield retain prototype access behavior; commerce and review endpoints require separate operator/agent tokens. Bind locally, as `start.sh` does. Reviewer dispositions are explicitly unverified and are not used to retrain the model.

The previously discussed enterprise deployment using Spring Boot, Azure Front Door, RabbitMQ and Azure Service Bus is a target architecture, not a deployed part of this folder. Enterprise SSO, tenant isolation, adjudicated real data, streaming allocation and deployment/load testing remain outside the completed local prototype.

Source attribution: https://github.com/KunalMK25/merchantshield-ai . Spending-control design inspiration: https://github.com/Adwaith-R-Nair/Praman . The commerce extension and HGB review workflow are independent additions; no changes were pushed to either upstream repository.
