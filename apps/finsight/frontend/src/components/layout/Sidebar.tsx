import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  FileSpreadsheet,
  AlertTriangle,
  BarChart3,
  History,
  Users,
  ShieldCheck,
  Bot,
  Sparkles,
  UploadCloud,
  Database,
} from 'lucide-react';
import { hasPermission } from '../../utils/permissions';
import { APCopilotDrawer } from '../copilot/APCopilotDrawer';
import { InvoiceUploadModal } from '../ingestion/InvoiceUploadModal';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const allNavItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Invoice Explorer',
      path: '/invoices',
      icon: FileSpreadsheet,
    },
    {
      name: 'Exceptions & Rules',
      path: '/exceptions',
      icon: AlertTriangle,
      badge: '5 Active',
      badgeColor: 'bg-red-100 text-red-700',
    },
    {
      name: 'AP Analytics',
      path: '/analytics',
      icon: BarChart3,
    },
    {
      name: 'BI Data Studio',
      path: '/analytics?tab=bi',
      icon: Database,
      badge: 'Metabase',
      badgeColor: 'bg-blue-900/60 text-blue-300 border border-blue-500/30',
    },
    {
      name: 'Audit Trail',
      path: '/audit',
      icon: History,
    },
    {
      name: 'User Management',
      path: '/users',
      icon: Users,
      badge: 'Admin',
      badgeColor: 'bg-purple-100 text-purple-700',
    },
  ];

  // Filter navigation items by current user role permissions
  const accessibleItems = allNavItems.filter((item) => hasPermission(user?.role, item.path));

  return (
    <>
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between flex-shrink-0 border-r border-slate-800">
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80 bg-slate-950/50">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base tracking-tight">FinSight</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-400/20">
                  AP
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Exception Intelligence</p>
            </div>
          </div>

          {/* User Role Banner */}
          <div className="mx-4 my-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">
                Role: {user?.role}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Core Modules
            </div>
            {accessibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}

            {/* AI Assistant Quick Trigger */}
            <div className="pt-3">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                AI Assistants & Pipeline
              </div>
              <button
                onClick={() => setIsCopilotOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition group"
              >
                <div className="flex items-center gap-3">
                  <Bot className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
                  <span>AP Copilot Assistant</span>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              </button>

              <button
                onClick={() => setIsUploadOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition"
              >
                <div className="flex items-center gap-3">
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span>Batch Ingestion</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">CSV/XLSX</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Footer Hackathon Team Signature */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Team 305</span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-400">
              Lowkey overfitting
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Microsoft Innovate 2026 • Bennett University</p>
        </div>
      </aside>

      {/* Embedded Modals */}
      <APCopilotDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
      <InvoiceUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
};
