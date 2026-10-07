"""Bounded HGB search and daily queue evaluation, separate from serving model.

Run from project root: python -m ml.training.train_review_queue
"""

import argparse
import hashlib
import json
import platform
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss

from ml.data import generate_synthetic
from ml.evaluation.cost_model import CostAssumptions, expected_cost
from ml.evaluation.review_queue import allocate_reviews
from ml.features.build_features import FEATURE_COLUMNS, build_features
from ml.training.train_baseline import chronological_split


def calibrated_probabilities(model, calibrator, features):
    raw = np.clip(model.predict_proba(features[FEATURE_COLUMNS])[:, 1], 1e-8, 1 - 1e-8)
    logits = np.log(raw / (1 - raw)).reshape(-1, 1)
    return calibrator.predict_proba(logits)[:, 1]


def queue_metrics(rows, queue, assumptions):
    selected = (
        queue.set_index("transaction_id")["selected"]
        .reindex(rows["transaction_id"])
        .to_numpy(bool)
    )
    labels = rows["is_fraud"].to_numpy()
    amounts = rows["amount"].to_numpy()
    caught = selected & (labels == 1)
    total_value = float(amounts[labels == 1].sum())
    count = int(selected.sum())
    return {
        "reviews": count,
        "frauds_identified": int(caught.sum()),
        "false_alerts": int((selected & (labels == 0)).sum()),
        "precision": float(caught.sum() / count) if count else 0.0,
        "count_recall": float(caught.sum() / labels.sum()) if labels.sum() else 0.0,
        "fraud_value_identified": float(amounts[caught].sum()),
        "value_recall": float(amounts[caught].sum() / total_value)
        if total_value
        else 0.0,
        "negative_benefit_reviews": int(
            (queue["selected"] & queue["negative_expected_benefit"]).sum()
        ),
        "assumed_cost": expected_cost(
            labels, selected.astype(int), amounts, assumptions
        )["total_expected_cost"],
    }


