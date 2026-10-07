import { apiClient } from './client';
import { Invoice, InvoiceFilterParams, PaginatedResponse } from '../types/invoice';
import { MOCK_INVOICES } from './mockData';

const USE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

export const invoiceApi = {
  async getInvoices(params: InvoiceFilterParams = {}): Promise<PaginatedResponse<Invoice>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Invoice>>('/invoices', { params });
      return response.data;
    } catch (error) {
      if (USE_MOCK_FALLBACK) {
        let filtered = [...MOCK_INVOICES];
        
        if (params.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter(inv => 
            inv.invoiceNumber.toLowerCase().includes(s) ||
            inv.supplierName.toLowerCase().includes(s) ||
            inv.poNumber.toLowerCase().includes(s) ||
            inv.department.toLowerCase().includes(s)
          );
        }
        
        if (params.status && params.status !== 'ALL') {
          filtered = filtered.filter(inv => inv.status === params.status);
        }
        
        if (params.department) {
          filtered = filtered.filter(inv => inv.department === params.department);
        }
        
        if (params.hasExceptionsOnly) {
          filtered = filtered.filter(inv => inv.exceptionCount > 0);
        }

        const page = params.page || 1;
        const pageSize = params.pageSize || 10;
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        const start = (page - 1) * pageSize;
        const paginated = filtered.slice(start, start + pageSize);

        return {
          data: paginated,
          page,
          pageSize,
          totalItems,
          totalPages,
        };
      }
      throw error;
    }
  },

  async getInvoiceById(id: string): Promise<Invoice> {
    try {
      const response = await apiClient.get<Invoice>(`/invoices/${id}`);
      return response.data;
    } catch (error) {
      if (USE_MOCK_FALLBACK) {
        const found = MOCK_INVOICES.find(inv => inv.id === id || inv.invoiceNumber === id);
        if (found) return found;
        throw new Error(`Invoice not found for ID: ${id}`);
      }
      throw error;
    }
  },
};
