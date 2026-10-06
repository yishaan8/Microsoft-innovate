import { apiClient } from './client';
import { ManagedUser } from '../types/user';
import { MOCK_MANAGED_USERS } from './mockData';

const USE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

export const userApi = {
  async getUsers(): Promise<ManagedUser[]> {
    try {
      const response = await apiClient.get<ManagedUser[]>('/users');
      return response.data;
    } catch (error) {
      if (USE_MOCK_FALLBACK) {
        return MOCK_MANAGED_USERS;
      }
      throw error;
    }
  },

  async updateUserRole(userId: string, role: string): Promise<ManagedUser> {
    try {
      const response = await apiClient.patch<ManagedUser>(`/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      if (USE_MOCK_FALLBACK) {
        const found = MOCK_MANAGED_USERS.find(u => u.id === userId);
        if (found) {
          found.role = role as any;
          return found;
        }
        throw new Error('User not found');
      }
      throw error;
    }
  },
};
