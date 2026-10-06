export type AuditAction = 
  | 'RULE_ENGINE_DETECTED'
  | 'ANALYST_ASSIGNED'
  | 'ANALYST_REVIEWED'
  | 'ESCALATED_TO_RISK_TEAM'
  | 'OVERRIDE_APPROVED'
  | 'INVOICE_REJECTED'
  | 'SYSTEM_RULE_UPDATED'
  | 'SUPPLIER_BLACKLISTED'
  | 'EXCEPTION_DISMISSED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  action: AuditAction;
  targetType: 'INVOICE' | 'EXCEPTION' | 'SUPPLIER' | 'RULE' | 'USER';
  targetId: string;
  previousState?: string;
  newState?: string;
  details: string;
  ipAddress?: string;
  hashSignature?: string;
}
