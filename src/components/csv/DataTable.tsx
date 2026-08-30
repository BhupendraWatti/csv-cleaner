import React, { useState, useMemo } from 'react';
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
  // Unique Responsive Feature: Density / Layout Switcher (Grid vs Mobile Card View)
  const [displayLayout, setDisplayLayout] = useState<'table' | 'card'>('table');

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
    <div className="bg-white dark:bg-[#0e2019] rounded-xl border border-[#c1c8c2] dark:border-[#1b3b2f] shadow-ambient overflow-hidden flex flex-col min-h-[480px] transition-colors duration-200">
      {/* TABLE TOOLBAR */}
      <div className="p-4 border-b border-[#c1c8c2] dark:border-[#1b3b2f] bg-[#f4fafd]/60 dark:bg-[#0a1713]/80 flex flex-wrap items-center justify-between gap-3">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#414844] dark:text-[#94a3b8]">Mode:</span>
          <div className="flex bg-[#dde4e6] dark:bg-[#162f25] rounded-lg p-[2px]">
            <button
              onClick={() => onViewModeChange('preview')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'preview' ? 'bg-white dark:bg-[#0e2019] text-[#012d1d] dark:text-[#34d399] shadow-xs' : 'text-[#414844] dark:text-[#94a3b8] hover:text-[#012d1d] dark:hover:text-[#34d399]'
              }`}
            >
              Clean Preview ({rows.length})
            </button>
            <button
              onClick={() => onViewModeChange('original')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'original' ? 'bg-white dark:bg-[#0e2019] text-[#012d1d] dark:text-[#34d399] shadow-xs' : 'text-[#414844] dark:text-[#94a3b8] hover:text-[#012d1d] dark:hover:text-[#34d399]'
              }`}
            >
              Original ({rawRows.length})
            </button>
          </div>
        </div>

        {/* Responsive Viewport Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#414844] dark:text-[#94a3b8] hidden sm:inline">Layout:</span>
          <div className="flex bg-[#dde4e6] dark:bg-[#162f25] rounded-lg p-[2px]">
            <button
              onClick={() => setDisplayLayout('table')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                displayLayout === 'table' ? 'bg-white dark:bg-[#0e2019] text-[#012d1d] dark:text-[#34d399] shadow-xs' : 'text-[#414844] dark:text-[#94a3b8] hover:text-[#012d1d] dark:hover:text-[#34d399]'
              }`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-sm">table_chart</span>
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setDisplayLayout('card')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                displayLayout === 'card' ? 'bg-white dark:bg-[#0e2019] text-[#012d1d] dark:text-[#34d399] shadow-xs' : 'text-[#414844] dark:text-[#94a3b8] hover:text-[#012d1d] dark:hover:text-[#34d399]'
              }`}
              title="Mobile Card View"
            >
              <span className="material-symbols-outlined text-sm">view_agenda</span>
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        </div>

        {/* Filter Selection */}
        <div className="flex items-center gap-2">
          <select
            value={filterSeverity}
            onChange={(e) => {
              onFilterSeverityChange(e.target.value as any);
              onPageChange(1);
            }}
            className="bg-white dark:bg-[#0e2019] border border-[#c1c8c2] dark:border-[#1b3b2f] rounded-lg px-2.5 py-1 text-xs text-[#161d1f] dark:text-[#f0fdf4] font-semibold focus:outline-none focus:border-[#012d1d] dark:focus:border-[#34d399]"
          >
            <option value="all" className="dark:bg-[#0e2019]">All Rows ({rows.length})</option>
            <option value="errors" className="dark:bg-[#0e2019]">Issues Only</option>
            <option value="duplicates" className="dark:bg-[#0e2019]">Duplicates Only</option>
            {quarantinedRows.length > 0 && (
              <option value="quarantined" className="dark:bg-[#0e2019]">Quarantined ({quarantinedRows.length})</option>
            )}
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-48">
          <input
            type="text"
            placeholder="Search cell data..."
            value={searchQuery}
            onChange={(e) => {
              onSearchQueryChange(e.target.value);
              onPageChange(1);
            }}
            className="bg-white dark:bg-[#0e2019] border border-[#c1c8c2] dark:border-[#1b3b2f] rounded-lg pl-8 pr-3 py-1 text-xs text-[#161d1f] dark:text-[#f0fdf4] focus:outline-none focus:border-[#012d1d] dark:focus:border-[#34d399] w-full placeholder:text-muted-foreground"
          />
          <span className="material-symbols-outlined text-base text-[#717973] dark:text-[#94a3b8] absolute left-2.5 top-1.5">search</span>
        </div>
      </div>

      {/* VIEWPORT MODE: TABLE vs MOBILE CARDS */}
      {displayLayout === 'table' ? (
        <div className="flex-1 overflow-x-auto max-h-[420px]">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead className="sticky top-0 bg-[#F1F1EF] dark:bg-[#0a1713] text-[#414844] dark:text-[#94a3b8] border-b border-[#c1c8c2] dark:border-[#1b3b2f] shadow-xs z-10">
              <tr>
                <th className="p-2.5 pl-4 w-12 text-center text-[#717973] dark:text-[#94a3b8]">#</th>
                {visibleHeaders.map((header, idx) => (
                  <th key={idx} className="p-2.5 font-bold text-[#012d1d] dark:text-[#34d399] whitespace-nowrap">
                    {header}
                  </th>
                ))}
                {overflowColCount > 0 && (
                  <th className="p-2.5 font-bold text-[#57615c] dark:text-[#94a3b8] italic whitespace-nowrap bg-[#e2e9ec] dark:bg-[#162f25]">
                    + {overflowColCount} more columns
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="text-[#161d1f] dark:text-[#f0fdf4]">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(1, visibleHeaders.length + 1 + (overflowColCount > 0 ? 1 : 0))} className="p-8 text-center text-[#717973] dark:text-[#94a3b8] italic">
                    No matching rows found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rIdx) => {
                  const absoluteIdx = (currentPage - 1) * pageSize + rIdx + 1;
                  const isEmpty = row.every(c => !c || String(c).trim() === '');
                  const visibleCells = row.slice(0, maxVisibleCols);

                  return (
                    <tr key={rIdx} className="hover:bg-[#F7F9F8] dark:hover:bg-[#162f25]/60 border-b border-[#c1c8c2]/30 dark:border-[#1b3b2f]/50 transition-colors">
                      <td className="p-2.5 pl-4 text-center text-[#717973] dark:text-[#94a3b8] text-[11px] font-semibold">{absoluteIdx}</td>
                      {isEmpty ? (
                        <td colSpan={visibleHeaders.length + (overflowColCount > 0 ? 1 : 0)} className="p-2.5 text-[#ba1a1a]/60 dark:text-red-400/80 italic font-mono">
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
                            <td className="p-2.5 text-[#717973] dark:text-[#94a3b8] italic bg-[#f4fafd] dark:bg-[#0a1713]">...</td>
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
      ) : (
        /* CARD VIEW FOR RESPONSIVE MOBILE / TOUCH DEVICES */
        <div className="flex-1 p-4 overflow-y-auto max-h-[420px] space-y-4 bg-[#f4fafd] dark:bg-[#06120e]">
          {paginatedRows.length === 0 ? (
            <div className="p-8 text-center text-[#717973] dark:text-[#94a3b8] italic bg-white dark:bg-[#0e2019] rounded-xl border border-[#c1c8c2] dark:border-[#1b3b2f]">
              No matching rows found.
            </div>
          ) : (
            paginatedRows.map((row, rIdx) => {
              const absoluteIdx = (currentPage - 1) * pageSize + rIdx + 1;
              const isEmpty = row.every(c => !c || String(c).trim() === '');

              return (
                <div key={rIdx} className="bg-white dark:bg-[#0e2019] rounded-xl p-4 border border-[#c1c8c2] dark:border-[#1b3b2f] shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-[#c1c8c2]/40 dark:border-[#1b3b2f] pb-2">
                    <span className="bg-[#012d1d] dark:bg-[#34d399] text-white dark:text-[#002114] text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                      Row #{absoluteIdx}
                    </span>
                    {isEmpty && (
                      <span className="bg-[#ffdad6] dark:bg-red-950/60 text-[#ba1a1a] dark:text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Empty Row
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    {visibleHeaders.map((header, cIdx) => (
                      <div key={cIdx} className="bg-[#f4fafd] dark:bg-[#0a1713] p-2 rounded border border-[#c1c8c2]/30 dark:border-[#1b3b2f] flex flex-col">
                        <span className="text-[10px] font-bold text-[#57615c] dark:text-[#94a3b8] uppercase truncate">{header}</span>
                        <span className="text-[#161d1f] dark:text-[#f0fdf4] font-medium break-all mt-0.5">
                          {row[cIdx] || <em className="text-[#717973] dark:text-[#94a3b8] font-sans text-[11px]">empty</em>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* PAGINATION FOOTER */}
      <div className="p-3 border-t border-[#c1c8c2] dark:border-[#1b3b2f] bg-[#f4fafd]/40 dark:bg-[#0a1713]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#414844] dark:text-[#94a3b8]">
        <div>
          Showing <span className="font-bold text-[#161d1f] dark:text-[#f0fdf4]">{filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
          <span className="font-bold text-[#161d1f] dark:text-[#f0fdf4]">{Math.min(currentPage * pageSize, filteredRows.length)}</span> of{' '}
          <span className="font-bold text-[#161d1f] dark:text-[#f0fdf4]">{filteredRows.length}</span> rows
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
              className="bg-white dark:bg-[#0e2019] border border-[#c1c8c2] dark:border-[#1b3b2f] text-[#161d1f] dark:text-[#f0fdf4] rounded px-1.5 py-0.5"
            >
              <option value={10} className="dark:bg-[#0e2019]">10</option>
              <option value={25} className="dark:bg-[#0e2019]">25</option>
              <option value={50} className="dark:bg-[#0e2019]">50</option>
              <option value={100} className="dark:bg-[#0e2019]">100</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-[#c1c8c2] dark:border-[#1b3b2f] disabled:opacity-30 hover:bg-white dark:hover:bg-[#162f25] text-[#161d1f] dark:text-[#f0fdf4] cursor-pointer"
              aria-label="Previous Page"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <span className="font-bold px-2 text-[#161d1f] dark:text-[#f0fdf4]">{currentPage} / {totalPages}</span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-[#c1c8c2] dark:border-[#1b3b2f] disabled:opacity-30 hover:bg-white dark:hover:bg-[#162f25] text-[#161d1f] dark:text-[#f0fdf4] cursor-pointer"
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
