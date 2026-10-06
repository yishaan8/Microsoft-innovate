import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/ToastContext';
import {
  Bot,
  Send,
  Sparkles,
  X,
  FileText,
  AlertOctagon,
  Brain,
  HelpCircle,
  TrendingDown,
  ShieldCheck,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    path: string;
  };
  metrics?: {
    model: string;
    confidence: string;
    rule: string;
  };
}

interface APCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

const INITIAL_PROMPTS = [
  'Why was invoice INV-2026-8802 blocked?',
  'Explain near-duplicate detection for Delta Industrial',
  'Summarize high-risk exceptions for Supply Chain',
  'What ML models are currently active in the pipeline?',
];

export const APCopilotDrawer: React.FC<APCopilotDrawerProps> = ({ isOpen, onClose, onNavigate }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: `Hello ${user?.name || 'Analyst'}, I am your **FinSight AP Copilot**. I analyze invoice streams using **HistGradientBoosting**, **TF-IDF cosine similarity**, and automated rule heuristics. Ask me anything about flagged exceptions, vendor risk scores, or policy violations.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    // Context-aware AI responses based on Hackathon PPT architecture
    setTimeout(() => {
      let replyText = '';
      let replyMetrics: ChatMessage['metrics'] | undefined = undefined;
      let replyAction: ChatMessage['suggestedAction'] | undefined = undefined;

      const q = query.toLowerCase();

      if (q.includes('8802') || q.includes('acme') || q.includes('blacklist')) {
        replyText = `**Invoice INV-2026-8802** (₹14,20,000) from **Acme Cyber Solutions** was flagged as **CRITICAL**:\n\n1. **Sanctions Hit**: Vendor Tax ID matched Internal Sanctions / OFAC registry (#IND-2026-904).\n2. **Temporal Anomaly**: Ingested at **03:42 AM IST** outside permitted 08:00–20:00 business submission window.\n3. **ML Risk Score**: **0.94 / 1.00** via **HistGradientBoosting** classifier.`;
        replyMetrics = {
          model: 'HistGradientBoosting + OFAC Rule',
          confidence: '99.2%',
          rule: 'SUPPLIER_BLACKLIST',
        };
        replyAction = {
          label: 'Investigate INV-2026-8802',
          path: '/exceptions?search=INV-2026-8802',
        };
      } else if (q.includes('duplicate') || q.includes('delta') || q.includes('8803') || q.includes('near')) {
        replyText = `**Near-Duplicate Detection Engine Analysis**:\n\n• **Invoice**: INV-2026-8803 (₹3,20,000) vs Prior Settled INV-2026-8740.\n• **TF-IDF + Cosine Similarity**: Evaluated at **98.4% text similarity** on line items (*CNC Machining Drill Bits*).\n• **Vendor Match**: 100% exact entity match for *Delta Industrial Supplies*.\n• **Recommendation**: Suspected accidental re-billing. Reject or request vendor confirmation.`;
        replyMetrics = {
          model: 'TF-IDF + Cosine Similarity',
          confidence: '98.4%',
          rule: 'DUPLICATE_INVOICE',
        };
        replyAction = {
          label: 'Open Duplicate Workbench',
          path: '/exceptions?search=INV-2026-8803',
        };
      } else if (q.includes('supply chain') || q.includes('department')) {
        replyText = `**Supply Chain Department Summary**:\n\n• **Total Flagged**: 298 exceptions (35.4% of total enterprise exceptions).\n• **Primary Driver**: Unapproved Warehousing Surcharges & Freight Rate variances exceeding PO limits.\n• **At-Risk Value**: ₹64,00,000.`;
        replyMetrics = {
          model: 'Department Anomaly Engine',
          confidence: '96.0%',
          rule: 'PO_AMOUNT_MISMATCH',
        };
      } else if (q.includes('model') || q.includes('algorithm') || q.includes('tech')) {
        replyText = `**Active AI & ML Pipeline Architecture**:\n\n1. **HistGradientBoosting**: Non-linear tabular classifier trained on historical AP transactions for anomaly scoring.\n2. **TF-IDF + Cosine Similarity Vectorizer**: Near-duplicate text & item matching across fuzzy descriptions.\n3. **Cryptographic Hash Collision**: Instant detection of duplicate amounts & PO references.\n4. **Spring Boot + PostgreSQL Security Layer**: Enforces JWT bearer auth and immutable audit trails.`;
        replyMetrics = {
          model: 'HistGradientBoosting + TF-IDF Vectorizer',
          confidence: '99.4%',
          rule: 'HYBRID_DETECTION_PIPELINE',
        };
      } else {
        replyText = `I analyzed your query against the active AP surveillance ledger. Currently, **842 exceptions** are under payment lock, with **124 classified as High/Critical** across Supply Chain, IT, and Marketing. Would you like to review the prioritized exception queue?`;
        replyAction = {
          label: 'View Prioritized Exceptions',
          path: '/exceptions',
        };
      }

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metrics: replyMetrics,
          suggestedAction: replyAction,
        },
      ]);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Copilot Drawer Panel */}
      <div className="relative w-full max-w-lg bg-slate-900 text-slate-100 shadow-2xl flex flex-col h-full z-10 border-l border-slate-800 animate-slide-in-right">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">FinSight AP Copilot</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-400/30 uppercase tracking-widest">
                  Conversational AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400">HistGradientBoosting & TF-IDF Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Suggestions:</span>
            {INITIAL_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-blue-600/30 hover:text-blue-300 text-slate-300 rounded-full text-[11px] font-medium transition border border-slate-700/80 whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2`}>
                  <div
                    className={`p-3.5 rounded-2xl ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/70 rounded-tl-xs shadow-md'
                    }`}
                  >
                    <div className="leading-relaxed whitespace-pre-line">{m.text}</div>
                    <span className="block text-[9px] text-slate-400 mt-1.5 text-right font-mono">
                      {m.timestamp}
                    </span>
                  </div>

                  {/* AI Metadata pill card */}
                  {m.metrics && (
                    <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Model: <strong className="text-slate-200 font-mono">{m.metrics.model}</strong></span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                          Conf: {m.metrics.confidence}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Contextual Action Button */}
                  {m.suggestedAction && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigate?.(m.suggestedAction!.path);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-semibold transition group"
                    >
                      <span className="flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                        {m.suggestedAction.label}
                      </span>
                      <span className="text-[10px] text-blue-400 font-mono">Execute →</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-2.5 items-center text-slate-400 text-xs">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[11px]">Evaluating ML weights & rule graphs...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-slate-800 bg-slate-950">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask Copilot about any invoice, anomaly score, or near-duplicate..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] text-slate-500">
            Powered by Enterprise Conversational AI • Bennett University Microsoft Hackathon 2026
          </div>
        </div>
      </div>
    </div>
  );
};
