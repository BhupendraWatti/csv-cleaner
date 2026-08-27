import React, { useMemo } from 'react';
import type { QuarantinedRow } from '../../lib/types';

interface DataTableProps {
  viewMode: 'preview' | 'original';
  onViewModeChange: (mode: 'preview' | 'original') => void;
  headers: string[];
  rows: string[][];
  rawRows: string[][];
  quarantinedRows: QuarantinedRow[];
  filterSeverity: 'all' | 'errors' | 'duplicates' | 'quarantined';
  onFilterSeverityChange: (filter: 'all' | 'errors' | 'duplicates' | 'quarantined') => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

export default function DataTable({
  viewMode,
  onViewModeChange,
  headers,
  rows,
  rawRows,
  quarantinedRows,
  filterSeverity,
  onFilterSeverityChange,
  searchQuery,
  onSearchQueryChange,
  currentPage,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: DataTableProps) {
  // Memoized filter logic to avoid recalculation on unrelated renders
  const filteredRows = useMemo(() => {
    if (filterSeverity === 'quarantined') {
      return quarantinedRows.map(q => q.row);
    }

    return rows.filter((row, rowIndex) => {
      if (searchQuery.trim()) {
        const match = row.some(cell => String(cell).toLowerCase().includes(searchQuery.toLowerCase()));
        if (!match) return false;
      }

      if (filterSeverity === 'errors') {
        const isEmpty = row.every(cell => !cell || String(cell).trim() === '');
        const isWhitespace = row.some(cell => cell !== String(cell).trim());
        if (!isEmpty && !isWhitespace) return false;
      } else if (filterSeverity === 'duplicates') {
        const rowKey = row.join('|||');
        const isDup = rows.findIndex(r => r.join('|||') === rowKey) !== rowIndex;
        if (!isDup) return false;
      }

      return true;
    });
  }, [rows, quarantinedRows, searchQuery, filterSeverity]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const maxVisibleCols = 50;
  const visibleHeaders = useMemo(() => headers.slice(0, maxVisibleCols), [headers]);
  const overflowColCount = headers.length - maxVisibleCols;

  return (
    <div className="bg-white rounded-xl border border-[#c1c8c2] shadow-ambient overflow-hidden flex flex-col min-h-[480px]">
      {/* TABLE TOOLBAR */}
      <div className="p-4 border-b border-[#c1c8c2] bg-[#f4fafd]/60 flex flex-wrap items-center justify-between gap-3">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#414844]">Mode:</span>
          <div className="flex bg-[#dde4e6] rounded-lg p-[2px]">
            <button
              onClick={() => onViewModeChange('preview')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'preview' ? 'bg-white text-[#012d1d] shadow-xs' : 'text-[#414844] hover:text-[#012d1d]'
              }`}
            >
              Clean Preview ({rows.length})
            </button>
            <button
              onClick={() => onViewModeChange('original')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'original' ? 'bg-white text-[#012d1d] shadow-xs' : 'text-[#414844] hover:text-[#012d1d]'
              }`}
            >
              Original Data ({rawRows.length})
            </button>
          </div>
        </div>

        {/* Filter Selection */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#414844]">Filter:</span>
          <select
            value={filterSeverity}
            onChange={(e) => {
              onFilterSeverityChange(e.target.value as any);
              onPageChange(1);
            }}
            className="bg-white border border-[#c1c8c2] rounded-lg px-2.5 py-1 text-xs text-[#161d1f] font-semibold focus:outline-none focus:border-[#012d1d]"
          >
            <option value="all">All Rows ({rows.length})</option>
            <option value="errors">Issues Only</option>
            <option value="duplicates">Duplicates Only</option>
            {quarantinedRows.length > 0 && (
              <option value="quarantined">Quarantined Rows ({quarantinedRows.length})</option>
            )}
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search cell data..."
            value={searchQuery}
            onChange={(e) => {
              onSearchQueryChange(e.target.value);
              onPageChange(1);
            }}
            className="bg-white border border-[#c1c8c2] rounded-lg pl-8 pr-3 py-1 text-xs text-[#161d1f] focus:outline-none focus:border-[#012d1d] w-48"
          />
          <span className="material-symbols-outlined text-base text-[#717973] absolute left-2.5 top-1.5">search</span>
        </div>
      </div>

      {/* DATA GRID */}
      <div className="flex-1 overflow-x-auto max-h-[400px]">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead className="sticky top-0 bg-[#F1F1EF] text-[#414844] border-b border-[#c1c8c2] shadow-xs z-10">
            <tr>
              <th className="p-2.5 pl-4 w-12 text-center text-[#717973]">#</th>
              {visibleHeaders.map((header, idx) => (
                <th key={idx} className="p-2.5 font-bold text-[#012d1d] whitespace-nowrap">
                  {header}
                </th>
              ))}
              {overflowColCount > 0 && (
                <th className="p-2.5 font-bold text-[#57615c] italic whitespace-nowrap bg-[#e2e9ec]">
                  + {overflowColCount} more columns
                </th>
              )}
            </tr>
          </thead>
          <tbody className="text-[#161d1f]">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, visibleHeaders.length + 1 + (overflowColCount > 0 ? 1 : 0))} className="p-8 text-center text-[#717973] italic">
                  No matching rows found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rIdx) => {
                const absoluteIdx = (currentPage - 1) * pageSize + rIdx + 1;
                const isEmpty = row.every(c => !c || String(c).trim() === '');
                const visibleCells = row.slice(0, maxVisibleCols);

                return (
                  <tr key={rIdx} className="hover:bg-[#F7F9F8] border-b border-[#c1c8c2]/30 transition-colors">
                    <td className="p-2.5 pl-4 text-center text-[#717973] text-[11px] font-semibold">{absoluteIdx}</td>
                    {isEmpty ? (
                      <td colSpan={visibleHeaders.length + (overflowColCount > 0 ? 1 : 0)} className="p-2.5 text-[#ba1a1a]/60 italic font-mono">
                        [ Blank Row Purged ]
                      </td>
                    ) : (
                      <>
                        {visibleCells.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2.5 whitespace-nowrap max-w-[220px] truncate" title={String(cell)}>
                            {cell}
                          </td>
                        ))}
                        {overflowColCount > 0 && (
                          <td className="p-2.5 text-[#717973] italic bg-[#f4fafd]">...</td>
                        )}
                      </>
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
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
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
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-[#c1c8c2] disabled:opacity-30 hover:bg-white"
              aria-label="Previous Page"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <span className="font-bold px-2">{currentPage} / {totalPages}</span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-[#c1c8c2] disabled:opacity-30 hover:bg-white"
              aria-label="Next Page"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
