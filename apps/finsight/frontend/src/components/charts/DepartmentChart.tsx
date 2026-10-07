import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { DepartmentDistributionData } from '../../types/analytics';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface DepartmentChartProps {
  data: DepartmentDistributionData[];
}

// Refined, high-trust executive palette (Non-rainbow)
const COLORS = ['#0f172a', '#1e3a8a', '#334155', '#475569', '#64748b'];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

const CustomDonutTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as DepartmentDistributionData;
    return (
      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 shadow-xl text-xs text-white min-w-[190px]">
        <p className="font-semibold text-slate-200 text-xs">{item.department}</p>
        <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Exceptions:</span>
            <span className="font-bold font-mono text-white">{item.flaggedCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Exception Rate:</span>
            <span className="font-mono text-amber-300">{formatPercentage(item.exceptionRate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">At-Risk Value:</span>
            <span className="font-mono text-emerald-300">{formatCurrency(item.atRiskAmount)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const DepartmentChart: React.FC<DepartmentChartProps> = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const totalFlagged = data.reduce((sum, d) => sum + d.flaggedCount, 0);

  return (
    <div className="space-y-3">
      <div className="w-full h-52 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              dataKey="flaggedCount"
              nameKey="department"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={3}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              animationDuration={600}
            >
              {data.map((_, index) => (
                <Cell key={`dept-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomDonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Minimalist Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Flagged</span>
          <span className="text-lg font-bold text-slate-900 font-mono tracking-tight">{totalFlagged}</span>
        </div>
      </div>

      {/* Clean Legend List */}
      <div className="space-y-1 pt-2 border-t border-slate-100">
        {data.map((item, idx) => (
          <div
            key={item.department}
            onMouseEnter={() => setActiveIndex(idx)}
            className={`flex items-center justify-between px-2 py-1 rounded text-xs transition cursor-pointer ${
              activeIndex === idx ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
              <span className="truncate text-[11px]">{item.department}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] flex-shrink-0">
              <span className="text-slate-900 font-medium">{item.flaggedCount}</span>
              <span className="text-slate-400 font-normal">({formatPercentage(item.flaggedCount / (totalFlagged || 1))})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
