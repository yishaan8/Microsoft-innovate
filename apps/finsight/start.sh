#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -x .venv/bin/python ]]; then
  echo "Run bash setup.sh first."
  exit 1
fi
if ! .venv/bin/python -c 'import uvicorn, fastapi, lightgbm, shap, sqlalchemy; from backend.reviews import load_review_model; load_review_model()'; then
  echo "Dependencies or model artifacts are unavailable. Finish bash setup.sh first."
  exit 1
fi
export OMP_NUM_THREADS="${OMP_NUM_THREADS:-4}"
export OPENBLAS_NUM_THREADS="${OPENBLAS_NUM_THREADS:-4}"
export COMMERCE_OPERATOR_TOKEN="${COMMERCE_OPERATOR_TOKEN:-$(.venv/bin/python -c 'import secrets; print(secrets.token_urlsafe(32))')}"
export COMMERCE_AGENT_TOKEN="${COMMERCE_AGENT_TOKEN:-$(.venv/bin/python -c 'import secrets; print(secrets.token_urlsafe(32))')}"
echo "FinSight workspace: http://127.0.0.1:8000/"
echo "Existing HGB capacity review queue: http://127.0.0.1:8000/reviews"
echo "Operator token: $COMMERCE_OPERATOR_TOKEN"
echo "Spending controls: http://127.0.0.1:8000/commerce"
echo "Transaction model and SHAP: choose Transaction Risk & SHAP in FinSight"
exec .venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
