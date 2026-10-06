import { UserRole } from '../types/auth';

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/dashboard': ['ADMIN', 'ANALYST', 'AUDITOR'],
  '/invoices': ['ADMIN', 'ANALYST', 'AUDITOR'],
  '/exceptions': ['ADMIN', 'ANALYST'],
  '/analytics': ['ADMIN', 'ANALYST'],
  '/bi-studio': ['ADMIN', 'ANALYST', 'AUDITOR'],
  '/audit': ['ADMIN', 'AUDITOR'],
  '/users': ['ADMIN'],
  '/settings': ['ADMIN'],
};

export function hasPermission(role: UserRole | undefined, path: string): boolean {
  if (!role) return false;
  
  // Find matching route pattern
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(route => 
    path === route || path.startsWith(`${route}/`)
  );
  
  if (!matchedRoute) return true; // Default allow for unspecified public/internal subpaths
  
  return ROUTE_PERMISSIONS[matchedRoute].includes(role);
}

export function canActOnExceptions(role: UserRole | undefined): boolean {
  return role === 'ADMIN' || role === 'ANALYST';
}

export function canManageUsers(role: UserRole | undefined): boolean {
  return role === 'ADMIN';
}

export function canViewAudit(role: UserRole | undefined): boolean {
  return role === 'ADMIN' || role === 'AUDITOR';
}
