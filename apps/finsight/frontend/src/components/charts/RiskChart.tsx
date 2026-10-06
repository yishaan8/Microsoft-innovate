import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ExceptionTrendData } from '../../types/analytics';

interface RiskChartProps {
  data: ExceptionTrendData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    return (
      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 shadow-xl text-xs text-white min-w-[180px]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px]">
          <span className="font-semibold text-slate-300">{label}, 2026</span>
          <span className="font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-200 font-bold">
            Total: {total}
          </span>
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-400">{entry.name}</span>
              </div>
              <span className="font-bold font-mono text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const RiskChart: React.FC<RiskChartProps> = ({ data }) => {
  const [activeRange, setActiveRange] = useState<'7D' | '30D' | '90D'>('7D');

  return (
    <div className="space-y-3">
      {/* Chart Control Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            Critical Sanctions
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-800" />
            High / Duplicates
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Medium
          </span>
        </div>

        {/* Time range pill selector */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
          {(['7D', '30D', '90D'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded transition ${
                activeRange === range
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.20} />
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              dy={4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              dx={-4}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={25}
              stroke="#cbd5e1"
              strokeDasharray="3 3"
              label={{
                value: 'Limit (25/day)',
                fill: '#94a3b8',
                fontSize: 9,
                position: 'insideTopRight',
              }}
            />
            <Area
              type="monotone"
              dataKey="critical"
              name="Critical"
              stroke="#e11d48"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCritical)"
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="high"
              name="High"
              stroke="#0f172a"
              strokeWidth={1.75}
              fillOpacity={1}
              fill="url(#colorHigh)"
              animationDuration={1000}
            />
            <Area
              type="monotone"
              dataKey="medium"
              name="Medium"
              stroke="#64748b"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorMedium)"
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
