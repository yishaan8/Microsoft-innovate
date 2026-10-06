# Commerce Guard: a working integration prototype

This adds a commerce authorization and review component to MerchantShield's existing FastAPI API. It reuses its frozen LightGBM model, transaction validation, feature engineering, SHAP explanations and fraud policy. SKU-only intents, deterministic spending scope, review rechecks and chained evidence follow the architectural ideas demonstrated by Praman; this is an independent Python implementation, not a port of its TypeScript control plane.

## What works

1. An operator creates a persisted, customer-bound mandate: merchant/category allowlists, per-order cap, total budget, approval threshold and expiry.
2. A caller proposes SKU and quantity. The server resolves prices in integer paise from a fixed catalog. Intent prices and other unknown fields are rejected.
3. The existing MerchantShield pipeline scores matching transaction context and produces SHAP reasons. Scope violations cannot be overridden by a favorable score.
4. Model BLOCK means DENIED. Risk step-up, fewer than five prior transactions, large orders, and all agent-token submissions require human review. Only trusted operator submissions can qualify for direct authorization. Supplied history is labeled unverified.
5. Pending and authorized decisions reserve budget. SQLite BEGIN IMMEDIATE serializes budget checks, insertion and review transitions. Rejection releases a reservation; approval rechecks expiry, revocation and available budget.
6. Identical request replay returns the existing receipt. Changed content under the same key or the same transaction under a new key returns 409. Reviews resolve once.
7. Receipts bind the decision to an intent digest, model version, reason code and evidence event hash. Evidence can be exported and checked against a retained head checkpoint.

All authorization states are **local decision labels**. No order is sent to Razorpay; no payment, refund or notification occurs. An authorized reservation remains consumed because there is no execution/reconciliation workflow.

## Run on macOS / Linux

From a prepared MerchantShield checkout with this patch applied:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
npm --prefix frontend ci
npm --prefix frontend run build
export COMMERCE_OPERATOR_TOKEN="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
export COMMERCE_AGENT_TOKEN="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
echo "$COMMERCE_OPERATOR_TOKEN"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/commerce and paste the operator token. Tokens are held in page memory; the demo does not store them in browser storage. The existing fraud dashboard is at `/`; API docs at `/docs`. Raw synthetic CSV generation is unnecessary for these request-based demos.

## Five-minute presentation

- Create a ₹1,000 food mandate with ₹500 per-order cap.
- Evaluate lunch: ₹250, cold-start context, PENDING_REVIEW. Show the fraud probability and real SHAP reasons.
- Approve: AUTHORIZED with HUMAN_APPROVED; execution remains NONE_DECISION_ONLY.
- Replay the same request: same receipt ID, no new budget reservation or evidence event.
- Evaluate three lunches: DENIED by TRANSACTION_LIMIT.
- Evaluate office goods: DENIED by CATEGORY_OUT_OF_SCOPE.
- Evaluate another lunch, revoke the mandate, then approve: DENIED by MANDATE_REVOKED.
- Verify and export the evidence; show the event hashes and retain the exported head separately.

Suggested explanation: “We combine behavioral fraud scoring with explicit spending authority. The fraud model estimates risk; deterministic controls enforce the allowed purchase; a human resolves uncertain cases; every decision receives an inspectable receipt.”

## Validation

```bash
python -m pytest tests/test_api.py tests/test_commerce.py tests/test_decision_engine.py tests/test_v2_hardening.py -q
npm --prefix frontend run lint
npm --prefix frontend run build
python -m ruff check backend/commerce.py tests/test_commerce.py
```

The combined targeted suite passed 140 tests (17 new commerce tests). It includes real-model scoring/SHAP, budget reservation and release, concurrent overspend prevention, concurrent replay, changed-content replay, transaction-ID reuse, identity/price mismatch, role checks, model outage, revocation and expiry before approval, restart persistence, evidence triggers and tampering. Frontend build passed; upstream frontend lint returns success with two pre-existing warnings. One pre-existing Starlette/httpx deprecation warning occurs during tests. No visual browser test was performed.

## Results and limits to state accurately

No model retraining was performed and no new precision/recall is claimed. Upstream synthetic results and real IEEE-CIS results are different experiments. In its README, MerchantShield reports 78.5% precision / 88.2% recall on its synthetic test set and 6.3% precision / 79.8% recall for a separately retrained real-data model. The runtime uses the upstream synthetic-data model. Your earlier optimized HGB artifact is not present in these two repositories and is not silently substituted.

The demonstrated contribution is the integrated control and review workflow, not a claim of new state-of-the-art fraud detection or invention of mandates, SHAP, or hash chains.

This is a local prototype component. It does not replace the team's planned React + Spring Boot + FastAPI + RabbitMQ + Azure Service Bus + Azure Front Door architecture: the FastAPI contract can be called by Spring Boot, but that distributed integration is not implemented here. The added UI is a small same-origin HTML demo alongside the existing React dashboard.

Mandates are stored under authenticated operator authority; they are not Ed25519-signed grants. Tokens are shared role credentials, not per-user identities. The catalog is a fixed demo catalog with no inventory management. Transaction history is caller-supplied; a production deployment must hydrate it from a trusted transaction store and bind the caller to a subject. Tokens must travel only over HTTPS outside localhost.

The hash chain detects event modification, and SQLite triggers reject normal event updates/deletes. It is not externally anchored or immutable against a database administrator. A full database rewrite, mutation of operational mandate/order tables, or rollback to a complete earlier snapshot requires external trusted checkpoints and stronger access controls. Compare exported evidence to a separately retained head; chain validity alone does not prove completeness. Receipt exports record decisions and explanations, not a full independently replayable execution transcript.

SQLite serializes requests and scoring occurs inside the write transaction, suitable for a small local demo, not a demonstrated high-throughput service. Data-retention limits and issuer-specific authentication remain deployment work. No live LLM agent, MCP bridge, AP2/ACP implementation, external payment execution, production security certification or scalability benchmark is claimed.

## Source attribution

- MerchantShield AI, KunalMK25: https://github.com/KunalMK25/merchantshield-ai · base commit f9a4333b4136d5d0dfcd3e4cfb018e07a3b3599f. Its existing code and model remain attributed to their original authors.
- Praman, Adwaith R Nair: https://github.com/Adwaith-R-Nair/Praman · reviewed policy, mandate types, architecture, README and license. Praman is MIT licensed. No Praman source is copied into this patch.

MerchantShield has no LICENSE file in the reviewed tree. The handoff provides our additions and a patch against the upstream checkout; it does not redistribute its full source/model or grant permission to relicense it. Preserve attribution and establish reuse permission before public redistribution.
