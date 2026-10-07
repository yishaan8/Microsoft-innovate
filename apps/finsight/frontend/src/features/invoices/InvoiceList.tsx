import React, { useState, useEffect } from 'react';
import { invoiceApi } from '../../api/invoiceApi';
import { Invoice, InvoiceStatus } from '../../types/invoice';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { InvoiceDetailsDrawer } from './InvoiceDetailsDrawer';
import { useToast } from '../../components/ui/ToastContext';
import { formatCurrency, formatDate, getRiskScoreBadge } from '../../utils/formatters';
import { INVOICE_STATUS_COLORS } from '../../utils/constants';
import {
  Search,
  Filter,
  Eye,
  AlertTriangle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  CheckSquare,
  Square,
  ArrowUpDown,
  Layers,
} from 'lucide-react';

export const InvoiceList: React.FC = () => {
  const toast = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [hasExceptionsOnly, setHasExceptionsOnly] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCompact, setIsCompact] = useState<boolean>(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await invoiceApi.getInvoices({
        search,
        status: statusFilter,
        department: departmentFilter || undefined,
        hasExceptionsOnly,
        page,
        pageSize: 10,
      });
      setInvoices(res.data);
      setTotalPages(res.totalPages);
      setTotalCount(res.totalItems);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      toast.error('Query Failed', 'Could not retrieve invoices from API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, departmentFilter, hasExceptionsOnly, page]);

  const handleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map((inv) => inv.id));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchAction = (action: string) => {
    toast.success('Batch Processing Registered', `Executed '${action}' on ${selectedIds.length} invoices.`);
    setSelectedIds([]);
  };

  const handleExportCSV = () => {
    toast.success('Export Successful', `Exported ${totalCount} invoice records to CSV.`);
  };

  const statuses: (InvoiceStatus | 'ALL')[] = [
    'ALL',
    'FLAGGED',
    'CLEARED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
  ];

  const departments = [
    'Supply Chain',
    'IT & Cloud Infrastructure',
    'Marketing',
    'Manufacturing',
    'Operations',
    'Legal & Compliance',
    'Engineering & R&D',
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" /> Accounts Payable Invoices
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance dataset containing ingestion status, PO 3-way matching, and telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search by invoice number, vendor, PO number, or department..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Department Dropdown */}
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Exceptions Only Toggle */}
            <button
              onClick={() => {
                setHasExceptionsOnly(!hasExceptionsOnly);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                hasExceptionsOnly
                  ? 'bg-amber-500/10 border-amber-400 text-amber-900 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Flagged Exceptions Only</span>
            </button>
          </div>

          {/* Status Filter Chips & View Density Control */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {statuses.map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Table Density */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Density:</span>
              <button
                onClick={() => setIsCompact(!isCompact)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition ${
                  isCompact ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {isCompact ? 'Compact' : 'Standard'}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Batch Actions Toolbar if rows are selected */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in-up">
          <span className="text-xs font-bold text-blue-900 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            {selectedIds.length} Invoice{selectedIds.length > 1 ? 's' : ''} Selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBatchAction('Batch Escalate to Risk')}
            >
              Escalate Selected
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleBatchAction('Batch Mark Reviewed')}
            >
              Mark Reviewed
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Deselect
            </Button>
          </div>
        </div>
      )}

      {/* Invoice Records Table */}
      <Card>
        {loading ? (
          <Spinner size="md" text="Loading invoice records..." />
        ) : invoices.length === 0 ? (
          <div className="text-center py-14">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No invoices match criteria</p>
            <p className="text-xs text-slate-500 mt-1">Try relaxing filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px] bg-slate-50/70">
                  <th className="py-3 px-3 text-center w-8">
                    <button onClick={handleSelectAll} className="p-0.5 text-slate-400 hover:text-slate-600">
                      {selectedIds.length === invoices.length && invoices.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">PO Ref</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-center">Risk Score</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const statusStyle = INVOICE_STATUS_COLORS[inv.status] || INVOICE_STATUS_COLORS.UNDER_REVIEW;
                  const riskBadge = getRiskScoreBadge(inv.riskScore);
                  const isSelected = selectedIds.includes(inv.id);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => handleToggleSelect(inv.id, e)}>
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                        )}
                      </td>
                      <td className={`py-3 px-3 font-bold text-slate-900 group-hover:text-blue-600 transition flex items-center gap-1.5 ${isCompact ? 'py-2' : 'py-3.5'}`}>
                        {inv.invoiceNumber}
                        {inv.exceptionCount > 0 && (
                          <span
                            className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse"
                            title={`${inv.exceptionCount} active exception`}
                          />
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{inv.poNumber}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{inv.supplierName}</td>
                      <td className="py-3 px-3 text-slate-600">{inv.department}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 font-mono">
                        {formatCurrency(inv.amount, inv.currency)}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${riskBadge.className}`}>
                          {riskBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle.badge}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(inv)}
                          leftIcon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800 font-mono">{invoices.length}</strong> of{' '}
            <strong className="text-slate-800 font-mono">{totalCount}</strong> invoices
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 px-2 font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Invoice Line Item Details Drawer */}
      <InvoiceDetailsDrawer invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  );
};
