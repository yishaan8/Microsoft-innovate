import { ExceptionRuleType, ExceptionSeverity, ExceptionStatus } from '../types/exception';
import { InvoiceStatus } from '../types/invoice';
import { UserRole } from '../types/auth';

export const APP_NAME = "FinSight AP Intelligence";
export const APP_SUBTITLE = "Enterprise Accounts Payable Risk & Exception Detection Engine";

export const RULE_METADATA: Record<ExceptionRuleType, { label: string; description: string; defaultSeverity: ExceptionSeverity }> = {
  SUPPLIER_BLACKLIST: {
    label: 'Supplier Sanctions Watchlist Hit',
    description: 'Supplier Tax ID or entity name matched on OFAC / AML corporate embargo registry.',
    defaultSeverity: 'CRITICAL',
  },
  SUPPLIER_RISK_THRESHOLD: {
    label: 'HistGradientBoosting Risk Threshold Exceeded',
    description: 'Composite risk score evaluated above acceptable tolerance threshold (0.80).',
    defaultSeverity: 'HIGH',
  },
  DUPLICATE_INVOICE: {
    label: 'TF-IDF Near-Duplicate Collision',
    description: 'Line item text similarity (>95%) and amount collision matching prior settlement.',
    defaultSeverity: 'HIGH',
  },
  INVALID_MISSING_FIELD: {
    label: 'Mandatory GSTIN / Tax ID Format Invalid',
    description: 'Missing statutory GSTIN registration or invalid HSN classification code.',
    defaultSeverity: 'MEDIUM',
  },
  UNUSUAL_SUBMISSION_HOUR: {
    label: 'Anomalous Submission Window',
    description: 'Invoice submitted outside standard corporate ingestion hours (08:00–20:00 IST).',
    defaultSeverity: 'LOW',
  },
  LIMIT_EXCEEDED: {
    label: 'Department Authorization Cap Exceeded',
    description: 'Invoice amount breaches single-invoice limit without executive dual-approval token.',
    defaultSeverity: 'HIGH',
  },
  PO_AMOUNT_MISMATCH: {
    label: 'Line Item Surcharge Variance',
    description: 'Invoice total diverges from approved Purchase Order commitment.',
    defaultSeverity: 'MEDIUM',
  },
  ROUND_TRIP_ANOMALY: {
    label: 'Split-Billing Anomaly',
    description: 'Sequential invoices structured just beneath single-signature approval thresholds.',
    defaultSeverity: 'HIGH',
  },
};

// Institutional, Muted Severity Palette (Subtle, High-Trust, Non-Cartoonish)
export const SEVERITY_COLORS: Record<ExceptionSeverity, { bg: string; text: string; border: string; badge: string; dot: string }> = {
  CRITICAL: {
    bg: 'bg-rose-50/70',
    text: 'text-rose-800',
    border: 'border-rose-200',
    badge: 'bg-rose-50 text-rose-800 border-rose-200/80 font-semibold',
    dot: 'bg-rose-600',
  },
  HIGH: {
    bg: 'bg-amber-50/70',
    text: 'text-amber-900',
    border: 'border-amber-200',
    badge: 'bg-amber-50 text-amber-900 border-amber-200/80 font-semibold',
    dot: 'bg-amber-600',
  },
  MEDIUM: {
    bg: 'bg-slate-50',
    text: 'text-slate-800',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-800 border-slate-200 font-semibold',
    dot: 'bg-slate-500',
  },
  LOW: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    badge: 'bg-slate-50 text-slate-600 border-slate-200 font-medium',
    dot: 'bg-slate-400',
  },
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, { badge: string; dot: string }> = {
  CLEARED: { badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-600' },
  FLAGGED: { badge: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-600' },
  UNDER_REVIEW: { badge: 'bg-amber-50 text-amber-900 border-amber-200', dot: 'bg-amber-600' },
  ESCALATED: { badge: 'bg-purple-50 text-purple-900 border-purple-200', dot: 'bg-purple-600' },
  APPROVED: { badge: 'bg-slate-100 text-slate-800 border-slate-200', dot: 'bg-slate-700' },
  REJECTED: { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

export const ROLE_BADGES: Record<UserRole, { label: string; badge: string }> = {
  ADMIN: { label: 'Administrator', badge: 'bg-slate-900 text-white border-slate-900' },
  ANALYST: { label: 'AP Analyst', badge: 'bg-slate-100 text-slate-800 border-slate-300' },
  AUDITOR: { label: 'Internal Auditor', badge: 'bg-slate-100 text-slate-800 border-slate-300' },
};
