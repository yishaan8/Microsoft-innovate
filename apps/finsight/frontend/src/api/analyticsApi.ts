import { apiClient } from './client';
import { DashboardSummary } from '../types/analytics';
import { MOCK_DASHBOARD_SUMMARY } from './mockData';

const USE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

export const analyticsApi = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const response = await apiClient.get<DashboardSummary>('/analytics/dashboard-summary');
      return response.data;
    } catch (error) {
      if (USE_MOCK_FALLBACK) {
        return MOCK_DASHBOARD_SUMMARY;
      }
      throw error;
    }
  },
};
