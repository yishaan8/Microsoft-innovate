import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ExceptionsByRuleData } from '../../types/analytics';
import { formatCurrency } from '../../utils/formatters';

interface ExceptionChartProps {
  data: ExceptionsByRuleData[];
}

const BAR_COLOR = '#1e293b'; // Institutional Slate 800

const CustomBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as ExceptionsByRuleData;
    return (
      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 shadow-xl text-xs text-white min-w-[200px]">
        <p className="font-semibold text-slate-100 text-xs">{item.displayName}</p>
        <p className="text-[10px] font-mono text-slate-400 mt-0.5 uppercase">{item.rule}</p>
        
        <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Incidents:</span>
            <span className="font-bold font-mono text-white">{item.count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">At-Risk Value:</span>
            <span className="font-mono text-emerald-300">{formatCurrency(item.atRiskAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Share of Total:</span>
            <span className="font-mono text-slate-300">{item.percentage}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const ExceptionChart: React.FC<ExceptionChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 25, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            tick={{ fontSize: 10, fill: '#334155' }}
            axisLine={false}
            tickLine={false}
            width={170}
          />
          <Tooltip content={<CustomBarTooltip />} />
          <Bar
            dataKey="count"
            radius={[0, 3, 3, 0]}
            barSize={14}
            animationDuration={800}
            fill={BAR_COLOR}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? '#0f172a' : index === 1 ? '#1e293b' : '#334155'}
                className="hover:opacity-80 transition cursor-pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
