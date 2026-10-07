import React from 'react';
import { SavedQuestion } from '../types';
import {
  Bookmark,
  Sparkles,
  BarChart3,
  PieChart,
  Table as TableIcon,
  Layers,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface SavedQuestionsDrawerProps {
  questions: SavedQuestion[];
  onSelect: (question: SavedQuestion) => void;
  activeId?: string;
}

export const SavedQuestionsDrawer: React.FC<SavedQuestionsDrawerProps> = ({
  questions,
  onSelect,
  activeId,
}) => {
  const getIcon = (type: SavedQuestion['visualizationType']) => {
    switch (type) {
      case 'bar':
        return <BarChart3 className="w-3.5 h-3.5 text-blue-600" />;
      case 'pie':
        return <PieChart className="w-3.5 h-3.5 text-amber-600" />;
      case 'table':
      default:
        return <TableIcon className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getCategoryColor = (cat: SavedQuestion['category']) => {
    switch (cat) {
      case 'Risk':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Spend':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Compliance':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Operations':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <Bookmark className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Curated Metabase Questions
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {questions.map((q) => {
          const isActive = activeId === q.id;
          return (
            <div
              key={q.id}
              onClick={() => onSelect(q)}
              className={`p-3 rounded-lg border transition cursor-pointer flex flex-col justify-between group ${
                isActive
                  ? 'bg-blue-50/80 border-blue-300 shadow-sm'
                  : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-white shadow-xs border border-slate-200">
                    {getIcon(q.visualizationType)}
                  </div>
                  <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {q.title}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase font-mono ${getCategoryColor(
                    q.category
                  )}`}
                >
                  {q.category}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                {q.description}
              </p>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                <span className="font-mono uppercase">Table: {q.table}</span>
                <span className="flex items-center gap-0.5 text-blue-600 font-semibold group-hover:translate-x-0.5 transition">
                  Run Question <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
