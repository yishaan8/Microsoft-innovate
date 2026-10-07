import React, { useState } from 'react';
import { METABASE_SCHEMAS } from '../dbEngine';
import {
  Code2,
  Play,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Database,
  Terminal,
} from 'lucide-react';

interface SqlEditorProps {
  sql: string;
  onChange: (sql: string) => void;
  onRun: () => void;
  executionTimeMs?: number;
  rowCount?: number;
}

const SAMPLE_SQL_QUERIES = [
  {
    title: 'Department Spend & Risk',
    sql: 'SELECT department, SUM(amount) AS sum_amount, AVG(riskScore) AS avg_risk FROM invoices GROUP BY department ORDER BY sum_amount DESC;',
  },
  {
    title: 'High Risk Invoices (> 0.70)',
    sql: 'SELECT invoiceNumber, supplierName, amount, riskScore FROM invoices WHERE riskScore > 0.70 ORDER BY riskScore DESC LIMIT 10;',
  },
  {
    title: 'Exception Counts by Severity',
    sql: 'SELECT severity, COUNT(*) AS count, SUM(amount) AS sum_amount FROM exceptions GROUP BY severity ORDER BY count DESC;',
  },
  {
    title: 'Supplier Risk Ranking',
    sql: 'SELECT supplierName, category, avgRiskScore, anomalyCount FROM suppliers ORDER BY avgRiskScore DESC;',
  },
];

export const SqlEditor: React.FC<SqlEditorProps> = ({
  sql,
  onChange,
  onRun,
  executionTimeMs,
  rowCount,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState<string>('invoices');

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedSchema =
    METABASE_SCHEMAS.find((s) => s.id === activeSchemaTab) || METABASE_SCHEMAS[0];

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Top SQL Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Native SQL Editor
          </span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
            Direct In-Memory Query Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          {executionTimeMs !== undefined && (
            <span className="text-[11px] font-mono text-slate-400 px-2 py-1 rounded bg-slate-800/80 border border-slate-700">
              ⚡ {executionTimeMs}ms • {rowCount} rows
            </span>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Copy SQL Query"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy
              </>
            )}
          </button>

          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-600/30 transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Run SQL
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[220px]">
        {/* Editor Area */}
        <div className="lg:col-span-3 p-4 bg-slate-950 flex flex-col justify-between">
          <textarea
            value={sql}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                onRun();
              }
            }}
            placeholder="Write your SQL query here... e.g. SELECT department, SUM(amount) FROM invoices GROUP BY department;"
            className="w-full h-36 bg-transparent text-emerald-300 font-mono text-xs focus:outline-none resize-none leading-relaxed selection:bg-emerald-800 selection:text-white"
            spellCheck={false}
          />

          {/* Quick Pre-set Queries Bar */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Quick Queries:
            </span>
            {SAMPLE_SQL_QUERIES.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => onChange(sample.sql)}
                className="text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1 rounded transition"
              >
                {sample.title}
              </button>
            ))}
          </div>
        </div>

        {/* Schema Inspector Drawer */}
        <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/60 p-3 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] uppercase tracking-wider mb-2">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Database Schema</span>
            </div>

            {/* Table tabs */}
            <div className="flex flex-wrap gap-1 mb-3">
              {METABASE_SCHEMAS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSchemaTab(s.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                    activeSchemaTab === s.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.id}
                </button>
              ))}
            </div>

            {/* Selected table columns list */}
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {selectedSchema.columns.map((col) => (
                <div
                  key={col.name}
                  onClick={() => onChange(`${sql} ${col.name}`)}
                  className="flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded hover:bg-slate-800 cursor-pointer group"
                  title={`Click to insert column: ${col.name}`}
                >
                  <span className="font-mono text-slate-300 group-hover:text-blue-300 truncate">
                    {col.name}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono uppercase">
                    {col.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-[10px] text-slate-500 italic border-t border-slate-800/80">
            Tip: Press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono">⌘+Enter</kbd> to execute
          </div>
        </div>
      </div>
    </div>
  );
};
