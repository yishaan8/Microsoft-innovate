import React, { useState } from 'react';
import {
  TableName,
  VisualQuery,
  FilterCondition,
  AggregationFunction,
} from '../types';
import { METABASE_SCHEMAS } from '../dbEngine';
import {
  Filter,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
  Database,
  Calculator,
  ChevronDown,
} from 'lucide-react';

interface VisualQueryBuilderProps {
  query: VisualQuery;
  onChange: (query: VisualQuery) => void;
  onRun: () => void;
}

export const VisualQueryBuilder: React.FC<VisualQueryBuilderProps> = ({
  query,
  onChange,
  onRun,
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [newFilterCol, setNewFilterCol] = useState('');
  const [newFilterOp, setNewFilterOp] = useState<FilterCondition['operator']>('equals');
  const [newFilterVal, setNewFilterVal] = useState('');

  const currentSchema =
    METABASE_SCHEMAS.find((s) => s.id === query.table) || METABASE_SCHEMAS[0];

  const handleTableChange = (newTable: TableName) => {
    onChange({
      table: newTable,
      filters: [],
      aggregation: undefined,
      groupBy: undefined,
      orderBy: undefined,
      limit: 50,
    });
  };

  const handleAddFilter = () => {
    if (!newFilterCol) return;
    const filter: FilterCondition = {
      id: `f-${Date.now()}`,
      column: newFilterCol,
      operator: newFilterOp,
      value: newFilterVal,
    };
    onChange({
      ...query,
      filters: [...query.filters, filter],
    });
    setNewFilterVal('');
    setShowFilterDropdown(false);
  };

  const handleRemoveFilter = (filterId: string) => {
    onChange({
      ...query,
      filters: query.filters.filter((f) => f.id !== filterId),
    });
  };

  const handleAggregationChange = (func: AggregationFunction | 'none', col?: string) => {
    if (func === 'none') {
      onChange({
        ...query,
        aggregation: undefined,
        groupBy: undefined,
      });
    } else {
      onChange({
        ...query,
        aggregation: {
          func,
          column: func === 'count' ? undefined : col || currentSchema.columns.find(c => c.type === 'number' || c.type === 'currency')?.name,
        },
      });
    }
  };

  const handleGroupByChange = (groupByCol: string) => {
    onChange({
      ...query,
      groupBy: groupByCol === 'none' ? undefined : groupByCol,
    });
  };

  const numericColumns = currentSchema.columns.filter(
    (c) => c.type === 'number' || c.type === 'currency' || c.type === 'percentage'
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
      {/* Visual Query Builder Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Visual Query Builder</span>
          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-normal">
            Metabase Pattern
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onChange({
                table: query.table,
                filters: [],
                aggregation: undefined,
                groupBy: undefined,
                limit: 50,
              })
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Visualize Query
          </button>
        </div>
      </div>

      {/* Query Construction Blocks (Metabase Pill Style) */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Step 1: Pick Table */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
          <span className="px-2 py-1 text-slate-400 font-semibold uppercase text-[10px]">
            Data
          </span>
          <select
            value={query.table}
            onChange={(e) => handleTableChange(e.target.value as TableName)}
            className="bg-white border border-slate-200 text-slate-900 font-semibold text-xs rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {METABASE_SCHEMAS.map((schema) => (
              <option key={schema.id} value={schema.id}>
                {schema.name} ({schema.rowCount} rows)
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Filters */}
        <div className="flex items-center flex-wrap gap-2">
          {query.filters.map((filter) => (
            <div
              key={filter.id}
              className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 px-2.5 py-1 rounded-lg text-xs font-medium"
            >
              <span className="text-blue-600 font-mono text-[11px]">{filter.column}</span>
              <span className="text-blue-400 text-[10px]">{filter.operator}</span>
              <span className="font-semibold text-blue-950">"{filter.value}"</span>
              <button
                onClick={() => handleRemoveFilter(filter.id)}
                className="text-blue-400 hover:text-red-600 p-0.5 ml-1 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Add Filter Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowFilterDropdown(!showFilterDropdown);
                if (!newFilterCol && currentSchema.columns.length > 0) {
                  setNewFilterCol(currentSchema.columns[0].name);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <Filter className="w-3 h-3 text-slate-500" /> Filter <Plus className="w-3 h-3" />
            </button>

            {showFilterDropdown && (
              <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-30 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-700 uppercase">
                  Add Filter Condition
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">
                    Column
                  </label>
                  <select
                    value={newFilterCol}
                    onChange={(e) => setNewFilterCol(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                  >
                    {currentSchema.columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.label} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">
                    Operator
                  </label>
                  <select
                    value={newFilterOp}
                    onChange={(e) =>
                      setNewFilterOp(e.target.value as FilterCondition['operator'])
                    }
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                  >
                    <option value="equals">Equals (=)</option>
                    <option value="not_equals">Does Not Equal (!=)</option>
                    <option value="greater_than">Greater Than (&gt;)</option>
                    <option value="less_than">Less Than (&lt;)</option>
                    <option value="contains">Contains Substring</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">
                    Value
                  </label>
                  <input
                    type="text"
                    value={newFilterVal}
                    onChange={(e) => setNewFilterVal(e.target.value)}
                    placeholder="e.g. FLAGGED or 50000"
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowFilterDropdown(false)}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddFilter}
                    disabled={!newFilterVal}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold disabled:opacity-50 hover:bg-blue-700"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Summarize / Metrics */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
          <span className="px-2 py-1 text-slate-400 font-semibold uppercase text-[10px] flex items-center gap-1">
            <Calculator className="w-3 h-3" /> Summarize
          </span>
          <select
            value={query.aggregation ? query.aggregation.func : 'none'}
            onChange={(e) =>
              handleAggregationChange(e.target.value as AggregationFunction | 'none')
            }
            className="bg-white border border-slate-200 text-slate-900 font-semibold text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="none">Raw Records (No summary)</option>
            <option value="count">Count of rows</option>
            <option value="sum">Sum of ...</option>
            <option value="avg">Average of ...</option>
            <option value="max">Max of ...</option>
            <option value="min">Min of ...</option>
          </select>

          {query.aggregation && query.aggregation.func !== 'count' && (
            <select
              value={query.aggregation.column || numericColumns[0]?.name}
              onChange={(e) =>
                handleAggregationChange(query.aggregation!.func, e.target.value)
              }
              className="ml-1 bg-white border border-slate-200 text-slate-900 font-semibold text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {numericColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Step 4: Group By */}
        {query.aggregation && (
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
            <span className="px-2 py-1 text-slate-400 font-semibold uppercase text-[10px]">
              Group by
            </span>
            <select
              value={query.groupBy || 'none'}
              onChange={(e) => handleGroupByChange(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 font-semibold text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="none">None (Single total)</option>
              {currentSchema.columns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
