import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  change?: number; // e.g. 5.4 (+5.4%) or -2.1 (-2.1%)
  changeType?: 'positive' | 'negative' | 'neutral';
  isInverseMetric?: boolean; // if true, increase is bad (e.g. exceptions), decrease is good
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  change,
  isInverseMetric = false,
  icon,
  onClick,
}) => {
  const getChangeBadge = () => {
    if (change === undefined) return null;

    const isPositiveChange = change > 0;
    const isNeutral = change === 0;

    let isGood = isPositiveChange ? !isInverseMetric : isInverseMetric;
    if (isNeutral) isGood = true;

    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[11px] font-semibold font-mono px-1.5 py-0.5 rounded ${
          isNeutral
            ? 'bg-slate-100 text-slate-600'
            : isGood
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
        }`}
      >
        {isPositiveChange ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        {Math.abs(change)}%
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase">{title}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums font-mono">
          {value}
        </span>
        {getChangeBadge()}
      </div>

      {subtext && (
        <p className="mt-1 text-[11px] text-slate-500 font-normal truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};
