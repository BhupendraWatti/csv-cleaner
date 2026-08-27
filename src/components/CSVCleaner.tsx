import { useState, useEffect } from 'react';
import { parseCSV, parseSampleCSV, unparseCSV } from '../lib/parser';
import { diagnoseCSV } from '../lib/diagnostics';
import { cleanCSV, getSampleCSV } from '../lib/cleaner';
import type { ParsedCSV, DiagnosticReport, HeaderCaseOption, FindAndReplaceConfig, ExportFormat } from '../lib/types';
import * as XLSX from 'xlsx';

export default function CSVCleaner() {
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // View & Filter States
  const [viewMode, setViewMode] = useState<'preview' | 'original'>('preview');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'errors' | 'duplicates'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Transformations
  const [headerCase, setHeaderCase] = useState<HeaderCaseOption>('snake_case');
  const [applyHeaderCaseToggle, setApplyHeaderCaseToggle] = useState(false);
  const [missingValueReplacement, setMissingValueReplacement] = useState('');
  const [applyImputationToggle, setApplyImputationToggle] = useState(false);

  // Find and Replace state
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

  // Session persistence on mount
  useEffect(() => {
    const cached = sessionStorage.getItem('csv_cleaner_active_session');
    if (cached) {
      try {
        const data: ParsedCSV = JSON.parse(cached);
        loadParsedCSVData(data);
      } catch (e) {
        handleSampleLoad();
      }
    } else {
      handleSampleLoad();
    }
  }, []);

  const loadParsedCSVData = (data: ParsedCSV) => {
    setParsed(data);
    const diagnostic = diagnoseCSV(data);
    setReport(diagnostic);

    const safeIssues = diagnostic.issues
      .filter(issue => issue.safetyLevel === 'safe')
      .map(issue => issue.id);
    setSelectedIssues(new Set(safeIssues));

    updateHealthBadge(diagnostic.healthScore);
    sessionStorage.setItem('csv_cleaner_active_session', JSON.stringify(data));
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit.');
      return;
    }

    setIsProcessing(true);
    try {
      const parsedData = await parseCSV(file);
      loadParsedCSVData(parsedData);
    } catch (error) {
      alert(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSampleLoad = () => {
    const sampleCSV = getSampleCSV();
    const parsedData = parseSampleCSV(sampleCSV, 'sample_contacts.csv');
    loadParsedCSVData(parsedData);
  };

  const updateHealthBadge = (score: number) => {
    const scoreElement = document.getElementById('header-health-score');
    const circleElement = document.getElementById('header-health-circle');
    if (scoreElement) scoreElement.textContent = `${score}/100`;
    if (circleElement) circleElement.setAttribute('stroke-dasharray', `${score}, 100`);
  };

  const toggleIssue = (issueId: string) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedIssues(newSelected);
  };

  // Compute Cleaned / Transformed Data
  const getProcessedData = () => {
    if (!parsed || !report) return { headers: [], rows: [], stats: { rowsRemoved: 0, cellsModified: 0 } };

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

    const result = cleanCSV(parsed, activeIssues, {
      headerCase: applyHeaderCaseToggle ? headerCase : undefined,
      findReplace: findReplace.search ? findReplace : undefined,
      missingValueReplacement: applyImputationToggle ? missingValueReplacement : undefined,
    });

    return {
      headers: result.cleanedHeaders,
      rows: result.cleanedRows,
      stats: { rowsRemoved: result.rowsRemoved, cellsModified: result.cellsModified },
    };
  };

  const processedData = getProcessedData();
  const activeHeaders = viewMode === 'preview' ? processedData.headers : (parsed?.headers || []);
  const rawRows = viewMode === 'preview' ? processedData.rows : (parsed?.rows || []);

  // Filter Rows
  const filteredRows = rawRows.filter((row, rowIndex) => {
    if (searchQuery.trim()) {
      const match = row.some(cell => cell.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!match) return false;
    }

    if (filterSeverity === 'errors') {
      const isEmpty = row.every(cell => !cell || cell.trim() === '');
      const isWhitespace = row.some(cell => cell !== cell.trim());
      if (!isEmpty && !isWhitespace) return false;
    } else if (filterSeverity === 'duplicates') {
      const rowKey = row.join('|||');
      const isDup = rawRows.findIndex(r => r.join('|||') === rowKey) !== rowIndex;
      if (!isDup) return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = (format: ExportFormat) => {
    if (!parsed) return;

    const dataToExport = getProcessedData();
    setLastExportedStats(dataToExport.stats);

    const fileNameBase = parsed.fileName.replace(/\.(csv|tsv|txt)$/i, '');

    if (format === 'csv' || format === 'tsv') {
      const delimiter = format === 'tsv' ? '\t' : ',';
      const outputStr = unparseCSV(dataToExport.headers, dataToExport.rows, delimiter);
      downloadFile(outputStr, `${fileNameBase}_cleaned.${format}`, format === 'tsv' ? 'text/tab-separated-values' : 'text/csv');
    } else if (format === 'json') {
      const jsonObjects = dataToExport.rows.map(row => {
        const obj: Record<string, string> = {};
        dataToExport.headers.forEach((h, idx) => {
          obj[h] = row[idx] || '';
        });
        return obj;
      });
      const jsonStr = JSON.stringify(jsonObjects, null, 2);
      downloadFile(jsonStr, `${fileNameBase}_cleaned.json`, 'application/json');
    } else if (format === 'xlsx') {
      const wsData = [dataToExport.headers, ...dataToExport.rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Cleaned Data');
      XLSX.writeFile(wb, `${fileNameBase}_cleaned.xlsx`);
    }

    setShowSuccessModal(true);
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

  return (
    <div className="w-full">
      {/* HEADER ACTION BAR */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#c1c8c2] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#c1ecd4]/60 flex items-center justify-center text-[#012d1d]">
            <span className="material-symbols-outlined">description</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#161d1f] font-display flex items-center gap-2">
              {parsed?.fileName || 'No file selected'}
              <span className="bg-[#e8eff1] text-[#012d1d] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#c1c8c2]/50 uppercase">
                {parsed?.fileSize ? `${Math.round(parsed.fileSize / 1024)} KB` : 'Demo'}
              </span>
            </h2>
            <p className="text-xs text-[#414844]">
              {parsed?.rowCount || 0} rows • {parsed?.columnCount || 0} columns • Delimiter: <span className="font-mono font-bold">"{parsed?.delimiter || ','}"</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => document.getElementById('workspace-file-input')?.click()}
            className="px-3 py-1.5 rounded-lg border border-[#c1c8c2] text-xs font-semibold text-[#012d1d] hover:bg-[#f4fafd] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">upload</span>
            Upload New File
          </button>
          <input
            id="workspace-file-input"
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />

          <button
            onClick={() => setShowFindReplaceModal(true)}
            className="px-3 py-1.5 rounded-lg border border-[#c1c8c2] text-xs font-semibold text-[#012d1d] hover:bg-[#f4fafd] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">find_replace</span>
            Find & Replace
          </button>

          <button
            onClick={handleSampleLoad}
            className="px-3 py-1.5 rounded-lg border border-[#c1c8c2] text-xs font-semibold text-[#57615c] hover:text-[#012d1d] hover:bg-[#f4fafd] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">restart_alt</span>
            Reset Sample
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: DIAGNOSTICS & RULES */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* DIAGNOSTICS SUMMARY */}
          <div className="bg-white rounded-xl p-5 border border-[#c1c8c2] shadow-ambient">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#c1c8c2]">
              <div>
                <h3 className="text-base font-bold text-[#012d1d] font-display">Health Diagnostics</h3>
                <p className="text-xs text-[#414844]">Automated error analysis & rules</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-[#012d1d] font-display">{report?.healthScore || 100}</span>
                <span className="text-[10px] text-[#414844] block font-bold">SCORE</span>
              </div>
            </div>

            {report && report.issues.length === 0 ? (
              <div className="bg-[#c1ecd4]/40 border border-[#012d1d]/20 rounded-lg p-4 text-center">
                <span className="material-symbols-outlined text-3xl text-[#002114] mb-1">check_circle</span>
                <p className="text-xs font-bold text-[#002114]">No errors detected in this dataset!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {report?.issues.map((issue) => {
                  const isChecked = selectedIssues.has(issue.id);
                  return (
                    <div
                      key={issue.id}
                      className={`p-3 rounded-lg border transition-all ${
                        isChecked ? 'border-[#012d1d] bg-[#f4fafd]' : 'border-[#c1c8c2]/60 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                issue.severity === 'critical'
                                  ? 'bg-[#ffdad6] text-[#ba1a1a]'
                                  : issue.severity === 'warning'
                                  ? 'bg-[#ffdcc4] text-[#5f2f00]'
                                  : 'bg-[#dde4e6] text-[#414844]'
                              }`}
                            >
                              {issue.severity}
                            </span>
                            <span className="text-[10px] text-[#717973] font-semibold">
                              {issue.count} affected
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-[#161d1f] mb-0.5">{issue.title}</h4>
                          <p className="text-[11px] text-[#414844] leading-snug">{issue.explanation}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleIssue(issue.id)}
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

          {/* TRANSFORMATION CONTROLS */}
          <div className="bg-white rounded-xl p-5 border border-[#c1c8c2] shadow-ambient space-y-4">
            <h3 className="text-base font-bold text-[#012d1d] font-display border-b border-[#c1c8c2] pb-2">
              Custom Transformations
            </h3>

            {/* Header Casing */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#161d1f]">Header Casing</label>
                <input
                  type="checkbox"
                  checked={applyHeaderCaseToggle}
                  onChange={(e) => setApplyHeaderCaseToggle(e.target.checked)}
                  className="accent-[#012d1d]"
                />
              </div>
              <select
                value={headerCase}
                onChange={(e) => setHeaderCase(e.target.value as HeaderCaseOption)}
                disabled={!applyHeaderCaseToggle}
                className="w-full bg-[#f4fafd] border border-[#c1c8c2] rounded-lg p-2 text-xs font-semibold text-[#161d1f] focus:outline-none focus:border-[#012d1d] disabled:opacity-50"
              >
                <option value="snake_case">snake_case (e.g. email_address)</option>
                <option value="camelCase">camelCase (e.g. emailAddress)</option>
                <option value="UPPERCASE">UPPERCASE (e.g. EMAIL_ADDRESS)</option>
                <option value="Title Case">Title Case (e.g. Email Address)</option>
                <option value="lowercase">lowercase (e.g. email address)</option>
              </select>
            </div>

            {/* Missing Value Imputation */}
            <div className="space-y-1.5 pt-2 border-t border-[#c1c8c2]/50">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#161d1f]">Impute Empty Cells</label>
                <input
                  type="checkbox"
                  checked={applyImputationToggle}
                  onChange={(e) => setApplyImputationToggle(e.target.checked)}
                  className="accent-[#012d1d]"
                />
              </div>
              <input
                type="text"
                placeholder="Fill empty with (e.g. N/A or 0)"
                value={missingValueReplacement}
                onChange={(e) => setMissingValueReplacement(e.target.value)}
                disabled={!applyImputationToggle}
                className="w-full bg-[#f4fafd] border border-[#c1c8c2] rounded-lg p-2 text-xs text-[#161d1f] focus:outline-none focus:border-[#012d1d] disabled:opacity-50"
              />
            </div>
          </div>
        </aside>

        {/* CENTER & RIGHT: LIVE DATA TABLE & EXPORT */}
        <main className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-[#c1c8c2] shadow-ambient overflow-hidden flex flex-col min-h-[500px]">
            {/* TABLE TOOLBAR */}
            <div className="p-4 border-b border-[#c1c8c2] bg-[#f4fafd]/60 flex flex-wrap items-center justify-between gap-3">
              {/* View Mode */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#414844]">Mode:</span>
                <div className="flex bg-[#dde4e6] rounded-lg p-[2px]">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      viewMode === 'preview' ? 'bg-white text-[#012d1d] shadow-xs' : 'text-[#414844] hover:text-[#012d1d]'
                    }`}
                  >
                    Clean Preview
                  </button>
                  <button
                    onClick={() => setViewMode('original')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      viewMode === 'original' ? 'bg-white text-[#012d1d] shadow-xs' : 'text-[#414844] hover:text-[#012d1d]'
                    }`}
                  >
                    Original Data
                  </button>
                </div>
              </div>

              {/* Filter Severity */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#414844]">Filter:</span>
                <select
                  value={filterSeverity}
                  onChange={(e) => {
                    setFilterSeverity(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-[#c1c8c2] rounded-lg px-2.5 py-1 text-xs text-[#161d1f] font-semibold"
                >
                  <option value="all">All Rows ({rawRows.length})</option>
                  <option value="errors">Issues Only</option>
                  <option value="duplicates">Duplicates Only</option>
                </select>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search cell data..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-[#c1c8c2] rounded-lg pl-8 pr-3 py-1 text-xs text-[#161d1f] focus:outline-none focus:border-[#012d1d] w-44"
                />
                <span className="material-symbols-outlined text-base text-[#717973] absolute left-2 top-1.5">search</span>
              </div>
            </div>

            {/* DATA TABLE */}
            <div className="flex-1 overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead className="sticky top-0 bg-[#F1F1EF] text-[#414844] border-b border-[#c1c8c2] shadow-xs z-10">
                  <tr>
                    <th className="p-2.5 pl-4 w-12 text-center text-[#717973]">#</th>
                    {activeHeaders.map((header, idx) => (
                      <th key={idx} className="p-2.5 font-bold text-[#012d1d] whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[#161d1f]">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={activeHeaders.length + 1} className="p-8 text-center text-[#717973] italic">
                        No matching rows found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, rIdx) => {
                      const absoluteIdx = (currentPage - 1) * pageSize + rIdx + 1;
                      const isEmpty = row.every(c => !c || c.trim() === '');

                      return (
                        <tr key={rIdx} className="hover:bg-[#F7F9F8] border-b border-[#c1c8c2]/30 transition-colors">
                          <td className="p-2.5 pl-4 text-center text-[#717973] text-[11px] font-semibold">{absoluteIdx}</td>
                          {isEmpty ? (
                            <td colSpan={activeHeaders.length} className="p-2.5 text-[#ba1a1a]/60 italic font-mono">
                              [ Blank Row Purged ]
                            </td>
                          ) : (
                            row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2.5 whitespace-nowrap max-w-[200px] truncate">
                                {cell}
                              </td>
                            ))
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION FOOTER */}
            <div className="p-3 border-t border-[#c1c8c2] bg-[#f4fafd]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#414844]">
              <div>
                Showing <span className="font-bold text-[#161d1f]">{filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
                <span className="font-bold text-[#161d1f]">{Math.min(currentPage * pageSize, filteredRows.length)}</span> of{' '}
                <span className="font-bold text-[#161d1f]">{filteredRows.length}</span> rows
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-[#c1c8c2] rounded px-1.5 py-0.5"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded border border-[#c1c8c2] disabled:opacity-30 hover:bg-white"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  <span className="font-bold px-2">{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded border border-[#c1c8c2] disabled:opacity-30 hover:bg-white"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* EXPORT CONTROLS BAR */}
          <div className="bg-white p-5 rounded-xl border border-[#c1c8c2] shadow-ambient flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-[#012d1d] font-display">Export Cleaned Dataset</h4>
              <p className="text-xs text-[#414844]">Choose your preferred file format for download.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                className="bg-[#f4fafd] border border-[#c1c8c2] rounded-lg px-3 py-2 text-xs font-bold text-[#012d1d] focus:outline-none"
              >
                <option value="csv">CSV (.csv)</option>
                <option value="tsv">TSV (.tsv)</option>
                <option value="json">JSON (.json)</option>
                <option value="xlsx">Excel (.xlsx)</option>
              </select>

              <button
                onClick={() => handleExport(exportFormat)}
                className="flex-1 sm:flex-initial bg-[#012d1d] text-white text-xs font-semibold uppercase tracking-wider px-6 py-2.5 rounded-lg hover:bg-[#1b4332] shadow-ambient transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Download Dataset
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* FIND & REPLACE MODAL */}
      {showFindReplaceModal && (
        <div className="fixed inset-0 bg-[#161d1f]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#c1c8c2] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c1c8c2] pb-3">
              <h3 className="text-lg font-bold text-[#012d1d] font-display flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">find_replace</span>
                Find and Replace
              </h3>
              <button onClick={() => setShowFindReplaceModal(false)} className="text-[#717973] hover:text-[#012d1d]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#161d1f] block mb-1">Find text pattern:</label>
                <input
                  type="text"
                  placeholder="Text or pattern to search"
                  value={findReplace.search}
                  onChange={(e) => setFindReplace({ ...findReplace, search: e.target.value })}
                  className="w-full bg-[#f4fafd] border border-[#c1c8c2] rounded-lg p-2.5 text-xs text-[#161d1f]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#161d1f] block mb-1">Replace with:</label>
                <input
                  type="text"
                  placeholder="Replacement text"
                  value={findReplace.replace}
                  onChange={(e) => setFindReplace({ ...findReplace, replace: e.target.value })}
                  className="w-full bg-[#f4fafd] border border-[#c1c8c2] rounded-lg p-2.5 text-xs text-[#161d1f]"
                />
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-[#414844] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={findReplace.matchCase}
                    onChange={(e) => setFindReplace({ ...findReplace, matchCase: e.target.checked })}
                    className="accent-[#012d1d]"
                  />
                  Match case
                </label>
                <label className="flex items-center gap-2 text-xs text-[#414844] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={findReplace.isRegex}
                    onChange={(e) => setFindReplace({ ...findReplace, isRegex: e.target.checked })}
                    className="accent-[#012d1d]"
                  />
                  Regex mode
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#c1c8c2]">
              <button
                onClick={() => {
                  setFindReplace({ search: '', replace: '', isRegex: false, matchCase: false });
                  setShowFindReplaceModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-[#57615c]"
              >
                Clear & Close
              </button>
              <button
                onClick={() => setShowFindReplaceModal(false)}
                className="bg-[#012d1d] text-white text-xs font-semibold px-5 py-2 rounded-lg hover:bg-[#1b4332]"
              >
                Apply Transform
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-[#161d1f]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#c1c8c2] text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#c1ecd4] text-[#012d1d] mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>

            <h3 className="text-2xl font-bold text-[#012d1d] font-display">Export Complete!</h3>

            <div className="bg-[#eef5f7] rounded-xl p-4 text-xs space-y-2 border border-[#c1c8c2]/50">
              <div className="flex justify-between text-[#414844]">
                <span>Health Score:</span>
                <span className="font-bold text-[#012d1d]">100 / 100</span>
              </div>
              <div className="flex justify-between text-[#414844]">
                <span>Cells Modified:</span>
                <span className="font-mono font-bold text-[#161d1f]">{lastExportedStats.cellsModified}</span>
              </div>
              <div className="flex justify-between text-[#414844]">
                <span>Rows Purged:</span>
                <span className="font-mono font-bold text-[#161d1f]">{lastExportedStats.rowsRemoved}</span>
              </div>
              <div className="flex justify-between text-[#414844]">
                <span>Format:</span>
                <span className="font-bold uppercase text-[#012d1d]">{exportFormat}</span>
              </div>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-[#012d1d] text-white font-semibold text-xs uppercase tracking-wider py-3 rounded-lg hover:bg-[#1b4332]"
            >
              Back to Workspace
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 text-center shadow-2xl">
            <div className="animate-spin w-10 h-10 border-4 border-[#012d1d] border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm font-bold text-[#161d1f]">Parsing & Diagnostic Scanning...</p>
          </div>
        </div>
      )}
    </div>
  );
}
