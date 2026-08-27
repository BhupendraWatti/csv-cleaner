import React from 'react';
import type { ExportFormat, VerificationReport } from '../../lib/types';

interface SuccessModalProps {
  isOpen: boolean;
  exportFormat: ExportFormat;
  verificationReport: VerificationReport | null;
  lastExportedStats: { rowsRemoved: number; cellsModified: number };
  onClose: () => void;
}

export default function SuccessModal({
  isOpen,
  exportFormat,
  verificationReport,
  lastExportedStats,
  onClose,
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#161d1f]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#c1c8c2] text-center space-y-4 animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-[#c1ecd4] text-[#012d1d] mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl">check_circle</span>
        </div>

        <h3 className="text-2xl font-bold text-[#012d1d] font-display">Export Complete!</h3>

        <div className="bg-[#eef5f7] rounded-xl p-4 text-xs space-y-2 border border-[#c1c8c2]/50">
          <div className="flex justify-between text-[#414844]">
            <span>Verification Status:</span>
            <span className="font-bold text-[#012d1d]">
              {verificationReport?.isValid ? '✅ Verified Valid' : '⚠️ Unverified'}
            </span>
          </div>
          <div className="flex justify-between text-[#414844]">
            <span>Cells Modified:</span>
            <span className="font-mono font-bold text-[#161d1f]">{lastExportedStats.cellsModified}</span>
          </div>
          <div className="flex justify-between text-[#414844]">
            <span>Rows Purged / Quarantined:</span>
            <span className="font-mono font-bold text-[#161d1f]">{lastExportedStats.rowsRemoved}</span>
          </div>
          <div className="flex justify-between text-[#414844]">
            <span>Format Exported:</span>
            <span className="font-bold uppercase text-[#012d1d]">{exportFormat}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#012d1d] text-white font-semibold text-xs uppercase tracking-wider py-3 rounded-lg hover:bg-[#1b4332] shadow-xs"
        >
          Back to Workspace
        </button>
      </div>
    </div>
  );
}
