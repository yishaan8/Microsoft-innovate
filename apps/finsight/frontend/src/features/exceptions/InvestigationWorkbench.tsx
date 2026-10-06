import React, { useState } from 'react';
import { ExceptionItem } from '../../types/exception';
import { exceptionApi } from '../../api/exceptionApi';
import { auditApi } from '../../api/auditApi';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/ToastContext';
import { formatCurrency, formatDateTime, getRiskScoreBadge } from '../../utils/formatters';
import { SEVERITY_COLORS, RULE_METADATA } from '../../utils/constants';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import {
  AlertOctagon,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  CheckCircle,
  XCircle,
  Send,
  Building,
  Info,
  Layers,
  FileCheck,
  FileX,
  Share2,
  Copy,
  Sparkles,
  GitCompare,
} from 'lucide-react';

interface InvestigationWorkbenchProps {
  exception: ExceptionItem | null;
  onClose: () => void;
  onActionComplete: () => void;
}

const COMMENT_PRESETS = [
  'Verified against PO addendum; dual approval recorded.',
  'Confirmed duplicate invoice submission with vendor desk.',
  'Requested revised tax invoice with valid GSTIN from supplier.',
  'Escalated to Corporate AML/Sanctions officer for manual review.',
];

export const InvestigationWorkbench: React.FC<InvestigationWorkbenchProps> = ({
  exception,
  onClose,
  onActionComplete,
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const [comment, setComment] = useState('');
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  if (!exception) return null;

  const sev = SEVERITY_COLORS[exception.severity] || SEVERITY_COLORS.HIGH;
  const ruleMeta = RULE_METADATA[exception.primaryRule];
  const riskBadge = getRiskScoreBadge(exception.supplierRiskScore);

  const handleAction = async (actionType: 'APPROVE_OVERRIDE' | 'REJECT' | 'ESCALATE' | 'DISMISS') => {
    try {
      setSubmittingAction(actionType);

      const justification = comment || `Action '${actionType}' verified and executed by ${user?.name} [${user?.role}].`;

      // 1. Send resolution to Backend Exception API
      await exceptionApi.resolveException({
        exceptionId: exception.id,
        action: actionType,
        comment: justification,
        escalateToRole: actionType === 'ESCALATE' ? 'LEGAL_COMPLIANCE' : undefined,
      });

      // 2. Append action to Audit Trail
      await auditApi.logAction({
        actor: {
          id: user?.id || 'usr-anon',
          name: user?.name || 'AP Analyst',
          role: user?.role || 'ANALYST',
          email: user?.email || 'analyst@finsight.microsoft.com',
        },
        action:
          actionType === 'APPROVE_OVERRIDE'
            ? 'OVERRIDE_APPROVED'
            : actionType === 'REJECT'
            ? 'INVOICE_REJECTED'
            : actionType === 'ESCALATE'
            ? 'ESCALATED_TO_RISK_TEAM'
            : 'EXCEPTION_DISMISSED',
        targetType: 'EXCEPTION',
        targetId: exception.id,
        previousState: exception.status,
        newState:
          actionType === 'APPROVE_OVERRIDE'
            ? 'APPROVED_OVERRIDE'
            : actionType === 'REJECT'
            ? 'REJECTED'
            : actionType === 'ESCALATE'
            ? 'ESCALATED'
            : 'DISMISSED',
        details: justification,
      });

      toast.success(
        `Exception ${actionType.replace('_', ' ')} Applied`,
        `Invoice ${exception.invoiceNumber} updated and logged to audit trail.`
      );

      onActionComplete();
      onClose();
    } catch (err) {
      console.error('Failed to resolve exception:', err);
      toast.error('Action Failed', 'Could not register exception resolution with the backend.');
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <Modal
      isOpen={!!exception}
      onClose={onClose}
      title={`Exception Investigation: ${exception.id}`}
      subtitle={`Explainable Rule Breakdown & Decision Protocol • ${exception.invoiceNumber}`}
      maxWidth="4xl"
    >
      <div className="space-y-6 text-xs animate-fade-in-up">
        {/* Top Summary Header with Enterprise Dark Surface */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 text-white shadow-lg border border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-bold">
              <AlertOctagon className="w-6 h-6 animate-pulse-glow rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white">{exception.invoiceNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${sev.badge}`}>
                  {exception.severity}
                </span>
                <span className="text-[10px] font-mono text-slate-400">PO: {exception.poNumber}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Vendor: <strong className="text-slate-200">{exception.supplierName}</strong> ({exception.supplierId}) • {exception.department}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">At-Risk Amount</span>
            <p className="text-xl font-black text-amber-300 font-mono">
              {formatCurrency(exception.amount, exception.currency)}
            </p>
          </div>
        </div>

        {/* 3 CORE QUESTIONS: WHAT, WHY, WHAT NEXT */}
        <div className="space-y-4">
          {/* 1. WHAT HAPPENED? */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider mb-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                1
              </div>
              <span>WHAT happened? (Ingestion Trigger)</span>
            </div>
            <p className="text-slate-700 leading-relaxed font-medium bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
              {exception.explanation.what}
            </p>
          </div>

          {/* 2. WHY DID IT HAPPEN? (Evidence & AI Telemetry) */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wider">
                <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                  2
                </div>
                <span>WHY did it happen? (Rule Evidence & Confidence)</span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                Rule Engine Verified
              </span>
            </div>

            <div className="space-y-3 bg-white p-4 rounded-lg border border-amber-200/80 shadow-2xs">
              <ul className="space-y-2">
                {exception.explanation.why.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <span className="leading-relaxed font-medium">{reason}</span>
                  </li>
                ))}
              </ul>

              {/* Side-by-side Duplicate Comparison if applicable */}
              {exception.duplicateOfInvoiceId && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 font-bold text-slate-800 mb-2">
                    <GitCompare className="w-4 h-4 text-indigo-600" />
                    <span>Duplicate Collision Analysis</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="p-2.5 bg-white rounded border border-slate-200">
                      <span className="font-bold text-slate-500 block">Current Ingestion</span>
                      <p className="font-mono font-bold text-slate-900 mt-1">{exception.invoiceNumber}</p>
                      <p className="text-slate-600">{formatCurrency(exception.amount)} • {exception.supplierName}</p>
                    </div>
                    <div className="p-2.5 bg-amber-50/70 rounded border border-amber-200">
                      <span className="font-bold text-amber-800 block">Matched Prior Settlement</span>
                      <p className="font-mono font-bold text-amber-900 mt-1">{exception.duplicateOfInvoiceId}</p>
                      <p className="text-amber-800">Exact hash collision (100% item & rate match)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rule Violation Meter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {exception.violations.map((violation, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{violation.ruleName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {violation.ruleCode}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-normal">{violation.triggerReason}</p>
                    {violation.confidenceScore && (
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Confidence Score</span>
                        <span className="font-bold font-mono text-blue-700">
                          {(violation.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. WHAT SHOULD I DO NEXT? */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
            <div className="flex items-center gap-2 text-blue-950 font-bold text-xs uppercase tracking-wider mb-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                3
              </div>
              <span>WHAT should I do next? (Standard Operating Procedure)</span>
            </div>
            <p className="text-slate-800 leading-relaxed font-semibold bg-white p-3.5 rounded-lg border border-blue-200/80 shadow-2xs">
              {exception.explanation.whatNext}
            </p>
          </div>
        </div>

        {/* Action Resolution Form */}
        <div className="pt-2 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block font-bold text-slate-800 text-xs">
              Analyst Resolution Justification & Audit Trail Note
            </label>
            <span className="text-[11px] text-slate-400">Recorded permanently in compliance ledger</span>
          </div>

          {/* Preset Chips */}
          <div className="flex flex-wrap gap-1.5">
            {COMMENT_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setComment(preset)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium transition"
              >
                + {preset}
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Document phone verification details, reason for override, or escalation ticket numbers..."
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel / Close
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {/* Dismiss */}
              <Button
                variant="outline"
                size="sm"
                isLoading={submittingAction === 'DISMISS'}
                onClick={() => handleAction('DISMISS')}
              >
                Dismiss (False Positive)
              </Button>

              {/* Escalate */}
              <Button
                variant="secondary"
                size="sm"
                isLoading={submittingAction === 'ESCALATE'}
                onClick={() => handleAction('ESCALATE')}
                leftIcon={<Share2 className="w-3.5 h-3.5 text-purple-600" />}
              >
                Escalate to Risk / Legal
              </Button>

              {/* Reject */}
              <Button
                variant="danger"
                size="sm"
                isLoading={submittingAction === 'REJECT'}
                onClick={() => handleAction('REJECT')}
                leftIcon={<FileX className="w-3.5 h-3.5" />}
              >
                Reject Invoice
              </Button>

              {/* Approve Override */}
              <Button
                variant="success"
                size="sm"
                isLoading={submittingAction === 'APPROVE_OVERRIDE'}
                onClick={() => handleAction('APPROVE_OVERRIDE')}
                leftIcon={<FileCheck className="w-3.5 h-3.5" />}
              >
                Approve with Override
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
