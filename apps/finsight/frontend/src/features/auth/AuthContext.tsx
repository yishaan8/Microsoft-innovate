import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, UserRole } from '../../types/auth';
import { authApi } from '../../api/authApi';

interface AuthContextType extends AuthState {
  login: (email: string, password?: string) => Promise<void>;
  switchRole: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Initial bootstrap check from localStorage
    try {
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('currentUser');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to parse cached auth state:', e);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('currentUser');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, password);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('accessToken', res.token);
      localStorage.setItem('currentUser', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = (newRole: UserRole) => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      role: newRole,
      department: newRole === 'ADMIN' ? 'Enterprise AP Operations' : newRole === 'ANALYST' ? 'Finance & Accounts Payable' : 'Internal Audit & Compliance',
    };
    setUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  const logout = () => {
    authApi.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        switchRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
