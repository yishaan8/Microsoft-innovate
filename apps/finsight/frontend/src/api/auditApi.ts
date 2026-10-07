import { apiClient } from './client';
import { AuditLogEntry } from '../types/audit';
import { MOCK_AUDIT_LOGS } from './mockData';

const USE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

export const auditApi = {
  async getAuditLogs(params: { targetId?: string; targetType?: string } = {}): Promise<AuditLogEntry[]> {
    try {
      const response = await apiClient.get<AuditLogEntry[]>('/audit/logs', { params });
      return response.data;
    } catch (error) {
      if (USE_MOCK_FALLBACK) {
        let logs = [...MOCK_AUDIT_LOGS];
        if (params.targetId) {
          logs = logs.filter(l => l.targetId === params.targetId);
        }
        return logs;
      }
      throw error;
    }
  },

  async logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    try {
      const response = await apiClient.post<AuditLogEntry>('/audit/logs', entry);
      return response.data;
    } catch (error) {
      if (USE_MOCK_FALLBACK) {
        const newEntry: AuditLogEntry = {
          ...entry,
          id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toISOString(),
        };
        MOCK_AUDIT_LOGS.unshift(newEntry);
        return newEntry;
      }
      throw error;
    }
  },
};
