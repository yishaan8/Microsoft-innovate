import React, { useState, useEffect } from 'react';
import {
  VisualizationType,
  VisualQuery,
  QueryResult,
  SavedQuestion,
} from './types';
import {
  METABASE_SCHEMAS,
  CURATED_QUESTIONS,
  executeVisualQuery,
  executeNativeSQL,
  exportToCSV,
} from './dbEngine';
import { VisualQueryBuilder } from './components/VisualQueryBuilder';
import { SqlEditor } from './components/SqlEditor';
import { ChartViewer } from './components/ChartViewer';
import { SavedQuestionsDrawer } from './components/SavedQuestionsDrawer';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Layers,
  Terminal,
  Database,
  Share2,
  Download,
  Plus,
  Bookmark,
  Sparkles,
  Zap,
} from 'lucide-react';

export const MetabaseStudio: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'visual' | 'sql' | 'curated'>('visual');
  const [vizType, setVizType] = useState<VisualizationType>('bar');
  const [activeQuestionId, setActiveQuestionId] = useState<string | undefined>('q-1');

  // Visual Query State
  const [visualQuery, setVisualQuery] = useState<VisualQuery>(CURATED_QUESTIONS[0].query);

  // SQL Query State
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT department, SUM(amount) AS sum_amount, AVG(riskScore) AS avg_risk FROM invoices GROUP BY department ORDER BY sum_amount DESC;'
  );

  // Execution Results
  const [result, setResult] = useState<QueryResult>(() =>
    executeVisualQuery(CURATED_QUESTIONS[0].query)
  );
  const [currentTitle, setCurrentTitle] = useState<string>(CURATED_QUESTIONS[0].title);

  // Run Visual Query
  const handleRunVisual = () => {
    const res = executeVisualQuery(visualQuery);
    setResult(res);
  };

  // Run SQL Query
  const handleRunSQL = () => {
    const res = executeNativeSQL(sqlQuery);
    setResult(res);
    // Auto-select visualization type based on columns
    if (res.columns.length > 2) {
      setVizType('table');
    } else {
      setVizType('bar');
    }
  };

  // Select a curated question
  const handleSelectCurated = (question: SavedQuestion) => {
    setActiveQuestionId(question.id);
    setCurrentTitle(question.title);
    setVizType(question.visualizationType);
    setVisualQuery(question.query);
    const res = executeVisualQuery(question.query);
    setResult(res);
    setActiveMode('visual');
  };

  const handleVizTypeChange = (type: VisualizationType) => {
    setVizType(type);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header (Metabase-inspired top bar) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-400/20 tracking-wider font-mono">
                Metabase BI Engine
              </span>
              <span className="text-[10px] text-slate-400">Interactive Analytics & SQL Studio</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1">
              Data Explorer & Question Builder
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Explore enterprise AP databases through visual questions, aggregate metrics, and native SQL.
              Direct in-browser querying over invoices, validation exceptions, and supplier risk matrices.
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
            <button
              onClick={() => {
                setActiveMode('visual');
                handleRunVisual();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeMode === 'visual'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Database className="w-3.5 h-3.5" /> Visual Builder
            </button>

            <button
              onClick={() => {
                setActiveMode('sql');
                handleRunSQL();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeMode === 'sql'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> Native SQL
            </button>

            <button
              onClick={() => setActiveMode('curated')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeMode === 'curated'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" /> Curated ({CURATED_QUESTIONS.length})
            </button>
          </div>
        </div>

        {/* Secondary Action Bar (Visualization Switcher & Export) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-800/80">
          {/* Visualization Switcher Pills */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold px-2">Visual Type:</span>
            {[
              { type: 'bar', label: 'Bar', icon: BarChart3 },
              { type: 'line', label: 'Line', icon: LineChartIcon },
              { type: 'area', label: 'Area', icon: Layers },
              { type: 'pie', label: 'Pie', icon: PieChartIcon },
              { type: 'table', label: 'Table', icon: TableIcon },
              { type: 'scalar', label: 'Number', icon: Zap },
            ].map((btn) => {
              const Icon = btn.icon;
              const isSelected = vizType === btn.type;
              return (
                <button
                  key={btn.type}
                  onClick={() => handleVizTypeChange(btn.type as VisualizationType)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {btn.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                exportToCSV(
                  `metabase_export_${Date.now()}`,
                  result.rows,
                  result.columns
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Interactive Body */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Curated Questions & Schema Quick Access */}
        <div className="lg:col-span-1 space-y-4">
          <SavedQuestionsDrawer
            questions={CURATED_QUESTIONS}
            onSelect={handleSelectCurated}
            activeId={activeQuestionId}
          />
        </div>

        {/* Right Side: Query Builder / SQL Editor + Chart Visualizer */}
        <div className="lg:col-span-3 space-y-6">
          {/* Query Interface */}
          {activeMode === 'visual' && (
            <VisualQueryBuilder
              query={visualQuery}
              onChange={(q) => {
                setVisualQuery(q);
                setActiveQuestionId(undefined);
              }}
              onRun={handleRunVisual}
            />
          )}

          {activeMode === 'sql' && (
            <SqlEditor
              sql={sqlQuery}
              onChange={(s) => setSqlQuery(s)}
              onRun={handleRunSQL}
              executionTimeMs={result.executionTimeMs}
              rowCount={result.totalCount}
            />
          )}

          {/* Visualization & Table Results */}
          <ChartViewer
            data={result}
            vizType={vizType}
            title={currentTitle}
          />
        </div>
      </div>
    </div>
  );
};
