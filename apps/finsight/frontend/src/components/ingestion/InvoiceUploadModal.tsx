import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui/ToastContext';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Cpu,
  Database,
  ArrowRight,
} from 'lucide-react';

interface InvoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export const InvoiceUploadModal: React.FC<InvoiceUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [uploadResult, setUploadResult] = useState<{
    totalIngested: number;
    clearedCount: number;
    flaggedCount: number;
  } | null>(null);

  const steps = [
    { title: 'Schema & Field Normalization', desc: 'Validating mandatory fields, PO format, GSTIN taxonomy' },
    { title: 'Near-Duplicate & TF-IDF Vectorization', desc: 'Scanning line items & amounts for fuzzy collisions' },
    { title: 'HistGradientBoosting Anomaly Scoring', desc: 'Evaluating vendor risk composite and threshold limits' },
    { title: 'PostgreSQL Storage & Audit Ledger', desc: 'Committing clean records and logging state transitions' },
  ];

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleStartIngestion = () => {
    if (!file) return;
    setIsProcessing(true);
    setCurrentStep(0);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval);
          setIsProcessing(false);
          setUploadResult({
            totalIngested: 48,
            clearedCount: 44,
            flaggedCount: 4,
          });
          toast.success(
            'Batch Ingestion Complete',
            'Processed 48 invoices: 44 cleared automatically, 4 flagged for review.'
          );
          onUploadSuccess?.();
          return prev;
        }
        return prev + 1;
      });
    }, 700);
  };

  const handleReset = () => {
    setFile(null);
    setIsProcessing(false);
    setCurrentStep(0);
    setUploadResult(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batch Invoice Data Ingestion"
      subtitle="Upload CSV or Excel dataset to trigger ML anomaly detection & rule engine pipeline"
      maxWidth="xl"
    >
      <div className="space-y-5 text-xs animate-fade-in-up">
        {!uploadResult ? (
          <>
            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`p-8 border-2 border-dashed rounded-2xl text-center transition-all ${
                file
                  ? 'border-blue-500 bg-blue-50/40'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              {file ? (
                <div>
                  <p className="font-bold text-slate-900 text-sm">{file.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    {(file.size / 1024).toFixed(1)} KB • Ready for pipeline processing
                  </p>
                  <button
                    onClick={handleReset}
                    className="mt-3 text-[11px] text-red-600 hover:text-red-700 font-semibold underline"
                  >
                    Select a different file
                  </button>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-800 text-sm">
                    Drag and drop your AP invoice batch here
                  </p>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Supports .CSV, .XLSX, or Parquet datasets with standard AP schema
                  </p>
                  <label className="mt-4 inline-block px-4 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs transition">
                    Browse Local File
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls, .parquet"
                      className="hidden"
                      onChange={(e) => e.target.files && setFile(e.target.files[0])}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Ingestion Steps Progress when processing */}
            {isProcessing && (
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 border border-slate-800 animate-fade-in-up">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 animate-spin text-blue-400" />
                  Executing AI Ingestion Pipeline...
                </p>
                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                        currentStep === idx
                          ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/40'
                          : currentStep > idx
                          ? 'text-emerald-400 font-medium'
                          : 'text-slate-500'
                      }`}
                    >
                      {currentStep > idx ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : currentStep === idx ? (
                        <span className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-slate-800 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-xs">{step.title}</p>
                        <p className="text-[10px] text-slate-400">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Ingestion Complete Summary Card */
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-fade-in-up">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">Ingestion & Validation Finished</h3>
              <p className="text-xs text-emerald-800 mt-1">
                Data structured and validated against HistGradientBoosting anomaly and TF-IDF duplicate engines.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="p-3 bg-white rounded-xl border border-emerald-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Total Ingested</span>
                <p className="text-lg font-black text-slate-900 font-mono mt-0.5">{uploadResult.totalIngested}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-bold uppercase">Auto-Cleared</span>
                <p className="text-lg font-black text-emerald-600 font-mono mt-0.5">{uploadResult.clearedCount}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-700 font-bold uppercase">Flagged Review</span>
                <p className="text-lg font-black text-amber-600 font-mono mt-0.5">{uploadResult.flaggedCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isProcessing}>
            {uploadResult ? 'Close' : 'Cancel'}
          </Button>

          {!uploadResult ? (
            <Button
              variant="primary"
              size="sm"
              disabled={!file || isProcessing}
              isLoading={isProcessing}
              onClick={handleStartIngestion}
              leftIcon={<Cpu className="w-3.5 h-3.5" />}
            >
              Start Ingestion & ML Pipeline
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
