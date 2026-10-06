export type UserRole = 'ADMIN' | 'ANALYST' | 'AUDITOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresIn?: number;
}
