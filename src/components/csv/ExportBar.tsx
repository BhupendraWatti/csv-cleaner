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
    <div className="bg-white dark:bg-[#0e2019] p-5 rounded-xl border border-[#c1c8c2] dark:border-[#1b3b2f] shadow-ambient flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-200">
      <div>
        <h4 className="text-base font-bold text-[#012d1d] dark:text-[#f0fdf4] font-display flex items-center gap-2">
          Export Cleaned Dataset
          {verificationReport?.isValid && (
            <span className="bg-[#c1ecd4] dark:bg-[#104430] text-[#002114] dark:text-[#34d399] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#012d1d]/30 dark:border-[#34d399]/40">
              Verified
            </span>
          )}
        </h4>
        <p className="text-xs text-[#414844] dark:text-[#94a3b8]">
          Download your verified, sanitized spreadsheet in your choice of format.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        <select
          value={exportFormat}
          onChange={(e) => onExportFormatChange(e.target.value as ExportFormat)}
          className="bg-[#f4fafd] dark:bg-[#0a1713] border border-[#c1c8c2] dark:border-[#1b3b2f] rounded-lg px-3 py-2 text-xs font-bold text-[#012d1d] dark:text-[#f0fdf4] focus:outline-none focus:border-[#012d1d] dark:focus:border-[#34d399]"
        >
          <option value="csv" className="dark:bg-[#0e2019]">CSV (.csv)</option>
          <option value="tsv" className="dark:bg-[#0e2019]">TSV (.tsv)</option>
          <option value="json" className="dark:bg-[#0e2019]">JSON (.json)</option>
          <option value="xlsx" className="dark:bg-[#0e2019]">Excel (.xlsx)</option>
        </select>

        <button
          disabled={isDownloadDisabled}
          onClick={onExport}
          className="flex-1 sm:flex-initial bg-[#012d1d] dark:bg-[#34d399] text-white dark:text-[#002114] text-xs font-semibold uppercase tracking-wider px-6 py-2.5 rounded-lg hover:bg-[#1b4332] dark:hover:bg-[#2dd4bf] shadow-ambient transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Download Dataset
        </button>
      </div>
    </div>
  );
}
