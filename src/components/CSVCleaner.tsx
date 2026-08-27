import { useState } from 'react';
import { parseCSV, parseSampleCSV, unparseCSV } from '../lib/parser';
import { diagnoseCSV } from '../lib/diagnostics';
import { cleanCSV, getSampleCSV } from '../lib/cleaner';
import type { ParsedCSV, DiagnosticReport, DiagnosticIssue } from '../lib/types';

export default function CSVCleaner() {
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }

    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      alert('Please upload a CSV, TSV, or TXT file.');
      return;
    }

    setIsProcessing(true);
    try {
      const parsedData = await parseCSV(file);
      setParsed(parsedData);

      const diagnostic = diagnoseCSV(parsedData);
      setReport(diagnostic);

      // Auto-select safe fixes
      const safeIssues = diagnostic.issues
        .filter(issue => issue.safetyLevel === 'safe')
        .map(issue => issue.id);
      setSelectedIssues(new Set(safeIssues));

      // Update header health badge
      updateHealthBadge(diagnostic.healthScore);
    } catch (error) {
      alert(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSampleLoad = () => {
    const sampleCSV = getSampleCSV();
    const parsedData = parseSampleCSV(sampleCSV, 'messy_contacts_final.csv');
    setParsed(parsedData);

    const diagnostic = diagnoseCSV(parsedData);
    setReport(diagnostic);

    // Auto-select safe fixes
    const safeIssues = diagnostic.issues
      .filter(issue => issue.safetyLevel === 'safe')
      .map(issue => issue.id);
    setSelectedIssues(new Set(safeIssues));

    // Update header health badge
    updateHealthBadge(diagnostic.healthScore);
  };

  const handleClean = () => {
    if (!parsed || !report) return;

    const issuesToFix = report.issues.filter(issue => selectedIssues.has(issue.id));
    const result = cleanCSV(parsed, issuesToFix);

    // Generate cleaned CSV
    const cleanedCSV = unparseCSV(parsed.headers, result.cleanedRows, parsed.delimiter);

    // Create download
    const blob = new Blob([cleanedCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${parsed.fileName.replace(/\.(csv|tsv|txt)$/i, '')}-cleaned.csv`;
    link.click();
    URL.revokeObjectURL(url);

    // Show success message
    alert(`✓ CSV cleaned! ${result.rowsRemoved} rows removed, ${result.cellsModified} cells modified.`);
  };

  const updateHealthBadge = (score: number) => {
    const badge = document.getElementById('header-health-badge');
    const scoreElement = document.getElementById('header-health-score');
    const circleElement = document.getElementById('header-health-circle');

    if (scoreElement) scoreElement.textContent = `${score}/100`;
    if (circleElement) circleElement.setAttribute('stroke-dasharray', `${score}, 100`);
    if (badge) badge.style.display = 'flex';
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Upload Section */}
      {!parsed && (
        <section id="upload-section" className="px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-[#012d1d] mb-8 text-center font-display">
              Upload Your CSV
            </h2>

            <div
              className="border-2 border-dashed border-[#c1c8c2] rounded-2xl bg-white p-16 text-center hover:border-[#012d1d] transition-all cursor-pointer shadow-ambient"
              onClick={() => document.getElementById('file-input')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
            >
              <span className="material-symbols-outlined text-6xl text-[#012d1d] mb-4 block">
                upload_file
              </span>
              <p className="text-xl font-semibold text-[#161d1f] mb-2">
                Drop your CSV file here
              </p>
              <p className="text-sm text-[#414844] mb-6">
                or click to browse (max 5MB)
              </p>
              <input
                id="file-input"
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>

            <div className="text-center mt-6">
              <button
                onClick={handleSampleLoad}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#012d1d] hover:underline"
              >
                <span className="material-symbols-outlined text-lg">science</span>
                Try with sample CSV
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Results Section */}
      {parsed && report && (
        <section id="workspace" className="px-6 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl border border-[#c1c8c2] shadow-ambient p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-[#012d1d] mb-2 font-display">
                    Health Check Report
                  </h2>
                  <p className="text-sm text-[#414844]">
                    {parsed.fileName} • {parsed.rowCount} rows • {parsed.columnCount} columns
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#012d1d]">{report.healthScore}/100</div>
                    <div className="text-xs text-[#414844] uppercase tracking-wider font-semibold">
                      CSV Health
                    </div>
                  </div>
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#dde4e6]"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray="100, 100"
                        strokeWidth="3.5"
                      />
                      <path
                        className="text-[#012d1d] transition-all duration-700"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={`${report.healthScore}, 100`}
                        strokeWidth="3.5"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {report.isClean ? (
                <div className="bg-[#c1ecd4] border border-[#012d1d]/20 rounded-xl p-6 text-center">
                  <span className="material-symbols-outlined text-4xl text-[#002114] mb-2 block">
                    check_circle
                  </span>
                  <p className="text-lg font-semibold text-[#002114]">
                    Your CSV is clean! No issues detected.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-8">
                    {report.issues.map((issue) => (
                      <div
                        key={issue.id}
                        className={`border rounded-xl p-6 transition-all ${
                          selectedIssues.has(issue.id)
                            ? 'border-[#012d1d] bg-[#c1ecd4]/20'
                            : 'border-[#c1c8c2] bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                  issue.severity === 'critical'
                                    ? 'bg-[#ffdad6] text-[#ba1a1a]'
                                    : issue.severity === 'warning'
                                    ? 'bg-[#ffdcc4] text-[#5f2f00]'
                                    : 'bg-[#dde4e6] text-[#414844]'
                                }`}
                              >
                                {issue.severity}
                              </span>
                              {issue.safetyLevel === 'safe' && (
                                <span className="text-xs text-[#002114] bg-[#c1ecd4] px-2 py-1 rounded-full font-semibold">
                                  Safe to auto-fix
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-[#161d1f] mb-2">
                              {issue.title}
                            </h3>
                            <p className="text-sm text-[#414844] leading-relaxed">
                              {issue.explanation}
                            </p>
                          </div>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedIssues.has(issue.id)}
                              onChange={() => toggleIssue(issue.id)}
                              className="w-5 h-5 rounded border-2 border-[#c1c8c2] text-[#012d1d] focus:ring-2 focus:ring-[#012d1d]"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 justify-end">
                    <button
                      onClick={() => {
                        setParsed(null);
                        setReport(null);
                        setSelectedIssues(new Set());
                      }}
                      className="px-6 py-3 rounded-lg border-2 border-[#c1c8c2] text-[#414844] font-semibold hover:bg-[#f4fafd] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClean}
                      disabled={selectedIssues.size === 0}
                      className="bg-[#012d1d] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#1b4332] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">download</span>
                      Clean & Download ({selectedIssues.size} fixes)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-[#012d1d] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-[#161d1f]">Processing CSV...</p>
          </div>
        </div>
      )}
    </div>
  );
}
