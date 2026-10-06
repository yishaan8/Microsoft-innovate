import { apiClient } from './client';
import { ExceptionItem, ExceptionFilterParams, ResolveExceptionPayload } from '../types/exception';
import { PaginatedResponse } from '../types/invoice';
import { MOCK_EXCEPTIONS } from './mockData';

const USE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

export const exceptionApi = {
  async getExceptions(params: ExceptionFilterParams = {}): Promise<PaginatedResponse<ExceptionItem>> {
    try {
      const response = await apiClient.get<PaginatedResponse<ExceptionItem>>('/exceptions', { params });
      return response.data;
    } catch (error) {
      if (USE_MOCK_FALLBACK) {
        let filtered = [...MOCK_EXCEPTIONS];

        if (params.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter(exc => 
            exc.id.toLowerCase().includes(s) ||
            exc.invoiceNumber.toLowerCase().includes(s) ||
            exc.supplierName.toLowerCase().includes(s) ||
            exc.primaryRule.toLowerCase().includes(s) ||
            exc.department.toLowerCase().includes(s)
          );
        }

        if (params.severity && params.severity !== 'ALL') {
          filtered = filtered.filter(exc => exc.severity === params.severity);
        }

        if (params.rule && params.rule !== 'ALL') {
          filtered = filtered.filter(exc => exc.primaryRule === params.rule);
        }

        if (params.status && params.status !== 'ALL') {
          filtered = filtered.filter(exc => exc.status === params.status);
        }

        if (params.department) {
          filtered = filtered.filter(exc => exc.department === params.department);
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

  async getExceptionById(id: string): Promise<ExceptionItem> {
    try {
      const response = await apiClient.get<ExceptionItem>(`/exceptions/${id}`);
      return response.data;
    } catch (error) {
      if (USE_MOCK_FALLBACK) {
        const found = MOCK_EXCEPTIONS.find(exc => exc.id === id || exc.invoiceId === id);
        if (found) return found;
        throw new Error(`Exception not found for ID: ${id}`);
      }
      throw error;
    }
  },

  async resolveException(payload: ResolveExceptionPayload): Promise<{ success: boolean; message: string; updatedException?: ExceptionItem }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string; updatedException?: ExceptionItem }>(
        `/exceptions/${payload.exceptionId}/resolve`,
        payload
      );
      return response.data;
    } catch (error) {
      if (USE_MOCK_FALLBACK) {
        const index = MOCK_EXCEPTIONS.findIndex(e => e.id === payload.exceptionId);
        if (index !== -1) {
          const statusMap: Record<string, any> = {
            APPROVE_OVERRIDE: 'APPROVED_OVERRIDE',
            REJECT: 'REJECTED',
            ESCALATE: 'ESCALATED',
            DISMISS: 'DISMISSED',
          };
          MOCK_EXCEPTIONS[index].status = statusMap[payload.action] || 'UNDER_REVIEW';
          return {
            success: true,
            message: `Exception ${payload.exceptionId} successfully transitioned to ${MOCK_EXCEPTIONS[index].status}`,
            updatedException: MOCK_EXCEPTIONS[index],
          };
        }
        return { success: true, message: 'Action registered in mock state' };
      }
      throw error;
    }
  },
};
