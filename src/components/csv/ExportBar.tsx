import React from 'react';
import type { ExportFormat, VerificationReport } from '../../lib/types';

interface ExportBarProps {
  exportFormat: ExportFormat;
  onExportFormatChange: (format: ExportFormat) => void;
  onExport: () => void;
  verificationReport: VerificationReport | null;
  isProcessing: boolean;
}

export default function ExportBar({
  exportFormat,
  onExportFormatChange,
  onExport,
  verificationReport,
  isProcessing,
}: ExportBarProps) {
  const isDownloadDisabled = isProcessing || (verificationReport !== null && !verificationReport.isValid);

  return (
    <div className="bg-white p-5 rounded-xl border border-[#c1c8c2] shadow-ambient flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h4 className="text-base font-bold text-[#012d1d] font-display flex items-center gap-2">
          Export Cleaned Dataset
          {verificationReport?.isValid && (
            <span className="bg-[#c1ecd4] text-[#002114] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#012d1d]/30">
              Verified
            </span>
          )}
        </h4>
        <p className="text-xs text-[#414844]">
          Download your verified, sanitized spreadsheet in your choice of format.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        <select
          value={exportFormat}
          onChange={(e) => onExportFormatChange(e.target.value as ExportFormat)}
          className="bg-[#f4fafd] border border-[#c1c8c2] rounded-lg px-3 py-2 text-xs font-bold text-[#012d1d] focus:outline-none focus:border-[#012d1d]"
        >
          <option value="csv">CSV (.csv)</option>
          <option value="tsv">TSV (.tsv)</option>
          <option value="json">JSON (.json)</option>
          <option value="xlsx">Excel (.xlsx)</option>
        </select>

        <button
          disabled={isDownloadDisabled}
          onClick={onExport}
          className="flex-1 sm:flex-initial bg-[#012d1d] text-white text-xs font-semibold uppercase tracking-wider px-6 py-2.5 rounded-lg hover:bg-[#1b4332] shadow-ambient transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Download Dataset
        </button>
      </div>
    </div>
  );
}
