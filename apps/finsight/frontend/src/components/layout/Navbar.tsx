import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';
import { ROLE_BADGES } from '../../utils/constants';
import { APCopilotDrawer } from '../copilot/APCopilotDrawer';
import { InvoiceUploadModal } from '../ingestion/InvoiceUploadModal';
import {
  Bell,
  Search,
  LogOut,
  ChevronDown,
  Shield,
  Server,
  UserCheck,
  Bot,
  UploadCloud,
  Sparkles,
  Command,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const roles: UserRole[] = ['ADMIN', 'ANALYST', 'AUDITOR'];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/exceptions?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200/90 sticky top-0 z-30 flex items-center justify-between px-6">
        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder="Search invoices, suppliers, or rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-12 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <span className="text-[10px] font-mono text-slate-400 bg-slate-200/60 px-1 py-0.2 rounded border border-slate-300/50">
                ⌘K
              </span>
            </div>
          </div>
        </form>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* AP Copilot Trigger Button */}
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 active:bg-black transition shadow-2xs"
          >
            <Bot className="w-3.5 h-3.5 text-slate-300" />
            <span>AP Copilot</span>
            <span className="text-[9px] bg-slate-700 text-slate-200 px-1 rounded font-mono">AI</span>
          </button>

          {/* Batch Ingestion Button */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200/90 shadow-2xs transition"
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Batch Upload</span>
          </button>

          {/* API Backend Health Status */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium text-slate-500">API Live</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          {/* Dynamic RBAC Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition"
              title="Switch User Role to test RBAC"
            >
              <Shield className="w-3 h-3 text-slate-500" />
              <span className="font-mono text-[11px]">{user?.role}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div
                className="absolute right-0 mt-1.5 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 text-xs"
                onMouseLeave={() => setShowRoleMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                  Switch Role Persona
                </div>
                {roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      switchRole(r);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition ${
                      user?.role === r ? 'font-bold text-slate-900 bg-slate-50' : 'text-slate-600'
                    }`}
                  >
                    <span>{ROLE_BADGES[r]?.label || r}</span>
                    {user?.role === r && <span className="w-1 h-1 rounded-full bg-slate-900" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <button className="relative p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-md hover:bg-slate-100 transition"
            >
              <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden xl:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-1.5 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 text-xs"
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 truncate font-mono">{user?.email}</p>
                  <span className="mt-1 inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-rose-700 hover:bg-rose-50 flex items-center gap-2 font-medium transition"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Embedded Drawer & Upload Modals */}
      <APCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onNavigate={(path) => navigate(path)}
      />
      <InvoiceUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </>
  );
};
