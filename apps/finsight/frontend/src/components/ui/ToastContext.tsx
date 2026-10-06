import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, description, duration = 4000 }: Omit<ToastMessage, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, title, description, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((title: string, description?: string) => {
    showToast({ type: 'success', title, description });
  }, [showToast]);

  const error = useCallback((title: string, description?: string) => {
    showToast({ type: 'error', title, description });
  }, [showToast]);

  const warning = useCallback((title: string, description?: string) => {
    showToast({ type: 'warning', title, description });
  }, [showToast]);

  const info = useCallback((title: string, description?: string) => {
    showToast({ type: 'info', title, description });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Toast Render Viewport */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md animate-fade-in-up transition-all"
          >
            <div className="flex-shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {t.type === 'error' && <AlertOctagon className="w-4 h-4 text-red-400" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white tracking-tight">{t.title}</p>
              {t.description && <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{t.description}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
