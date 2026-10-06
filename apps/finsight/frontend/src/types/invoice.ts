export type InvoiceStatus = 'CLEARED' | 'FLAGGED' | 'UNDER_REVIEW' | 'ESCALATED' | 'APPROVED' | 'REJECTED';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  poMatch: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  department: string;
  amount: number;
  currency: string;
  invoiceDate: string;
  submissionDate: string;
  submissionHour: number;
  status: InvoiceStatus;
  riskScore: number; // 0.00 to 1.00
  exceptionCount: number;
  lineItems?: InvoiceLineItem[];
  paymentTerms?: string;
  vatAmount?: number;
  notes?: string;
}

export interface InvoiceFilterParams {
  search?: string;
  status?: InvoiceStatus | 'ALL';
  department?: string;
  minAmount?: number;
  maxAmount?: number;
  hasExceptionsOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
