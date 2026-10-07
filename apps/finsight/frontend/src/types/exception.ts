export type ExceptionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ExceptionRuleType = 
  | 'SUPPLIER_BLACKLIST'
  | 'SUPPLIER_RISK_THRESHOLD'
  | 'DUPLICATE_INVOICE'
  | 'INVALID_MISSING_FIELD'
  | 'UNUSUAL_SUBMISSION_HOUR'
  | 'LIMIT_EXCEEDED'
  | 'PO_AMOUNT_MISMATCH'
  | 'ROUND_TRIP_ANOMALY';

export type ExceptionStatus = 'OPEN' | 'UNDER_REVIEW' | 'ESCALATED' | 'APPROVED_OVERRIDE' | 'REJECTED' | 'DISMISSED';

export interface RuleViolationDetail {
  ruleCode: ExceptionRuleType;
  ruleName: string;
  severity: ExceptionSeverity;
  triggerReason: string;
  thresholdValue?: string | number;
  actualValue?: string | number;
  confidenceScore?: number;
}

export interface ExceptionItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierRiskScore: number;
  department: string;
  amount: number;
  currency: string;
  primaryRule: ExceptionRuleType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  createdAt: string;
  assignedTo?: string;
  
  // Explainable AI / Rule Engine output
  explanation: {
    what: string; // WHAT happened
    why: string[]; // WHY did it happen (evidence points)
    whatNext: string; // WHAT should the analyst do
  };
  
  violations: RuleViolationDetail[];
  
  // Contextual data
  duplicateOfInvoiceId?: string;
  blacklistSource?: string;
}

export interface ExceptionFilterParams {
  search?: string;
  severity?: ExceptionSeverity | 'ALL';
  rule?: ExceptionRuleType | 'ALL';
  status?: ExceptionStatus | 'ALL';
  department?: string;
  page?: number;
  pageSize?: number;
}

export interface ResolveExceptionPayload {
  exceptionId: string;
  action: 'APPROVE_OVERRIDE' | 'REJECT' | 'ESCALATE' | 'DISMISS';
  comment: string;
  escalateToRole?: string;
}
