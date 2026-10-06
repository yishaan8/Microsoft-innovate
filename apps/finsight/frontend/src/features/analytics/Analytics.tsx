import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { analyticsApi } from '../../api/analyticsApi';
import { DashboardSummary } from '../../types/analytics';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { RiskChart } from '../../components/charts/RiskChart';
import { ExceptionChart } from '../../components/charts/ExceptionChart';
import { DepartmentChart } from '../../components/charts/DepartmentChart';
import { MetabaseStudio } from '../metabase/MetabaseStudio';
import { BarChart3, Database, Sparkles, LayoutDashboard, Terminal } from 'lucide-react';

export const Analytics: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'bi' ? 'bi' : 'executive';
  const [activeTab, setActiveTab] = useState<'executive' | 'bi'>(initialTab);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await analyticsApi.getDashboardSummary();
        setSummary(data);
      } catch (e) {
        console.error('Failed to load analytics:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleTabChange = (tab: 'executive' | 'bi') => {
    setActiveTab(tab);
    setSearchParams(tab === 'bi' ? { tab: 'bi' } : {});
  };

  if (loading || !summary) {
    return (
      <div className="py-20">
        <Spinner size="lg" text="Aggregating financial analytics and exception distributions..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header with Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-600" /> AP Exception Analytics & BI
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise quantitative telemetry, visual question building, and database exploration.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => handleTabChange('executive')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'executive'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" /> Executive Overview
          </button>

          <button
            onClick={() => handleTabChange('bi')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'bi'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Metabase BI Studio
            <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
              New
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Executive Overview */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          {/* Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Average Resolution Time
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {summary.averageResolutionHours} Hours
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">
                ↓ 1.4h faster than previous period
              </span>
            </div>
            <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Automated Clearance Accuracy
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">99.4%</p>
              <span className="text-[11px] text-slate-500">Continuous 3-way match precision</span>
            </div>
            <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Prevented Leakage Estimate
              </span>
              <p className="text-2xl font-black text-emerald-600 mt-1">₹4,280,000</p>
              <span className="text-[11px] text-slate-500">
                Duplicate billings & rate mismatch intercepts
              </span>
            </div>
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Rule Detection Frequency & Capital Exposure"
              subtitle="Top automated checks triggering validation blocks"
            >
              <ExceptionChart data={summary.exceptionsByRule} />
            </Card>

            <Card
              title="Department Exception Share"
              subtitle="Relative distribution of flagged invoices across organizational business units"
            >
              <DepartmentChart data={summary.departmentDistribution} />
            </Card>
          </div>

          {/* Trend Velocity Chart */}
          <Card
            title="7-Day Exception Ingestion Velocity"
            subtitle="Critical vs High vs Medium severity distribution timeline"
          >
            <RiskChart data={summary.exceptionTrends} />
          </Card>
        </div>
      )}

      {/* Tab 2: Metabase BI Studio */}
      {activeTab === 'bi' && <MetabaseStudio />}
    </div>
  );
};
