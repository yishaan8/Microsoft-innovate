import React from 'react';
import { Invoice } from '../../types/invoice';
import { formatCurrency, formatDate, formatDateTime, getRiskScoreBadge } from '../../utils/formatters';
import { INVOICE_STATUS_COLORS } from '../../utils/constants';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  X,
  FileText,
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Receipt,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InvoiceDetailsDrawerProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoiceDetailsDrawer: React.FC<InvoiceDetailsDrawerProps> = ({ invoice, onClose }) => {
  const navigate = useNavigate();

  if (!invoice) return null;

  const statusStyle = INVOICE_STATUS_COLORS[invoice.status] || INVOICE_STATUS_COLORS.UNDER_REVIEW;
  const riskBadge = getRiskScoreBadge(invoice.riskScore);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full z-10 border-l border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{invoice.invoiceNumber}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle.badge}`}>
                  {invoice.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">PO Ref: {invoice.poNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Risk Alert Callout if exceptions exist */}
          {invoice.exceptionCount > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-xs">
                    {invoice.exceptionCount} Rule Exception{invoice.exceptionCount > 1 ? 's' : ''} Flagged
                  </h4>
                  <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                    This invoice was flagged during ingestion and requires verification before payment clearance.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/exceptions?search=${invoice.invoiceNumber}`);
                }}
                rightIcon={<ExternalLink className="w-3 h-3" />}
              >
                Inspect
              </Button>
            </div>
          )}

          {/* Core Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Amount</span>
              <p className="text-base font-extrabold text-slate-900 mt-0.5">
                {formatCurrency(invoice.amount, invoice.currency)}
              </p>
              {invoice.vatAmount && (
                <span className="text-[10px] text-slate-500">
                  Incl. GST/VAT: {formatCurrency(invoice.vatAmount, invoice.currency)}
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Supplier Risk Composite</span>
              <div className="mt-1">
                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${riskBadge.className}`}>
                  {riskBadge.label}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Supplier</span>
              <p className="font-semibold text-slate-900 mt-0.5">{invoice.supplierName}</p>
              <span className="text-[10px] text-slate-500">ID: {invoice.supplierId}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Department</span>
              <p className="font-semibold text-slate-900 mt-0.5">{invoice.department}</p>
              <span className="text-[10px] text-slate-500">Terms: {invoice.paymentTerms || 'Net 30'}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Invoice Date</span>
              <p className="font-medium text-slate-800 mt-0.5">{formatDate(invoice.invoiceDate)}</p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Submission Ingestion Time</span>
              <p className="font-medium text-slate-800 mt-0.5">{formatDateTime(invoice.submissionDate)}</p>
            </div>
          </div>

          {/* Line Items Table */}
          {invoice.lineItems && invoice.lineItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Receipt className="w-4 h-4 text-blue-600" /> Line Items Breakdown ({invoice.lineItems.length})
                </h4>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-[10px] uppercase">
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">PO 3-Way Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{item.description}</td>
                        <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(item.totalPrice, invoice.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.poMatch ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Matched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-500" /> Variance
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Notes & Ingestion Evidence */}
          {invoice.notes && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-1">Ingestion Notes & Telemetry</span>
              <p className="text-slate-600 leading-relaxed">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            {invoice.exceptionCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/exceptions?search=${invoice.invoiceNumber}`);
                }}
                leftIcon={<AlertTriangle className="w-3.5 h-3.5" />}
              >
                Go to Exception Investigation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
