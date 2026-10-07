import axios, { AxiosError } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized 401 / 403 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;
      
      if (status === 401) {
        // Token invalid, expired, or missing
        console.warn('[Auth] 401 Unauthorized encountered. Clearing session state...');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
      } else if (status === 403) {
        // Forbidden / Insufficient role
        console.warn('[Auth] 403 Forbidden encountered. User lacks authority for this endpoint.');
      }
    }
    return Promise.reject(error);
  }
);