def compare(rows, probabilities, capacity, assumptions):
    return {
        ranking: queue_metrics(
            rows,
            allocate_reviews(rows, probabilities, capacity, assumptions, ranking),
            assumptions,
        )
        for ranking in ("risk", "expected_loss")
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--raw", type=Path, default=Path("ml/data/raw_transactions.csv")
    )
    parser.add_argument("--output", type=Path, default=Path("ml/models/review_queue"))
    parser.add_argument("--capacity", type=int, default=50)
    parser.add_argument(
        "--fresh-seeds", type=int, nargs="+", default=[20261007, 20261008, 20261009]
    )
    args = parser.parse_args()
    if (
        args.capacity <= 0
        or len(args.fresh_seeds) != len(set(args.fresh_seeds))
        or 42 in args.fresh_seeds
    ):
        parser.error(
            "capacity must be positive and fresh seeds unique and different from development seed 42"
        )
    args.output.mkdir(parents=True, exist_ok=True)
    assumptions = CostAssumptions()
    data = build_features(pd.read_csv(args.raw))
    train, calibration, _ = chronological_split(data, 35, 40)
    _, validation, legacy_test = chronological_split(data, 40, 50)
    for name, split in (
        ("train", train),
        ("calibration", calibration),
        ("validation", validation),
    ):
        if split.empty or split["is_fraud"].nunique() != 2:
            raise ValueError(f"{name} must contain both label classes")
    trials = []
    best = None
    for leaves, iterations in ((15, 180), (31, 180), (15, 300), (31, 300)):
        model = HistGradientBoostingClassifier(
            max_leaf_nodes=leaves,
            max_iter=iterations,
            learning_rate=0.08,
            l2_regularization=2.0,
            class_weight="balanced",
            early_stopping=False,
            random_state=42,
        )
        model.fit(train[FEATURE_COLUMNS], train["is_fraud"])
        raw = np.clip(
            model.predict_proba(calibration[FEATURE_COLUMNS])[:, 1], 1e-8, 1 - 1e-8
        )
        calibrator = LogisticRegression(C=1e6, random_state=42)
        calibrator.fit(np.log(raw / (1 - raw)).reshape(-1, 1), calibration["is_fraud"])
        p = calibrated_probabilities(model, calibrator, validation)
        metrics = compare(validation, p, args.capacity, assumptions)
        trial = {
            "leaves": leaves,
            "iterations": iterations,
            "validation": metrics,
            "pr_auc": float(average_precision_score(validation["is_fraud"], p)),
            "brier_score": float(brier_score_loss(validation["is_fraud"], p)),
        }
        trials.append(trial)
        print(json.dumps(trial), flush=True)
        objective = metrics["expected_loss"]["assumed_cost"]
        if best is None or objective < best[0]:
            best = (objective, model, calibrator, trial)
    _, model, calibrator, selected_trial = best
    artifact = args.output / "hgb_review.pkl"
    joblib.dump(
        {
            "model": model,
            "calibrator": calibrator,
            "feature_columns": FEATURE_COLUMNS,
            "capacity_per_day": args.capacity,
            "cost_assumptions": vars(assumptions),
        },
        artifact,
    )
    report = {
        "scope": "Synthetic shadow-mode benchmark; not prevented losses or vendor superiority",
        "splits": {
            "training": "days 0-34",
            "calibration": "days 35-39",
            "selection": "days 40-49",
            "legacy_development_test": "days 50-59, already examined in prior project experiments",
        },
        "review_unit": "one transaction, uniform assumed review time, UTC daily batch",
        "capacity_per_day": args.capacity,
        "cost_assumptions": vars(assumptions),
        "versions": {
            "python": platform.python_version(),
            "sklearn": sklearn.__version__,
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "joblib": joblib.__version__,
        },
        "data_sha256": hashlib.sha256(args.raw.read_bytes()).hexdigest(),
        "model_sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
        "trials": trials,
        "selected": selected_trial,
        "development": compare(
            legacy_test,
            calibrated_probabilities(model, calibrator, legacy_test),
            args.capacity,
            assumptions,
        ),
        "fresh_streams": [],
    }
    # Model and capacity are frozen before any fresh stream is generated or inspected.
    for seed in args.fresh_seeds:
        generate_synthetic.RNG_SEED = seed
        raw_path = args.output / f"fresh_{seed}.csv"
        raw = generate_synthetic.generate(str(raw_path))
        features = build_features(raw)
        _, _, holdout = chronological_split(features, 40, 50)
        p = calibrated_probabilities(model, calibrator, holdout)
        metrics = compare(holdout, p, args.capacity, assumptions)
        entry = {
            "seed": seed,
            "transactions": len(holdout),
            "frauds": int(holdout["is_fraud"].sum()),
            "metrics": metrics,
            "pr_auc": float(average_precision_score(holdout["is_fraud"], p)),
            "brier_score": float(brier_score_loss(holdout["is_fraud"], p)),
            "raw_sha256": hashlib.sha256(raw_path.read_bytes()).hexdigest(),
        }
        report["fresh_streams"].append(entry)
        allocate_reviews(holdout, p, args.capacity, assumptions).to_csv(
            args.output / f"queue_{seed}.csv", index=False
        )
        (args.output / "benchmark.json").write_text(
            json.dumps(report, indent=2, allow_nan=False) + "\n"
        )
        print(json.dumps(entry), flush=True)
    pooled = {}
    for ranking in ("risk", "expected_loss"):
        entries = [stream["metrics"][ranking] for stream in report["fresh_streams"]]
        pooled[ranking] = {
            key: sum(entry[key] for entry in entries)
            for key in (
                "reviews",
                "frauds_identified",
                "false_alerts",
                "fraud_value_identified",
                "assumed_cost",
            )
        }
    report["pooled_fresh"] = pooled
    baseline_value = pooled["risk"]["fraud_value_identified"]
    report["value_lift_fraction"] = (
        pooled["expected_loss"]["fraud_value_identified"] / baseline_value - 1
        if baseline_value
        else None
    )
    (args.output / "benchmark.json").write_text(
        json.dumps(report, indent=2, allow_nan=False) + "\n"
    )


if __name__ == "__main__":
    main()
