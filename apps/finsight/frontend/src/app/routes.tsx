import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Login } from '../features/auth/Login';
import { Dashboard } from '../features/dashboard/Dashboard';
import { InvoiceList } from '../features/invoices/InvoiceList';
import { ExceptionList } from '../features/exceptions/ExceptionList';
import { Analytics } from '../features/analytics/Analytics';
import { AuditTrail } from '../features/audit/AuditTrail';
import { UserManagement } from '../features/users/UserManagement';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected App Routes inside Dashboard Shell */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Default Redirect to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard: Accessible by ADMIN, ANALYST, AUDITOR */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'ANALYST', 'AUDITOR']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Invoices: Accessible by ADMIN, ANALYST, AUDITOR */}
        <Route
          path="/invoices"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'ANALYST', 'AUDITOR']}>
              <InvoiceList />
            </ProtectedRoute>
          }
        />

        {/* Exceptions: Accessible by ADMIN, ANALYST */}
        <Route
          path="/exceptions"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'ANALYST']}>
              <ExceptionList />
            </ProtectedRoute>
          }
        />

        {/* Analytics & BI Studio: Accessible by ADMIN, ANALYST */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'ANALYST']}>
              <Analytics />
            </ProtectedRoute>
          }
        />

        {/* Metabase BI Studio Route */}
        <Route
          path="/bi-studio"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'ANALYST', 'AUDITOR']}>
              <Analytics />
            </ProtectedRoute>
          }
        />

        {/* Audit Trail: Accessible by ADMIN, AUDITOR */}
        <Route
          path="/audit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
              <AuditTrail />
            </ProtectedRoute>
          }
        />

        {/* User Management: Accessible by ADMIN only */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
