import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { parseCSV, parseSampleCSV, unparseCSV } from '../lib/parser';
import { parseAndDiagnoseAsync, cleanAndVerifyAsync } from '../lib/workerClient';
import { getSampleCSV } from '../lib/cleaner';
import { trackEvent } from '../lib/analytics';
import type {
  ParsedCSV,
  DiagnosticReport,
  CleanedResult,
  VerificationReport,
  HeaderCaseOption,
  FindAndReplaceConfig,
  ExportFormat,
} from '../lib/types';
import * as XLSX from 'xlsx';


import ToastBanner, { type ToastMessage } from './csv/ToastBanner';
import UploadZone from './csv/UploadZone';
import DiagnosticsPanel from './csv/DiagnosticsPanel';
import TransformControls from './csv/TransformControls';
import DataTable from './csv/DataTable';
import VerificationPanel from './csv/VerificationPanel';
import ExportBar from './csv/ExportBar';
import FindReplaceModal from './csv/FindReplaceModal';
import SuccessModal from './csv/SuccessModal';

export default function CSVCleaner() {
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [cleanedResult, setCleanedResult] = useState<CleanedResult | null>(null);
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [unparsedCSV, setUnparsedCSV] = useState<string>('');

  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // View & Filter States
  const [viewMode, setViewMode] = useState<'preview' | 'original'>('preview');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'errors' | 'duplicates' | 'quarantined'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Custom Transformations
  const [headerCase, setHeaderCase] = useState<HeaderCaseOption>('snake_case');
  const [applyHeaderCaseToggle, setApplyHeaderCaseToggle] = useState(false);
  const [missingValueReplacement, setMissingValueReplacement] = useState('');
  const [applyImputationToggle, setApplyImputationToggle] = useState(false);

  // Find and Replace Modal
  const [showFindReplaceModal, setShowFindReplaceModal] = useState(false);
  const [findReplace, setFindReplace] = useState<FindAndReplaceConfig>({
    search: '',
    replace: '',
    isRegex: false,
    matchCase: false,
  });

  // Export Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [lastExportedStats, setLastExportedStats] = useState({ rowsRemoved: 0, cellsModified: 0 });

  const addToast = (type: 'error' | 'warning' | 'info' | 'success', title: string, message: string) => {
    const id = String(Date.now() + Math.random());
    setToasts(prev => [...prev.slice(-3), { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Safe Session Storage Saving — only flag user-uploaded files for restore
  const saveSession = (data: ParsedCSV, isUserUpload = false) => {
    try {
      const jsonStr = JSON.stringify(data);
      if (jsonStr.length < 4 * 1024 * 1024) {
        sessionStorage.setItem('csv_cleaner_active_session', jsonStr);
      } else {
        sessionStorage.setItem(
          'csv_cleaner_active_session',
          JSON.stringify({ ...data, raw: '', rows: data.rows.slice(0, 100) })
        );
      }
      if (isUserUpload) {
        sessionStorage.setItem('csv_user_uploaded', 'true');
      }
    } catch (e) {
      console.warn('Unable to persist session to sessionStorage:', e);
    }
  };

  // Process CSV Parsing & Diagnostic Analysis Async
  const processCSVData = useCallback(async (rawCSV: string, fileName: string, fileSize: number) => {
    setIsProcessing(true);
    trackEvent('file_upload_started', {
      file_size_kb: Math.round(fileSize / 1024),
      extension: fileName.split('.').pop() || 'csv',
    });

    try {
      const { parsed: parsedData, report: diagnosticReport } = await parseAndDiagnoseAsync(
        rawCSV,
        fileName,
        fileSize
      );

      setParsed(parsedData);
      setReport(diagnosticReport);

      trackEvent('file_parsed', {
        row_count: parsedData.rowCount,
        column_count: parsedData.columnCount,
        health_score: diagnosticReport.healthScore,
        issues_count: diagnosticReport.issues.length,
      });

      // Auto-select issues with 'safe' level
      const safeIssues = diagnosticReport.issues
        .filter(issue => issue.safetyLevel === 'safe')
        .map(issue => issue.id);
      setSelectedIssues(new Set(safeIssues));

      // isUserUpload determined by caller — passed via processCSVData options
      saveSession(parsedData, (rawCSV !== getSampleCSV()));

      if (parsedData.isEmptyFile) {
        addToast('warning', 'Empty File Loaded', 'The CSV file contains no data rows.');
      } else if (parsedData.hasBOM) {
        addToast('info', 'BOM Stripped', 'UTF-8 Byte Order Mark (BOM) was detected and automatically stripped.');
      }
    } catch (error) {
      addToast('error', 'Parse Error', error instanceof Error ? error.message : 'Failed to parse CSV');
      trackEvent('error_occurred', { stage: 'parse', error: error instanceof Error ? error.message : 'unknown' });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Process Cleaning & Verification whenever options or selected issues change
  const runCleaningAndVerification = useCallback(async () => {
    if (!parsed || !report) return;

    const activeIssues = report.issues.filter(issue => selectedIssues.has(issue.id));

    if (applyHeaderCaseToggle && !activeIssues.some(i => i.type === 'header-case')) {
      activeIssues.push({
        id: 'header-case-custom',
        type: 'header-case',
        severity: 'info',
        title: 'Header Casing',
        explanation: 'Format headers',
        affectedRows: [],
        count: parsed.headers.length,
        safetyLevel: 'safe',
      });
    }

    try {
      const { cleanedResult: res, unparsedCSV: csvStr, verificationReport: verReport } = await cleanAndVerifyAsync(
        parsed,
        activeIssues,
        {
          headerCase: applyHeaderCaseToggle ? headerCase : undefined,
          findReplace: findReplace.search ? findReplace : undefined,
          missingValueReplacement: applyImputationToggle ? missingValueReplacement : undefined,
        }
      );

      setCleanedResult(res);
      setUnparsedCSV(csvStr);
      setVerificationReport(verReport);
    } catch (err) {
      addToast('error', 'Cleaning Error', err instanceof Error ? err.message : 'Transformation failed');
    }
  }, [parsed, report, selectedIssues, applyHeaderCaseToggle, headerCase, findReplace, applyImputationToggle, missingValueReplacement]);

  // Trigger cleaning pipeline when dependencies change
  useEffect(() => {
    runCleaningAndVerification();
  }, [runCleaningAndVerification]);

  // Keep the server-rendered header trust signal aligned with the active dataset.
  useEffect(() => {
    if (!report) return;

    const score = Math.max(0, Math.min(100, report.healthScore));
    const badge = document.getElementById('header-health-badge');
    const scoreLabel = document.getElementById('header-health-score');
    const circle = document.getElementById('header-health-circle');
    const icon = document.getElementById('header-health-icon');

    if (scoreLabel) scoreLabel.textContent = `${score}/100`;
    if (circle) circle.setAttribute('stroke-dasharray', `${score}, 100`);
    if (icon) icon.textContent = score >= 80 ? 'check_circle' : score >= 50 ? 'warning' : 'error';
    if (badge) badge.setAttribute('aria-label', `Current dataset health score: ${score} out of 100`);
  }, [report]);

  // Initial Load: ONLY restore if user explicitly loaded a real file (not a demo).
  // We track user-uploaded sessions with a flag 'csv_user_uploaded'.
  // If no user file is in session, always show the Upload Zone (never auto-load sample).
  useEffect(() => {
    const wasUserUploaded = sessionStorage.getItem('csv_user_uploaded') === 'true';
    if (!wasUserUploaded) return; // Show Upload Zone by default

    const cached = sessionStorage.getItem('csv_cleaner_active_session');
    if (cached) {
      try {
        const data: ParsedCSV = JSON.parse(cached);
        if (data.raw) {
          processCSVData(data.raw, data.fileName, data.fileSize);
          return;
        }
      } catch (e) {
        sessionStorage.removeItem('csv_cleaner_active_session');
        sessionStorage.removeItem('csv_user_uploaded');
      }
    }
  }, [processCSVData]);

  const handleFileUpload = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      addToast('error', 'File Size Limit Exceeded', 'File size exceeds the 25MB client-side processing limit.');
      return;
    }

    try {
      const text = await file.text();
      processCSVData(text, file.name, file.size);
    } catch (error) {
      addToast('error', 'Read Error', 'Failed to read file contents from disk.');
    }
  };

  const handleSampleLoad = () => {
    const sampleCSV = getSampleCSV();
    processCSVData(sampleCSV, 'sample_contacts.csv', new Blob([sampleCSV]).size);
  };

  const handleResetToUpload = () => {
    setParsed(null);
    setReport(null);
    setCleanedResult(null);
    setVerificationReport(null);
    sessionStorage.removeItem('csv_cleaner_active_session');
    sessionStorage.removeItem('csv_user_uploaded');
  };

  const toggleIssue = (issueId: string) => {
    setSelectedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  };

  const handleApplySafeFixes = () => {
    if (!report) return;
    const safeIssues = report.issues.filter(i => i.safetyLevel === 'safe').map(i => i.id);
    setSelectedIssues(new Set(safeIssues));
    addToast('success', 'Safe Fixes Selected', 'All safe non-destructive transformations enabled.');
  };

  const handleSelectAll = () => {
    if (!report) return;
    setSelectedIssues(new Set(report.issues.map(i => i.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIssues(new Set());
  };

  const handleExport = (format: ExportFormat) => {
    if (!parsed || !cleanedResult) return;

    if (verificationReport && !verificationReport.isValid) {
      addToast('error', 'Export Blocked', 'Post-cleaning verification failed. Resolve dataset errors before exporting.');
      return;
    }

    setLastExportedStats({
      rowsRemoved: cleanedResult.rowsRemoved,
      cellsModified: cleanedResult.cellsModified,
    });

    const fileNameBase = parsed.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.(csv|tsv|txt)$/i, '');

    if (format === 'csv' || format === 'tsv') {
      const delimiter = format === 'tsv' ? '\t' : ',';
      const outputStr = unparseCSV(cleanedResult.cleanedHeaders, cleanedResult.cleanedRows, delimiter);
      downloadFile(outputStr, `${fileNameBase}_cleaned.${format}`, format === 'tsv' ? 'text/tab-separated-values' : 'text/csv');
    } else if (format === 'json') {
      const jsonObjects = cleanedResult.cleanedRows.map(row => {
        const obj: Record<string, string> = {};
        cleanedResult.cleanedHeaders.forEach((h, idx) => {
          obj[h] = row[idx] || '';
        });
        return obj;
      });
      downloadFile(JSON.stringify(jsonObjects, null, 2), `${fileNameBase}_cleaned.json`, 'application/json');
    } else if (format === 'xlsx') {
      const wsData = [cleanedResult.cleanedHeaders, ...cleanedResult.cleanedRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Cleaned Data');
      XLSX.writeFile(wb, `${fileNameBase}_cleaned.xlsx`);
    }

    setShowSuccessModal(true);
    trackEvent('download_completed', {
      format,
      rows_exported: cleanedResult.cleanedRows.length,
      cells_modified: cleanedResult.cellsModified,
      rows_removed: cleanedResult.rowsRemoved,
    });
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeHeaders = viewMode === 'preview' ? (cleanedResult?.cleanedHeaders || []) : (parsed?.headers || []);
  const activeRows = viewMode === 'preview' ? (cleanedResult?.cleanedRows || []) : (parsed?.rows || []);

  return (
    <div className="w-full space-y-6">
      <ToastBanner toasts={toasts} onDismiss={removeToast} />

      {!parsed ? (
        <UploadZone
          onFileUpload={handleFileUpload}
          onLoadSample={handleSampleLoad}
          isProcessing={isProcessing}
        />
      ) : (
        <>
          {/* TOP ACTION BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0e2019] p-4 rounded-xl border border-[#c1c8c2] dark:border-[#1b3b2f] shadow-xs transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#c1ecd4]/60 dark:bg-[#104430] flex items-center justify-center text-[#012d1d] dark:text-[#34d399] shrink-0">
                <span className="material-symbols-outlined">description</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-[#161d1f] dark:text-[#f0fdf4] font-display flex flex-wrap items-center gap-2 truncate">
                  <span className="truncate max-w-[200px] sm:max-w-xs">{parsed.fileName}</span>
                  <span className="bg-[#e8eff1] dark:bg-[#162f25] text-[#012d1d] dark:text-[#34d399] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#c1c8c2]/50 dark:border-[#1b3b2f] uppercase shrink-0">
                    {Math.round(parsed.fileSize / 1024)} KB
                  </span>
                </h2>
                <p className="text-xs text-[#414844] dark:text-[#94a3b8] truncate">
                  {parsed.rowCount} rows • {parsed.columnCount} cols • Delimiter: <span className="font-mono font-bold">"{parsed.delimiter}"</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleResetToUpload}
                className="px-3.5 py-2 rounded-lg bg-[#012d1d] dark:bg-[#34d399] text-white dark:text-[#002114] text-xs font-semibold uppercase tracking-wider hover:bg-[#1b4332] dark:hover:bg-[#2dd4bf] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">upload</span>
                Upload New File
              </button>

              <button
                onClick={handleSampleLoad}
                className="px-3 py-2 rounded-lg border border-[#c1c8c2] dark:border-[#1b3b2f] text-xs font-semibold text-[#57615c] dark:text-[#94a3b8] hover:text-[#012d1d] dark:hover:text-[#34d399] hover:bg-[#f4fafd] dark:hover:bg-[#162f25] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                Reload Demo
              </button>
            </div>
          </div>

          {/* WORKSPACE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT PANEL */}
            <aside className="lg:col-span-4 flex flex-col gap-6">
              <DiagnosticsPanel
                report={report}
                selectedIssues={selectedIssues}
                onToggleIssue={toggleIssue}
                onApplySafeFixes={handleApplySafeFixes}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
              />

              <TransformControls
                headerCase={headerCase}
                applyHeaderCaseToggle={applyHeaderCaseToggle}
                onHeaderCaseChange={setHeaderCase}
                onApplyHeaderCaseToggleChange={setApplyHeaderCaseToggle}
                missingValueReplacement={missingValueReplacement}
                applyImputationToggle={applyImputationToggle}
                onMissingValueReplacementChange={setMissingValueReplacement}
                onApplyImputationToggleChange={setApplyImputationToggle}
                onOpenFindReplaceModal={() => setShowFindReplaceModal(true)}
              />
            </aside>

            {/* MAIN DATA & EXPORT */}
            <section className="lg:col-span-8 flex flex-col gap-6" aria-label="CSV preview and export">
              <DataTable
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                headers={activeHeaders}
                rows={activeRows}
                rawRows={parsed.rows}
                quarantinedRows={cleanedResult?.quarantinedRows || []}
                filterSeverity={filterSeverity}
                onFilterSeverityChange={setFilterSeverity}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />

              <VerificationPanel report={verificationReport} />

              <ExportBar
                exportFormat={exportFormat}
                onExportFormatChange={setExportFormat}
                onExport={() => handleExport(exportFormat)}
                verificationReport={verificationReport}
                isProcessing={isProcessing}
              />
            </section>
          </div>

          {/* MODALS */}
          <FindReplaceModal
            isOpen={showFindReplaceModal}
            findReplace={findReplace}
            onFindReplaceChange={setFindReplace}
            onClose={() => setShowFindReplaceModal(false)}
            onApply={() => {
              setShowFindReplaceModal(false);
              runCleaningAndVerification();
            }}
          />

          <SuccessModal
            isOpen={showSuccessModal}
            exportFormat={exportFormat}
            verificationReport={verificationReport}
            lastExportedStats={lastExportedStats}
            onClose={() => setShowSuccessModal(false)}
          />
        </>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-[#0e2019] rounded-2xl p-8 text-center shadow-2xl border border-[#c1c8c2] dark:border-[#1b3b2f] space-y-3 max-w-sm mx-4">
            <div className="animate-spin w-10 h-10 border-4 border-[#012d1d] dark:border-[#34d399] border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm font-bold text-[#161d1f] dark:text-[#f0fdf4] font-display">Processing CSV in Background Worker...</p>
            <p className="text-xs text-[#57615c] dark:text-[#94a3b8]">Parsing, diagnosing, and verifying structural integrity</p>
          </div>
        </div>
      )}
    </div>
  );
}
