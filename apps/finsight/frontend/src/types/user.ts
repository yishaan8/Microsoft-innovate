import { UserRole } from './auth';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLogin: string;
  assignedExceptionsCount: number;
}
