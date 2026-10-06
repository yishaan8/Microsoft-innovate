#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
runtime_python="${COMMERCE_PYTHON:-}"
if [[ -z "$runtime_python" ]]; then
  for candidate in python3.12 python3.13 python3; do
    if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; raise SystemExit(not ((3,12) <= sys.version_info[:2] < (3,14)))' 2>/dev/null; then
      runtime_python="$candidate"
      break
    fi
  done
fi
if [[ -z "$runtime_python" ]] || ! "$runtime_python" -c 'import sys; raise SystemExit(not ((3,12) <= sys.version_info[:2] < (3,14)))' 2>/dev/null; then
  echo "Python 3.12 or 3.13 is required. On macOS: brew install python@3.12 libomp"
  exit 1
fi
if [[ -x .venv/bin/python ]] && ! .venv/bin/python -c 'import sys; raise SystemExit(not ((3,12) <= sys.version_info[:2] < (3,14)))'; then
  echo "Existing .venv uses an incompatible Python. Create a compatible environment before retrying."
  exit 1
fi
"$runtime_python" -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
if ! .venv/bin/python -c 'import lightgbm, shap'; then
  echo "LightGBM/SHAP cannot load. On macOS, install OpenMP with: brew install libomp"
  exit 1
fi
.venv/bin/python -c 'from backend.reviews import load_review_model; load_review_model(); print("HGB review model verified")'
if [[ ! -f frontend/dist/index.html ]]; then
  echo "Built frontend is missing. Install Node.js 22.12+ and run npm --prefix frontend ci, then npm --prefix frontend run build."
  exit 1
fi
echo "Setup complete. Run: bash start.sh"
