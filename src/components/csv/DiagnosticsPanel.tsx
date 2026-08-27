import React from 'react';
import type { DiagnosticReport, DiagnosticIssue, SafetyLevel } from '../../lib/types';

interface DiagnosticsPanelProps {
  report: DiagnosticReport | null;
  selectedIssues: Set<string>;
  onToggleIssue: (issueId: string) => void;
  onApplySafeFixes: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function DiagnosticsPanel({
  report,
  selectedIssues,
  onToggleIssue,
  onApplySafeFixes,
  onSelectAll,
  onDeselectAll,
}: DiagnosticsPanelProps) {
  if (!report) return null;

  const safeIssueIds = report.issues
    .filter(i => i.safetyLevel === 'safe')
    .map(i => i.id);

  const isAllSafeSelected = safeIssueIds.every(id => selectedIssues.has(id));

  return (
    <div className="bg-white rounded-xl p-5 border border-[#c1c8c2] shadow-ambient space-y-4">
      {/* HEADER SCORE */}
      <div className="flex items-center justify-between border-b border-[#c1c8c2] pb-3">
        <div>
          <h3 className="text-base font-bold text-[#012d1d] font-display">Health Diagnostics</h3>
          <p className="text-xs text-[#414844]">{report.issues.length} issue types detected</p>
        </div>
        <div className="text-right flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-2xl font-extrabold text-[#012d1d] font-display">{report.healthScore}/100</span>
            <span className="text-[9px] text-[#414844] font-bold tracking-wider uppercase">HEALTH SCORE</span>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f4fafd] p-2.5 rounded-lg border border-[#c1c8c2]/50 text-xs">
        <button
          onClick={onApplySafeFixes}
          className="bg-[#012d1d] text-white text-[11px] font-bold px-3 py-1.5 rounded-md hover:bg-[#1b4332] transition-all flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">verified_user</span>
          Apply Safe Fixes
        </button>

        <div className="flex items-center gap-2 text-[11px]">
          <button onClick={onSelectAll} className="text-[#012d1d] hover:underline font-semibold">
            Select All
          </button>
          <span className="text-[#c1c8c2]">|</span>
          <button onClick={onDeselectAll} className="text-[#57615c] hover:underline">
            Deselect All
          </button>
        </div>
      </div>

      {/* ISSUE LIST */}
      {report.issues.length === 0 ? (
        <div className="bg-[#c1ecd4]/40 border border-[#012d1d]/20 rounded-lg p-4 text-center">
          <span className="material-symbols-outlined text-3xl text-[#002114] mb-1">check_circle</span>
          <p className="text-xs font-bold text-[#002114]">No issues found! Your dataset is clean.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {report.issues.map((issue) => {
            const isChecked = selectedIssues.has(issue.id);
            return (
              <div
                key={issue.id}
                className={`p-3 rounded-lg border transition-all ${
                  isChecked ? 'border-[#012d1d] bg-[#f4fafd]' : 'border-[#c1c8c2]/60 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {/* SEVERITY BADGE */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          issue.severity === 'critical'
                            ? 'bg-[#ffdad6] text-[#ba1a1a]'
                            : issue.severity === 'warning'
                            ? 'bg-[#ffdcc4] text-[#5f2f00]'
                            : 'bg-[#dde4e6] text-[#414844]'
                        }`}
                      >
                        {issue.severity === 'critical' ? '🔴 Critical' : issue.severity === 'warning' ? '🟠 Warning' : '🟡 Info'}
                      </span>

                      {/* SAFETY LEVEL BADGE */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          issue.safetyLevel === 'safe'
                            ? 'bg-[#c1ecd4] text-[#002114]'
                            : issue.safetyLevel === 'review-recommended'
                            ? 'bg-[#ffe8d6] text-[#6b3800]'
                            : 'bg-[#ffdad6] text-[#ba1a1a]'
                        }`}
                      >
                        {issue.safetyLevel === 'safe'
                          ? 'Safe'
                          : issue.safetyLevel === 'review-recommended'
                          ? 'Review Recommended'
                          : 'Potentially Destructive'}
                      </span>

                      <span className="text-[10px] text-[#717973] font-mono ml-auto">
                        {issue.count} affected
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#161d1f] mb-0.5">{issue.title}</h4>
                    <p className="text-[11px] text-[#414844] leading-snug">{issue.explanation}</p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleIssue(issue.id)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-[#dde4e6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#012d1d]"></div>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
