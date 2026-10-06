import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { exceptionApi } from '../../api/exceptionApi';
import { ExceptionItem, ExceptionSeverity, ExceptionRuleType, ExceptionStatus } from '../../types/exception';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { InvestigationWorkbench } from './InvestigationWorkbench';
import { formatCurrency } from '../../utils/formatters';
import { SEVERITY_COLORS, RULE_METADATA } from '../../utils/constants';
import {
  AlertOctagon,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';

export const ExceptionList: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSeverity = (searchParams.get('severity') as ExceptionSeverity) || 'ALL';
  const initialSearch = searchParams.get('search') || '';
  const initialInvestigateId = searchParams.get('investigate') || '';

  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>(initialSearch);
  const [severityFilter, setSeverityFilter] = useState<ExceptionSeverity | 'ALL'>(initialSeverity);
  const [ruleFilter, setRuleFilter] = useState<ExceptionRuleType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<ExceptionStatus | 'ALL'>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [activeInvestigation, setActiveInvestigation] = useState<ExceptionItem | null>(null);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const res = await exceptionApi.getExceptions({
        search,
        severity: severityFilter,
        rule: ruleFilter,
        status: statusFilter,
        page,
        pageSize: 10,
      });
      setExceptions(res.data);
      setTotalPages(res.totalPages);
      setTotalCount(res.totalItems);

      // Check if URL specified an exception to investigate immediately
      if (initialInvestigateId) {
        const target = res.data.find(e => e.id === initialInvestigateId || e.invoiceNumber === initialInvestigateId);
        if (target) setActiveInvestigation(target);
      }
    } catch (err) {
      console.error('Failed to load exceptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [search, severityFilter, ruleFilter, statusFilter, page]);

  const severities: (ExceptionSeverity | 'ALL')[] = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const ruleOptions: { key: ExceptionRuleType | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'All Automated Rules' },
    { key: 'SUPPLIER_BLACKLIST', label: 'Supplier Sanctions / Blacklist' },
    { key: 'SUPPLIER_RISK_THRESHOLD', label: 'HistGradientBoosting Risk Threshold' },
    { key: 'DUPLICATE_INVOICE', label: 'TF-IDF Near-Duplicate Collisions' },
    { key: 'INVALID_MISSING_FIELD', label: 'Missing / Invalid Tax Fields' },
    { key: 'LIMIT_EXCEEDED', label: 'Department Limit Exceeded' },
    { key: 'UNUSUAL_SUBMISSION_HOUR', label: 'Anomalous Submission Window' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-700" /> Exceptions & Rule Surveillance Queue
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Surveillance queue of invoices flagged by automated rules with explainability breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchExceptions}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Filter and Query Panel */}
      <Card>
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder="Search by Exception ID, Invoice #, Supplier name, or rule reason..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition"
              />
            </div>

            {/* Rule Select */}
            <select
              value={ruleFilter}
              onChange={(e) => {
                setRuleFilter(e.target.value as any);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
            >
              {ruleOptions.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 mr-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Severity Filter:
            </span>
            {severities.map((sev) => {
              const isActive = severityFilter === sev;
              const sevColors = sev !== 'ALL' ? SEVERITY_COLORS[sev] : null;

              return (
                <button
                  key={sev}
                  onClick={() => {
                    setSeverityFilter(sev);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition uppercase ${
                    isActive
                      ? sev === 'ALL'
                        ? 'bg-slate-900 text-white font-bold'
                        : `${sevColors?.badge} font-bold shadow-2xs`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sev}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Exception Records Feed Table */}
      <Card
        title="Active Exceptions Under Surveillance"
        subtitle="Real-time queue of invoices flagged by automated rules with explainability breakdown"
      >
        {loading ? (
          <Spinner size="md" text="Loading exceptions and explainability evidence..." />
        ) : exceptions.length === 0 ? (
          <div className="text-center py-14">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No rule exceptions found</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              All processed invoices have cleared automated validation filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-t border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px] bg-slate-50/80">
                  <th className="py-2.5 px-5">Invoice #</th>
                  <th className="py-2.5 px-4">Supplier</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Triggered Rule</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4">Explainability Summary (Why?)</th>
                  <th className="py-2.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exceptions.map((exc) => {
                  const sevStyle = SEVERITY_COLORS[exc.severity] || SEVERITY_COLORS.HIGH;
                  const ruleInfo = RULE_METADATA[exc.primaryRule];

                  return (
                    <tr
                      key={exc.id}
                      onClick={() => setActiveInvestigation(exc)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-5">
                        <span className="font-mono font-bold text-slate-900 block">{exc.invoiceNumber}</span>
                        <span className="text-[10px] font-mono text-slate-400">{exc.id}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-medium text-slate-900 block">{exc.supplierName}</span>
                        <span className="text-[10px] text-slate-500">{exc.department}</span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 font-mono">
                        {formatCurrency(exc.amount, exc.currency)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-slate-700 font-medium block">
                          {ruleInfo?.label || exc.primaryRule}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${sevStyle.badge}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${sevStyle.dot}`} />
                          {exc.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 max-w-sm">
                        <p className="text-[11px] text-slate-600 truncate">
                          {exc.explanation.why[0] || 'Flagged by rule logic'}
                        </p>
                      </td>
                      <td className="py-2.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setActiveInvestigation(exc)}
                        >
                          Investigate
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="pt-3 px-5 pb-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800 font-mono">{exceptions.length}</strong> of{' '}
            <strong className="text-slate-800 font-mono">{totalCount}</strong> exceptions
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-700 px-2 text-[11px]">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* Active Investigation Workbench Modal */}
      <InvestigationWorkbench
        exception={activeInvestigation}
        onClose={() => setActiveInvestigation(null)}
        onActionComplete={fetchExceptions}
      />
    </div>
  );
};
