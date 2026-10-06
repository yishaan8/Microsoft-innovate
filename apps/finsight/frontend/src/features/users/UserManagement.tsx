import React, { useState, useEffect } from 'react';
import { userApi } from '../../api/userApi';
import { ManagedUser } from '../../types/user';
import { UserRole } from '../../types/auth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ROLE_BADGES } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';
import { Users, UserPlus, Shield, CheckCircle2 } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userApi.getUsers();
      setUsers(data);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await userApi.updateUserRole(userId, newRole);
      setFeedback(`Role for ${userId} updated to ${newRole}`);
      fetchUsers();
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to update role');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" /> AP Team & RBAC Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure user authority, permissions, and departmental role assignments.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      <Card title="Active Team Members & Authorities" subtitle="Role-Based Access Control matrix">
        {loading ? (
          <Spinner size="md" text="Loading enterprise directory..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Active Tasks</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Modify Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const roleBadge = ROLE_BADGES[u.role] || ROLE_BADGES.ANALYST;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{u.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{u.email}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{u.department}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadge.badge}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {u.assignedExceptionsCount} exceptions
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {formatDateTime(u.lastLogin)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="ANALYST">ANALYST</option>
                          <option value="AUDITOR">AUDITOR</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
