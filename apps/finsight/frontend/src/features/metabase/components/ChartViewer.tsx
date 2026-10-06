import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { VisualizationType, QueryResult } from '../types';
import { formatCurrency, formatPercentage } from '../../../utils/formatters';
import {
  Table as TableIcon,
  Search,
  Download,
  ArrowUpDown,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { exportToCSV } from '../dbEngine';

interface ChartViewerProps {
  data: QueryResult;
  vizType: VisualizationType;
  title?: string;
  onExportCsv?: () => void;
}

const METABASE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
];

export const ChartViewer: React.FC<ChartViewerProps> = ({
  data,
  vizType,
  title,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <div className="h-72 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-sm font-semibold text-slate-700">No records returned</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Adjust your visual query filters, table selection, or SQL conditions to view results.
        </p>
      </div>
    );
  }

  // Identify X-axis dimension (typically string/date or first column)
  const columns = data.columns.length > 0 ? data.columns : Object.keys(data.rows[0]);
  const xKey = columns[0];
  const metricKeys = columns.slice(1).filter((c) => {
    return data.rows.some((r) => typeof r[c] === 'number');
  });

  // If no metric key was identified, default to first numeric column or count
  const yKey = metricKeys.length > 0 ? metricKeys[0] : columns[1] || columns[0];

  // Table sorting and filtering
  let filteredRows = [...data.rows];
  if (searchTerm) {
    filteredRows = filteredRows.filter((r) =>
      Object.values(r).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }

  if (sortCol) {
    filteredRows.sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const formatCellValue = (colName: string, val: any) => {
    if (val === null || val === undefined) return '-';
    const lower = colName.toLowerCase();
    if (typeof val === 'number') {
      if (lower.includes('amount') || lower.includes('spend') || lower.includes('budget')) {
        return formatCurrency(val);
      }
      if (lower.includes('score') || lower.includes('rate') || lower.includes('confidence')) {
        return val <= 1 ? formatPercentage(val) : `${val}%`;
      }
      return val.toLocaleString();
    }
    return String(val);
  };

  // Render Scalar Metric View
  if (vizType === 'scalar' || data.rows.length === 1 && columns.length === 1) {
    const singleVal = data.rows[0][columns[0]];
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center shadow-sm">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          {columns[0]}
        </span>
        <div className="text-5xl font-black text-blue-600 tracking-tight">
          {formatCellValue(columns[0], singleVal)}
        </div>
        <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
          <span>Metabase Aggregation Metric</span> • <span>Instant Real-Time Compute</span>
        </p>
      </div>
    );
  }

  // Render Charts
  const renderChart = () => {
    switch (vizType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data.rows} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 11, fill: '#64748b' }}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) =>
                  val >= 1000000
                    ? `₹${(val / 1000000).toFixed(1)}M`
                    : val >= 1000
                    ? `₹${(val / 1000).toFixed(0)}k`
                    : val
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [formatCellValue(yKey, val), yKey]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {metricKeys.length > 0 ? (
                metricKeys.map((mk, idx) => (
                  <Bar
                    key={mk}
                    dataKey={mk}
                    fill={METABASE_COLORS[idx % METABASE_COLORS.length]}
                    radius={[6, 6, 0, 0]}
                  />
                ))
              ) : (
                <Bar dataKey={yKey} fill="#3b82f6" radius={[6, 6, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data.rows} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 11, fill: '#64748b' }}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [formatCellValue(yKey, val), yKey]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {metricKeys.length > 0 ? (
                metricKeys.map((mk, idx) => (
                  <Line
                    key={mk}
                    type="monotone"
                    dataKey={mk}
                    stroke={METABASE_COLORS[idx % METABASE_COLORS.length]}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey={yKey}
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={data.rows} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <defs>
                <linearGradient id="metabaseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 11, fill: '#64748b' }}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [formatCellValue(yKey, val), yKey]}
              />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#metabaseAreaGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={340}>
            <PieChart>
              <Pie
                data={data.rows}
                dataKey={yKey}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={60}
                paddingAngle={3}
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
              >
                {data.rows.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={METABASE_COLORS[index % METABASE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [formatCellValue(yKey, val), yKey]}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'table':
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Chart Visualizer Area (if not purely table mode) */}
      {vizType !== 'table' && (
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {title || 'Visualized Exploration'}
              </h3>
              <p className="text-xs text-slate-500">
                Dimension: <span className="font-semibold text-slate-700">{xKey}</span> • Metric:{' '}
                <span className="font-semibold text-slate-700">{yKey}</span>
              </p>
            </div>
            <button
              onClick={() => exportToCSV('metabase_query_results', data.rows, columns)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5" /> Export Data
            </button>
          </div>
          {renderChart()}
        </div>
      )}

      {/* Underlying Data Grid Table (Metabase Results Drawer) */}
      <div className="p-4 bg-slate-50/50">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Data Records ({filteredRows.length} rows)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search result rows..."
                className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
              />
            </div>

            {vizType === 'table' && (
              <button
                onClick={() => exportToCSV('metabase_query_results', data.rows, columns)}
                className="flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            )}
          </div>
        </div>

        {/* Interactive Data Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 transition select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>{col}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/40 transition">
                  {columns.map((col) => {
                    const val = row[col];
                    const isRisk = col.toLowerCase().includes('risk');
                    const isStatus = col.toLowerCase() === 'status';
                    const isSeverity = col.toLowerCase() === 'severity';

                    return (
                      <td key={col} className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {isStatus ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              val === 'FLAGGED' || val === 'BLOCKED'
                                ? 'bg-red-100 text-red-700'
                                : val === 'CLEARED' || val === 'Active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {String(val)}
                          </span>
                        ) : isSeverity ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              val === 'CRITICAL'
                                ? 'bg-red-100 text-red-700'
                                : val === 'HIGH'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {String(val)}
                          </span>
                        ) : isRisk && typeof val === 'number' ? (
                          <span
                            className={`font-semibold ${
                              val > 0.7
                                ? 'text-red-600'
                                : val > 0.4
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {formatCellValue(col, val)}
                          </span>
                        ) : (
                          formatCellValue(col, val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length}{' '}
              results
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition font-medium"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
