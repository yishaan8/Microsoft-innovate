import { ExceptionItem } from './exception';

export interface MetricCardData {
  title: string;
  value: string | number;
  change: number; // percentage change
  changeType: 'positive' | 'negative' | 'neutral';
  subtext?: string;
  trend?: number[];
}

export interface ExceptionsByRuleData {
  rule: string;
  displayName: string;
  count: number;
  atRiskAmount: number;
  percentage: number;
}

export interface DepartmentDistributionData {
  department: string;
  totalInvoices: number;
  flaggedCount: number;
  exceptionRate: number;
  atRiskAmount: number;
}

export interface ExceptionTrendData {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  cleared: number;
}

export interface TopRiskSupplierData {
  supplierId: string;
  supplierName: string;
  riskScore: number;
  totalInvoices: number;
  flaggedInvoices: number;
  totalVolume: number;
  topRuleTriggered: string;
  isBlacklisted: boolean;
}

export interface DashboardSummary {
  totalInvoices: number;
  totalExceptions: number;
  exceptionRate: number;
  highRiskExceptions: number;
  totalAtRiskAmount: number;
  averageResolutionHours: number;
  recentExceptions: ExceptionItem[];
  exceptionTrends: ExceptionTrendData[];
  exceptionsByRule: ExceptionsByRuleData[];
  departmentDistribution: DepartmentDistributionData[];
  topRiskSuppliers: TopRiskSupplierData[];
}
