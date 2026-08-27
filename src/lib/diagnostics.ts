import type { ParsedCSV, DiagnosticIssue, DiagnosticReport, Severity } from './types';

export function diagnoseCSV(parsed: ParsedCSV): DiagnosticReport {
  const issues: DiagnosticIssue[] = [];

  // Rule 1: Detect whitespace issues
  const whitespaceIssue = detectWhitespace(parsed);
  if (whitespaceIssue) issues.push(whitespaceIssue);

  // Rule 2: Detect duplicate rows
  const duplicatesIssue = detectDuplicates(parsed);
  if (duplicatesIssue) issues.push(duplicatesIssue);

  // Rule 3: Detect empty rows
  const emptyRowsIssue = detectEmptyRows(parsed);
  if (emptyRowsIssue) issues.push(emptyRowsIssue);

  // Rule 4: Detect empty columns
  const emptyColumnsIssue = detectEmptyColumns(parsed);
  if (emptyColumnsIssue) issues.push(emptyColumnsIssue);

  // Rule 5: Detect malformed rows
  const malformedIssue = detectMalformedRows(parsed);
  if (malformedIssue) issues.push(malformedIssue);

  // Rule 6: Detect header inconsistencies
  const headerIssue = detectHeaderIssues(parsed);
  if (headerIssue) issues.push(headerIssue);

  const summary = {
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    total: issues.length,
  };

  const healthScore = calculateHealthScore(issues, parsed);

  return {
    issues,
    summary,
    isClean: issues.length === 0,
    healthScore,
  };
}

function detectWhitespace(parsed: ParsedCSV): DiagnosticIssue | null {
  const affectedRows: number[] = [];
  let count = 0;

  parsed.rows.forEach((row, rowIndex) => {
    row.forEach((cell) => {
      if (cell !== cell.trim()) {
        if (!affectedRows.includes(rowIndex)) {
          affectedRows.push(rowIndex);
        }
        count++;
      }
    });
  });

  if (count === 0) return null;

  return {
    id: 'whitespace',
    type: 'whitespace',
    severity: 'warning',
    title: `${count} cells contain whitespace`,
    explanation: `${count} cells have leading or trailing spaces. This causes matching failures when joining data or importing into databases.`,
    affectedRows,
    count,
    safetyLevel: 'safe',
  };
}

function detectDuplicates(parsed: ParsedCSV): DiagnosticIssue | null {
  const seen = new Map<string, number>();
  const affectedRows: number[] = [];

  parsed.rows.forEach((row, index) => {
    const key = row.join('|||');
    if (seen.has(key)) {
      affectedRows.push(index);
    } else {
      seen.set(key, index);
    }
  });

  if (affectedRows.length === 0) return null;

  return {
    id: 'duplicates',
    type: 'duplicate-rows',
    severity: 'critical',
    title: `${affectedRows.length} duplicate rows found`,
    explanation: `${affectedRows.length} rows are exact duplicates. These may cause data integrity issues or inflated counts in analysis.`,
    affectedRows,
    count: affectedRows.length,
    safetyLevel: 'needs-review',
  };
}

function detectEmptyRows(parsed: ParsedCSV): DiagnosticIssue | null {
  const affectedRows: number[] = [];

  parsed.rows.forEach((row, index) => {
    if (row.every(cell => !cell || cell.trim() === '')) {
      affectedRows.push(index);
    }
  });

  if (affectedRows.length === 0) return null;

  return {
    id: 'empty-rows',
    type: 'empty-rows',
    severity: 'warning',
    title: `${affectedRows.length} empty rows found`,
    explanation: `${affectedRows.length} rows are completely empty. These typically result from copy-paste artifacts or editing mistakes.`,
    affectedRows,
    count: affectedRows.length,
    safetyLevel: 'safe',
  };
}

function detectEmptyColumns(parsed: ParsedCSV): DiagnosticIssue | null {
  const affectedColumns: number[] = [];

  for (let col = 0; col < parsed.columnCount; col++) {
    const isEmpty = parsed.rows.every(row => !row[col] || row[col].trim() === '');
    if (isEmpty) {
      affectedColumns.push(col);
    }
  }

  if (affectedColumns.length === 0) return null;

  const columnNames = affectedColumns.map(idx => parsed.headers[idx] || `Column ${idx + 1}`);

  return {
    id: 'empty-columns',
    type: 'empty-columns',
    severity: 'warning',
    title: `${affectedColumns.length} empty columns found`,
    explanation: `${affectedColumns.length} columns contain no data: ${columnNames.join(', ')}. These may be placeholder columns.`,
    affectedRows: [],
    affectedColumns,
    count: affectedColumns.length,
    safetyLevel: 'needs-review',
  };
}

function detectMalformedRows(parsed: ParsedCSV): DiagnosticIssue | null {
  const affectedRows: number[] = [];

  parsed.rows.forEach((row, index) => {
    if (row.length !== parsed.columnCount) {
      affectedRows.push(index);
    }
  });

  if (affectedRows.length === 0) return null;

  return {
    id: 'malformed',
    type: 'malformed-rows',
    severity: 'critical',
    title: `${affectedRows.length} rows have incorrect column count`,
    explanation: `${affectedRows.length} rows have a different number of columns than the header (expected ${parsed.columnCount}). This usually indicates missing delimiters or unescaped quotes.`,
    affectedRows,
    count: affectedRows.length,
    safetyLevel: 'needs-review',
  };
}

function detectHeaderIssues(parsed: ParsedCSV): DiagnosticIssue | null {
  const issues: string[] = [];
  const affectedColumns: number[] = [];

  parsed.headers.forEach((header, index) => {
    if (header !== header.trim()) {
      issues.push(`Column ${index + 1} has whitespace`);
      affectedColumns.push(index);
    }
    if (!header || header.trim() === '') {
      issues.push(`Column ${index + 1} is empty`);
      affectedColumns.push(index);
    }
  });

  // Check for duplicate headers
  const seen = new Set<string>();
  parsed.headers.forEach((header, index) => {
    if (seen.has(header)) {
      issues.push(`Duplicate header: "${header}"`);
      affectedColumns.push(index);
    }
    seen.add(header);
  });

  if (issues.length === 0) return null;

  return {
    id: 'headers',
    type: 'header-inconsistency',
    severity: 'info',
    title: `${issues.length} header issues found`,
    explanation: `Header issues detected: ${issues.join(', ')}. Inconsistent headers cause import failures.`,
    affectedRows: [],
    affectedColumns,
    count: issues.length,
    safetyLevel: 'safe',
  };
}

function calculateHealthScore(issues: DiagnosticIssue[], parsed: ParsedCSV): number {
  let score = 100;

  issues.forEach(issue => {
    switch (issue.severity) {
      case 'critical':
        score -= 20;
        break;
      case 'warning':
        score -= 10;
        break;
      case 'info':
        score -= 5;
        break;
    }
  });

  return Math.max(0, Math.min(100, score));
}
