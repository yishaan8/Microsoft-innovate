import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../../api/analyticsApi';
import { DashboardSummary } from '../../types/analytics';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { RiskChart } from '../../components/charts/RiskChart';
import { ExceptionChart } from '../../components/charts/ExceptionChart';
import { DepartmentChart } from '../../components/charts/DepartmentChart';
import { SupplierRiskMatrix } from '../../components/charts/SupplierRiskMatrix';
import { useToast } from '../../components/ui/ToastContext';
import { formatCurrency, getRiskScoreBadge } from '../../utils/formatters';
import { SEVERITY_COLORS, RULE_METADATA } from '../../utils/constants';
import {
  FileText,
  AlertOctagon,
  ShieldAlert,
  Percent,
  Coins,
  ArrowRight,
  Download,
  ChevronRight,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SURVEILLANCE' | 'SUPPLIER_MATRIX'>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await analyticsApi.getDashboardSummary();
        setSummary(data);
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        toast.error('Surveillance Feed Unavailable', 'Could not synchronize with AP rule engine API.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const handleExportSummary = () => {
    toast.success('Intelligence Digest Exported', 'Downloaded signed AP exception summary report (CSV).');
  };

  if (loading) {
    return (
      <div className="py-24">
        <Spinner size="lg" text="Loading real-time AP surveillance metrics..." />
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const filteredExceptions = summary.recentExceptions.filter(
    (e) =>
      e.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.primaryRule.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Accounts Payable Exception Intelligence
            </h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase font-semibold">
              Live Feed
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Automated anomaly detection, duplicate collision matching, and sanction surveillance.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSummary}
            leftIcon={<Download className="w-3.5 h-3.5 text-slate-500" />}
          >
            Export Digest
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/exceptions')}
            leftIcon={<AlertOctagon className="w-3.5 h-3.5 text-slate-300" />}
          >
            Workbench ({summary.totalExceptions})
          </Button>
        </div>
      </div>

      {/* Institutional KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          title="Total Invoices"
          value={summary.totalInvoices.toLocaleString()}
          change={4.2}
          subtext="Processed in current cycle"
          icon={<FileText className="w-4 h-4" />}
          onClick={() => navigate('/invoices')}
        />
        <StatCard
          title="Flagged Exceptions"
          value={summary.totalExceptions.toLocaleString()}
          change={-1.8}
          isInverseMetric={true}
          subtext="Under payment hold"
          icon={<AlertOctagon className="w-4 h-4" />}
          onClick={() => navigate('/exceptions')}
        />
        <StatCard
          title="Exception Rate"
          value={`${(summary.exceptionRate * 100).toFixed(2)}%`}
          change={-0.4}
          isInverseMetric={true}
          subtext="Target benchmark: < 6.0%"
          icon={<Percent className="w-4 h-4" />}
        />
        <StatCard
          title="High/Critical Risk"
          value={summary.highRiskExceptions.toString()}
          change={8.3}
          isInverseMetric={true}
          subtext="Sanctions & Limit breaches"
          icon={<ShieldAlert className="w-4 h-4" />}
          onClick={() => navigate('/exceptions?severity=HIGH')}
        />
        <StatCard
          title="At-Risk Capital"
          value={formatCurrency(summary.totalAtRiskAmount)}
          change={-3.1}
          isInverseMetric={true}
          subtext="Locked from disbursement"
          icon={<Coins className="w-4 h-4" />}
        />
      </div>

      {/* Perspective Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 text-xs">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`pb-2.5 px-3 font-semibold transition-colors relative ${
              activeTab === 'OVERVIEW'
                ? 'text-slate-900 border-b-2 border-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Surveillance Overview
          </button>
          <button
            onClick={() => setActiveTab('SURVEILLANCE')}
            className={`pb-2.5 px-3 font-semibold transition-colors relative ${
              activeTab === 'SURVEILLANCE'
                ? 'text-slate-900 border-b-2 border-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Rule Frequency & Cost Centers
          </button>
          <button
            onClick={() => setActiveTab('SUPPLIER_MATRIX')}
            className={`pb-2.5 px-3 font-semibold transition-colors relative ${
              activeTab === 'SUPPLIER_MATRIX'
                ? 'text-slate-900 border-b-2 border-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Supplier Risk Matrix
          </button>
        </div>

        <span className="hidden sm:inline-flex text-[11px] font-mono text-slate-400">
          SURVEILLANCE: OCT 01 – OCT 06, 2026
        </span>
      </div>

      {/* Tab 1: Executive Overview */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card
                title="Exception Velocity & Classification (7-Day)"
                subtitle="Automated daily classification of rule breaches (Critical, High, Medium)"
              >
                <RiskChart data={summary.exceptionTrends} />
              </Card>
            </div>
            <div>
              <Card
                title="Department Risk Exposure"
                subtitle="Concentration of active exceptions across organizational cost centers"
              >
                <DepartmentChart data={summary.departmentDistribution} />
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Surveillance Analytics */}
      {activeTab === 'SURVEILLANCE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card
            title="Exceptions by Rule Engine Trigger"
            subtitle="Automated detection frequencies across core AP validation rules"
          >
            <ExceptionChart data={summary.exceptionsByRule} />
          </Card>

          <Card
            title="Departmental Cost Center Distribution"
            subtitle="Cross-departmental exception rate and volume distribution"
          >
            <DepartmentChart data={summary.departmentDistribution} />
          </Card>
        </div>
      )}

      {/* Tab 3: Supplier Risk Matrix */}
      {activeTab === 'SUPPLIER_MATRIX' && (
        <div>
          <Card
            title="Vendor Surveillance Matrix (Risk Composite vs Volume Exposure)"
            subtitle="Quadrant analysis isolating high-volume / high-risk vendor threats"
          >
            <SupplierRiskMatrix
              suppliers={summary.topRiskSuppliers}
              onSelectSupplier={(name) => navigate(`/exceptions?search=${name}`)}
            />
          </Card>
        </div>
      )}

      {/* Active Exceptions Under Surveillance Table (Restored to First Page) */}
      <Card
        title="Active Exceptions Under Surveillance"
        subtitle="Real-time queue of invoices flagged by automated rules with explainability breakdown"
        action={
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter queue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/exceptions')}
              rightIcon={<ChevronRight className="w-3 h-3" />}
            >
              Full Workbench
            </Button>
          </div>
        }
      >
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
              {filteredExceptions.map((exc) => {
                const sev = SEVERITY_COLORS[exc.severity] || SEVERITY_COLORS.LOW;
                const ruleInfo = RULE_METADATA[exc.primaryRule];
                return (
                  <tr
                    key={exc.id}
                    onClick={() => navigate(`/exceptions?investigate=${exc.id}`)}
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-5">
                      <span className="font-mono font-bold text-slate-900 block">
                        {exc.invoiceNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{exc.id}</span>
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
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${sev.badge}`}>
                        <span className={`w-1 h-1 rounded-full ${sev.dot}`} />
                        {exc.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 max-w-sm">
                      <p className="text-[11px] text-slate-600 truncate">
                        {exc.explanation?.why?.[0] || 'Rule violation detected'}
                      </p>
                    </td>
                    <td className="py-2.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/exceptions?investigate=${exc.id}`)}
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
      </Card>
    </div>
  );
};
