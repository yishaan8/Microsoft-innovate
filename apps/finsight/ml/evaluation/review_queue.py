"""Deterministic daily review allocation. Labels never enter allocation."""

import numpy as np
import pandas as pd

from ml.evaluation.cost_model import CostAssumptions


def allocate_reviews(
    transactions: pd.DataFrame,
    probabilities,
    capacity_per_day: int,
    assumptions: CostAssumptions,
    ranking: str = "expected_loss",
) -> pd.DataFrame:
    """Rank within UTC calendar days; capacity is cases/day, not transactions/day.

    Equal review time and complete exposure per case are assumptions. This is a
    batch/shadow queue, not an online promise about unseen future transactions.
    Every row is one case; repeated customer transactions are not deduplicated.
    """
    if (
        isinstance(capacity_per_day, bool)
        or not isinstance(capacity_per_day, int)
        or capacity_per_day < 0
    ):
        raise ValueError("capacity_per_day must be a nonnegative integer")
    if ranking not in {"risk", "expected_loss"}:
        raise ValueError("ranking must be risk or expected_loss")
    if not np.isfinite([assumptions.fp_cost, assumptions.fn_cost_fraction]).all():
        raise ValueError("cost assumptions must be finite")
    if assumptions.fp_cost < 0 or not 0 <= assumptions.fn_cost_fraction <= 1:
        raise ValueError("invalid cost assumptions")
    out = transactions[["transaction_id", "timestamp", "amount"]].copy()
    if out["transaction_id"].isna().any() or out["transaction_id"].duplicated().any():
        raise ValueError("transaction IDs must be present and unique")
    out["transaction_id"] = out["transaction_id"].astype(str)
    if out["transaction_id"].duplicated().any():
        raise ValueError("transaction IDs must remain unique after normalization")
    out["timestamp"] = pd.to_datetime(out["timestamp"], utc=True, errors="raise")
    if out["timestamp"].isna().any():
        raise ValueError("timestamps must be present")
    amounts = out["amount"].to_numpy(dtype=float)
    p = np.asarray(probabilities, dtype=float)
    if p.shape != (len(out),) or not np.isfinite(p).all() or ((p < 0) | (p > 1)).any():
        raise ValueError("one finite probability in [0, 1] is required per row")
    if not np.isfinite(amounts).all() or (amounts <= 0).any():
        raise ValueError("amounts must be finite and positive in one currency")
    out["fraud_probability"] = p
    out["expected_net_benefit"] = (
        p * amounts * assumptions.fn_cost_fraction - (1 - p) * assumptions.fp_cost
    )
    out["priority"] = p if ranking == "risk" else out["expected_net_benefit"]
    out["review_day"] = out["timestamp"].dt.floor("D")
    out = out.sort_values(
        ["review_day", "priority", "transaction_id"], ascending=[True, False, True]
    )
    out["daily_rank"] = out.groupby("review_day").cumcount() + 1
    out["selected"] = out["daily_rank"] <= capacity_per_day
    # Always fill the same capacity for fair comparisons, including negative utility.
    # Expose this condition; deployments may choose to leave those slots unfilled.
    out["negative_expected_benefit"] = out["expected_net_benefit"] < 0
    return out


def main():
    """Score a complete historical batch without requiring fraud labels."""
    import argparse
    from pathlib import Path

    import joblib

    from ml.features.build_features import build_features
    from ml.training.train_review_queue import calibrated_probabilities

    parser = argparse.ArgumentParser(
        description="Score a historical batch into a daily review queue."
    )
    parser.add_argument("--raw", type=Path, required=True)
    parser.add_argument(
        "--model", type=Path, default=Path("ml/models/review_queue/hgb_review.pkl")
    )
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--capacity", type=int)
    args = parser.parse_args()
    # Joblib is pickle-based: load only a model artifact from a trusted source.
    bundle = joblib.load(args.model)
    features = build_features(pd.read_csv(args.raw))
    probabilities = calibrated_probabilities(
        bundle["model"], bundle["calibrator"], features
    )
    queue = allocate_reviews(
        features,
        probabilities,
        bundle["capacity_per_day"] if args.capacity is None else args.capacity,
        CostAssumptions(**bundle["cost_assumptions"]),
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    queue.to_csv(args.output, index=False)
    print(
        f"Wrote {len(queue)} transactions and {int(queue.selected.sum())} review selections to {args.output}"
    )


if __name__ == "__main__":
    main()
