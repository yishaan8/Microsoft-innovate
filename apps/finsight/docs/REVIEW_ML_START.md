# CommerceGuard ML: run the completed batch core

This standalone package needs Python 3.12. It does not need Homebrew LightGBM, SHAP, an LLM or a running web server. It extends the earlier CommerceGuard project but does not replace its web application.

Open Terminal in the extracted `CommerceGuard-ML` folder. Run each command separately:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-ml.txt
python -m ml.evaluation.review_queue --raw ml/models/review_queue/demo_transactions.csv --output demo_queue.csv
```

The included artifact is already trained. Open `demo_queue.csv` in Excel or Numbers, filter `selected` to TRUE and inspect daily rank, probability and expected net benefit. This sample input has no fraud-label column. It is a smoke demo, not the evaluation dataset.

Read `ARCHITECTURE.md` for the focused product architecture and measured results. `ml/models/review_queue/benchmark.json` has the full evidence. `queue_20261007.csv`, `queue_20261008.csv` and `queue_20261009.csv` are the actual evaluation queue exports.

To reproduce the full four-candidate search and three fresh evaluations:

```bash
python -m ml.training.train_review_queue --raw ml/data/raw_transactions.csv --output ml/models/review_queue/rerun
```

This takes longer than the demo. Numeric seeds reproduce the statistical simulation, while generator UUIDs make raw file byte hashes differ on regeneration. The supplied exact raw snapshots retain the original benchmark evidence. Use a separate output folder to preserve the packaged results.

To score your own historical batch, use the same raw observable schema as the demo file. Include enough earlier customer history to calculate behavioral features. Labels are unnecessary:

```bash
python -m ml.evaluation.review_queue --raw your_transactions.csv --output your_queue.csv --capacity 50
```

This creates a batch queue for every UTC day in the input. It is not a real-time allocation guarantee. Use a trusted model artifact only: joblib files can execute Python code when loaded.

Run the focused verification:

```bash
python -m pytest tests/test_review_queue.py -q
python -m ruff check ml/evaluation/review_queue.py ml/training/train_review_queue.py tests/test_review_queue.py
```

Source reuse: transaction generation, feature engineering, chronological splits and cost assumptions originate in KunalMK25/merchantshield-ai (https://github.com/KunalMK25/merchantshield-ai). The broader commerce demo uses controls inspired by Adwaith-R-Nair/Praman (https://github.com/Adwaith-R-Nair/Praman). This standalone ML package does not include Praman's TypeScript code. The trained HGB queue, calibration and benchmark were added for this project. Check upstream licensing before public redistribution.
