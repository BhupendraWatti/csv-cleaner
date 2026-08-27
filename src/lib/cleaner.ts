import type { ParsedCSV, DiagnosticIssue, CleanedResult } from './types';

export function cleanCSV(
  parsed: ParsedCSV,
  issuesToFix: DiagnosticIssue[]
): CleanedResult {
  let cleanedRows = [...parsed.rows.map(row => [...row])];
  let rowsRemoved = 0;
  let cellsModified = 0;

  // Apply fixes in specific order
  const issuesByType = new Map<string, DiagnosticIssue>();
  issuesToFix.forEach(issue => issuesByType.set(issue.type, issue));

  // 1. Trim whitespace (safe)
  if (issuesByType.has('whitespace')) {
    const result = trimWhitespace(cleanedRows);
    cleanedRows = result.rows;
    cellsModified += result.modified;
  }

  // 2. Remove empty rows (safe)
  if (issuesByType.has('empty-rows')) {
    const result = removeEmptyRows(cleanedRows);
    cleanedRows = result.rows;
    rowsRemoved += result.removed;
  }

  // 3. Remove duplicate rows (needs review)
  if (issuesByType.has('duplicate-rows')) {
    const result = removeDuplicates(cleanedRows);
    cleanedRows = result.rows;
    rowsRemoved += result.removed;
  }

  // 4. Fix malformed rows (needs review)
  if (issuesByType.has('malformed-rows')) {
    const result = fixMalformedRows(cleanedRows, parsed.columnCount);
    cleanedRows = result.rows;
    cellsModified += result.modified;
  }

  return {
    cleanedRows,
    rowsRemoved,
    cellsModified,
    report: {
      issues: issuesToFix,
      summary: {
        critical: issuesToFix.filter(i => i.severity === 'critical').length,
        warning: issuesToFix.filter(i => i.severity === 'warning').length,
        info: issuesToFix.filter(i => i.severity === 'info').length,
        total: issuesToFix.length,
      },
      isClean: false,
      healthScore: 100,
    },
  };
}

function trimWhitespace(rows: string[][]): { rows: string[][]; modified: number } {
  let modified = 0;
  const cleanedRows = rows.map(row =>
    row.map(cell => {
      const trimmed = cell.trim();
      if (trimmed !== cell) modified++;
      return trimmed;
    })
  );
  return { rows: cleanedRows, modified };
}

function removeEmptyRows(rows: string[][]): { rows: string[][]; removed: number } {
  const initialCount = rows.length;
  const cleanedRows = rows.filter(row =>
    !row.every(cell => !cell || cell.trim() === '')
  );
  return { rows: cleanedRows, removed: initialCount - cleanedRows.length };
}

function removeDuplicates(rows: string[][]): { rows: string[][]; removed: number } {
  const seen = new Set<string>();
  const initialCount = rows.length;
  const cleanedRows = rows.filter(row => {
    const key = row.join('|||');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return { rows: cleanedRows, removed: initialCount - cleanedRows.length };
}

function fixMalformedRows(rows: string[][], expectedColumns: number): { rows: string[][]; modified: number } {
  let modified = 0;
  const cleanedRows = rows.map(row => {
    if (row.length !== expectedColumns) {
      modified++;
      // Pad short rows with empty strings
      if (row.length < expectedColumns) {
        return [...row, ...Array(expectedColumns - row.length).fill('')];
      }
      // Truncate long rows
      return row.slice(0, expectedColumns);
    }
    return row;
  });
  return { rows: cleanedRows, modified };
}

export function getSampleCSV(): string {
  return `First Name,Email,Company,Status
Sarah,sarah@acme.co,Acme Corp,Active
  John  ,john@smith .com,Smith LLC,Pending
,,,,
Sarah,sarah@acme.co,Acme Corp,Active
Mike,mike@tech.io,Tech Inc,Active
  Emma  ,emma@dev.com,Dev Co,Pending`;
}
