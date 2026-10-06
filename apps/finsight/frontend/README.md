# FinSight AP — Accounts Payable Exception Intelligence (Frontend)

> **Microsoft Innovate Project** | **Member 6 (Frontend / React)**

A modern, high-performance React + TypeScript enterprise web application designed for Accounts Payable (AP) departments, risk officers, and auditors. It provides continuous surveillance, explainable AI rule detection, and an investigation workbench for invoices and vendor anomalies.

---

## 🚀 Key Features

### 1. 🛡️ Role-Based Access Control (RBAC) & JWT Bearer Auth
- Roles: `ADMIN`, `ANALYST`, `AUDITOR`.
- Role-specific navigation routing and 403 Forbidden Access Denied screens.
- Centralized Axios interceptor automatically attaching `Authorization: Bearer <token>` and handling `401 Unauthorized` token expiry.
- Live persona switcher in top navigation for rapid testing and evaluation.

### 2. 📊 AP Operations & Executive Dashboard
- **5 KPI Metric Cards**: Total Invoices, Flagged Exceptions, Exception Rate %, High-Risk Exceptions, and At-Risk Capital.
- **Interactive Recharts Visualizations**:
  - 7-Day Ingestion Velocity & Severity Trend (Critical, High, Medium, Low).
  - Exceptions by Automated Rule Type (Horizontal bar chart).
  - Department Risk Exposure (Donut distribution chart).
  - Top High-Risk Suppliers Under Surveillance.
- **Active Exceptions Feed**: Direct action buttons to jump into investigation.

### 3. 📑 Invoice Explorer
- Search across invoice numbers, PO references, supplier names, and departments.
- Status filters (`FLAGGED`, `CLEARED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`).
- Detailed slide-out drawer displaying line items, 3-way PO match status, and risk telemetry.

### 4. 🔍 Explainable Exception Workbench (What / Why / What Next)
- Every exception answers the three vital questions:
  1. **WHAT happened?** — Ingestion context and violation triggers.
  2. **WHY did it happen?** — Exact evidence points, rule confidence score, sanctions/database match.
  3. **WHAT should I do next?** — Prescribed protocol and actionable buttons.
- **One-Click Actions**:
  - *Approve with Override*
  - *Reject Invoice*
  - *Escalate to Risk / Legal*
  - *Dismiss (False Positive)*
- Automatic audit log creation upon action execution.

### 5. 📜 Immutable Audit Trail
- Chronological timeline tracking every rule engine event, analyst review, override, and state transition.
- Tamper-resistant metadata with actors, targets, before/after states, and justifications.

### 6. 👥 User & Permission Management (Admin)
- View team members, active exception workloads, and dynamically modify RBAC roles.

---

## 🛠️ Technology Stack

- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS, Lucide Icons
- **Charts**: Recharts
- **HTTP Client**: Axios (with centralized request/response interceptors)
- **Routing**: React Router DOM v6

---

## 💻 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file or modify existing `.env`:
```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_ENABLE_MOCK_FALLBACK=true
```

### 3. Start Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```

---

## 🔐 Demo Credentials (Instant 1-Click Login)

| Persona | Email | Password | Role Permissions |
| :--- | :--- | :--- | :--- |
| **Analyst** | `analyst@finsight.microsoft.com` | `password123` | Dashboard, Invoices, Exceptions Workbench, Analytics |
| **Admin** | `admin@finsight.microsoft.com` | `password123` | Full Access (Dashboard, Invoices, Exceptions, Analytics, Users, Audit) |
| **Auditor** | `auditor@finsight.microsoft.com` | `password123` | Dashboard, Invoices (Read-only), Audit Trail |
