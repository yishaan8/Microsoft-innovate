import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { TopRiskSupplierData } from '../../types/analytics';
import { formatCurrency, getRiskScoreBadge } from '../../utils/formatters';

interface SupplierRiskMatrixProps {
  suppliers: TopRiskSupplierData[];
  onSelectSupplier?: (supplierName: string) => void;
}

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TopRiskSupplierData;
    const riskBadge = getRiskScoreBadge(data.riskScore);

    return (
      <div className="bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-700/80 shadow-2xl text-xs text-white min-w-[220px] animate-fade-in-up">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-slate-100 text-[13px] truncate">{data.supplierName}</p>
          {data.isBlacklisted && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white uppercase">
              Sanctioned
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-slate-400 mt-0.5">Supplier ID: {data.supplierId}</p>

        <div className="mt-3 pt-2 border-t border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Risk Composite:</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${riskBadge.className}`}>
              {(data.riskScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Invoice Volume:</span>
            <span className="font-bold font-mono text-emerald-300">{formatCurrency(data.totalVolume)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Flagged Incidents:</span>
            <span className="font-bold font-mono text-amber-300">{data.flaggedInvoices} / {data.totalInvoices}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Primary Rule Trigger:</span>
            <span className="font-semibold text-slate-200 text-[10px]">{data.topRuleTriggered}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const SupplierRiskMatrix: React.FC<SupplierRiskMatrixProps> = ({
  suppliers,
  onSelectSupplier,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
          Quadrant IV: High Risk / High Exposure (Surveillance Priority)
        </span>
        <span className="text-[11px] font-medium text-slate-400">
          X-Axis: Risk Score (0 - 1.0) • Y-Axis: Exposure Volume (₹)
        </span>
      </div>

      <div className="w-full h-72 bg-slate-50/50 rounded-xl border border-slate-200/80 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="riskScore"
              name="Risk Score"
              domain={[0, 1.0]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="totalVolume"
              name="Invoice Volume"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            
            {/* Risk Threshold Line at 0.80 */}
            <ReferenceLine
              x={0.80}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{
                value: 'Risk Threshold (0.80)',
                fill: '#dc2626',
                fontSize: 10,
                fontWeight: 600,
                position: 'top',
              }}
            />

            <Scatter
              name="Suppliers"
              data={suppliers}
              onClick={(node) => onSelectSupplier?.(node.payload.supplierName)}
              cursor="pointer"
              animationDuration={800}
            >
              {suppliers.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.riskScore >= 0.8 ? '#dc2626' : entry.riskScore >= 0.6 ? '#f97316' : '#3b82f6'}
                  r={entry.riskScore >= 0.8 ? 9 : 7}
                  className="transition-all hover:scale-125 duration-150"
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
