# CommerceGuard verification

The user flow is a historical CSV import → calibrated HGB scoring → fixed daily review queue → reviewer disposition → persisted evidence receipt. It shares the existing CommerceGuard store and runs beside the original LightGBM/SHAP risk screen and spending-control demo.

| Boundary | Result | Evidence |
|---|---|---|
| Application startup | Passed | LightGBM loaded; HGB hash verified; SQLite initialized |
| UI assets served | Passed | `/`, `/commerce`, `/reviews` returned HTTP 200; React production build passed |
| UI JavaScript syntax | Passed | Both static page scripts passed `node --check` |
| Web review API | Passed | 13 focused tests: import, label exclusion, capacity, concurrent mutations, pagination, restart persistence, auth, invalid inputs, tampering |
| Dataset → model → queue | Passed | Live HTTP import scored 3,826 MerchantShield demo rows and selected 180 cases over 60 UTC days at 3/day |
| Reviewer decision → evidence | Passed | Live HTTP resolution returned CLOSED; batch exported all 180 receipts; evidence chain valid |
| Complete extracted application regression | Passed | Final run in a clean installed environment: 326 passed, 10 skipped, 6 external-data tests deselected |
| Python lint | Passed | New queue, training, review API and test modules passed Ruff |
| Frontend lint | Completed with existing warnings | Two warnings: unused `catMeta` and state updates in an effect |
| Setup and start scripts | Passed | Fresh extraction, clean `.venv`, `setup.sh`, `start.sh`, both models loaded and actual server restart preserved a closed case |
| Visual browser interactions | Unperformed | Browser download failed in the execution environment; no visual/browser claim is made |
| Docker and Azure deployment | Unperformed | Included Docker configuration and enterprise architecture are not deployment evidence |

`LIVE_DEMO_RESULTS.json` contains the live HTTP batch summary, actual resolved case receipt and evidence checkpoint. `DATASET_PROVENANCE.json` identifies the unchanged MerchantShield generator and the exact training snapshot. `ml/models/review_queue/benchmark.json` records the four model candidates and all fresh-stream evaluation results.

The frozen synthetic benchmark remains separate from the demonstration sample. Review outcomes are unverified human dispositions, not ground-truth training labels. Financial costs and review effort are assumptions. No new real-data performance or vendor comparison is claimed.

## Changes and purpose

- `backend/reviews.py`, `backend/reviews.html`: connect the ML core to import, persistent cases, review and evidence export.
- `backend/main.py`: initialize the review model/tables and register routes before static frontend serving.
- `backend/commerce.html`, `frontend/src/App.jsx`: connect the three screens and identify the combined project.
- `ml/evaluation/review_queue.py`, `ml/training/train_review_queue.py`, model/data artifacts: loss-aware allocation, training/calibration and reproducible evidence.
- `tests/test_review_queue.py`, `tests/test_reviews_api.py`: verify numerical policy and success/failure application flows.
- `requirements.txt`, `setup.sh`, `start.sh`: use the tested dependency versions, compatible Python and included frontend.
- Docker configuration: retain the packaged dataset, exclude large derived artifacts and bind published ports locally with required tokens.
- `START_HERE.md`, architecture, provenance and result documents: provide executable instructions, scope and inspectable evidence.

No changes were pushed to either source repository.
