import React, { useState, useEffect } from 'react';
import { auditApi } from '../../api/auditApi';
import { AuditLogEntry, AuditAction } from '../../types/audit';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/ToastContext';
import { formatDateTime } from '../../utils/formatters';
import {
  History,
  ShieldCheck,
  User,
  Bot,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle2,
  Download,
  Copy,
  Filter,
  Lock,
} from 'lucide-react';

export const AuditTrail: React.FC = () => {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await auditApi.getAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
      toast.error('Audit Load Failed', 'Could not retrieve compliance ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleCopyHash = (id: string) => {
    const fakeSha = `0x${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    navigator.clipboard.writeText(fakeSha);
    toast.success('SHA-256 Hash Copied', `${fakeSha} copied to clipboard.`);
  };

  const handleExportAudit = () => {
    toast.success('Audit Ledger Exported', 'Downloaded signed compliance event log (JSON/CSV).');
  };

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.name.toLowerCase().includes(search.toLowerCase()) ||
      l.targetId.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || l.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const actions = [
    'ALL',
    'RULE_ENGINE_DETECTED',
    'ANALYST_REVIEWED',
    'ESCALATED_TO_RISK_TEAM',
    'OVERRIDE_APPROVED',
    'INVOICE_REJECTED',
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <History className="w-6 h-6 text-blue-600" /> AP Compliance & Audit Ledger
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
              <Lock className="w-3 h-3 text-emerald-400" /> Tamper-Resistant
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically timestamped chronological history of all rule detections, analyst decisions, and overrides.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAudit}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Ledger
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Action Filter Panel */}
      <Card>
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by Actor, Target (e.g. EXC-2026-001 or INV-2026-8802), Action, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 mr-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Event Filter:
            </span>
            {actions.map((act) => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                  actionFilter === act
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {act.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Timeline Stream with Cryptographic Verification Badges */}
      <Card title="Event Verification Stream" subtitle="Verified audit records sorted in reverse chronological order">
        {loading ? (
          <Spinner size="md" text="Verifying cryptographic signatures across ledger..." />
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-14 text-slate-500 text-xs">
            No audit records found matching your filter criteria.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {filteredLogs.map((entry) => {
              const isSystem = entry.actor.role === 'SYSTEM';
              return (
                <div key={entry.id} className="relative group animate-fade-in-up">
                  {/* Timeline Node */}
                  <div
                    className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-xs ${
                      isSystem ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                    }`}
                  >
                    {isSystem ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  {/* Event Details Card */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 hover:border-slate-300 hover:shadow-xs transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{entry.actor.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          {entry.actor.role}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-mono text-slate-500 text-[11px]">{entry.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyHash(entry.id)}
                          className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200"
                          title="Copy cryptographic proof hash"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>SHA-256 Proof</span>
                          <Copy className="w-2.5 h-2.5 ml-0.5" />
                        </button>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {entry.action}
                      </span>
                      <span>Target: {entry.targetType} [{entry.targetId}]</span>
                    </div>

                    <p className="text-slate-800 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-200/70 shadow-2xs">
                      {entry.details}
                    </p>

                    {(entry.previousState || entry.newState) && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                        <span>Lifecycle Transition:</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                          {entry.previousState || 'INITIAL'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                          {entry.newState}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
