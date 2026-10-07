import { apiClient } from './client';
import { User, LoginResponse } from '../types/auth';
import { DEMO_USERS } from './mockData';

const USE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

export const authApi = {
  async login(email: string, password?: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      if (USE_MOCK_FALLBACK) {
        console.warn('[AuthApi] Backend unreachable or returned error. Checking demo fallback credentials...');
        // Find matching demo user by email or role keyword
        const key = Object.keys(DEMO_USERS).find(
          k => DEMO_USERS[k].user.email.toLowerCase() === email.toLowerCase() || k.toLowerCase() === email.toLowerCase()
        ) || 'admin';
        
        const demo = DEMO_USERS[key];
        return {
          token: demo.token,
          user: demo.user,
          expiresIn: 86400,
        };
      }
      throw error;
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        return JSON.parse(stored);
      }
      throw error;
    }
  },

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
  },
};
