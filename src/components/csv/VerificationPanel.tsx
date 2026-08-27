import React from 'react';
import type { VerificationReport } from '../../lib/types';

interface VerificationPanelProps {
  report: VerificationReport | null;
}

export default function VerificationPanel({ report }: VerificationPanelProps) {
  if (!report) return null;

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      report.isValid
        ? 'bg-[#c1ecd4]/30 border-[#012d1d]/40'
        : 'bg-[#ffdad6]/40 border-[#ba1a1a]'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c1c8c2]/50 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            report.isValid ? 'bg-[#012d1d] text-white' : 'bg-[#ba1a1a] text-white'
          }`}>
            <span className="material-symbols-outlined text-lg">
              {report.isValid ? 'verified' : 'gpp_bad'}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-bold font-display text-[#161d1f]">
              {report.isValid ? 'Post-Cleaning Verification Passed' : 'Verification Issue Detected'}
            </h4>
            <p className="text-[11px] text-[#414844]">
              {report.isValid
                ? 'Output file re-parsed and structurally verified.'
                : report.error || 'Re-parsed CSV output failed validation checks.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="text-right">
            <span className="text-[10px] text-[#57615c] uppercase block font-bold">Rows</span>
            <span className="font-bold text-[#161d1f]">
              {report.beforeStats.rowCount} → {report.afterStats.rowCount}
            </span>
          </div>
          <div className="text-right border-l border-[#c1c8c2]/60 pl-3">
            <span className="text-[10px] text-[#57615c] uppercase block font-bold">Columns</span>
            <span className="font-bold text-[#161d1f]">
              {report.beforeStats.columnCount} → {report.afterStats.columnCount}
            </span>
          </div>
        </div>
      </div>

      {/* VERIFICATION MESSAGES LOG */}
      <div className="space-y-1">
        {report.messages.map((msg, index) => (
          <p key={index} className="text-[11px] font-mono text-[#161d1f] flex items-center gap-1.5">
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
}
