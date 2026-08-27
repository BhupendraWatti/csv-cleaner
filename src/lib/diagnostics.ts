import type { ParsedCSV, DiagnosticIssue, DiagnosticReport } from './types';

export function diagnoseCSV(parsed: ParsedCSV): DiagnosticReport {
  const issues: DiagnosticIssue[] = [];

  // Rule 1: Detect whitespace issues (leading/trailing spaces)
  const whitespaceIssue = detectWhitespace(parsed);
  if (whitespaceIssue) issues.push(whitespaceIssue);

  // Rule 2: Detect whitespace-only cells ("   ")
  const whitespaceOnlyIssue = detectWhitespaceOnly(parsed);
  if (whitespaceOnlyIssue) issues.push(whitespaceOnlyIssue);

  // Rule 3: Detect duplicate rows
  const duplicatesIssue = detectDuplicates(parsed);
  if (duplicatesIssue) issues.push(duplicatesIssue);

  // Rule 4: Detect empty rows
  const emptyRowsIssue = detectEmptyRows(parsed);
  if (emptyRowsIssue) issues.push(emptyRowsIssue);

  // Rule 5: Detect empty columns
  const emptyColumnsIssue = detectEmptyColumns(parsed);
  if (emptyColumnsIssue) issues.push(emptyColumnsIssue);

  // Rule 6: Detect malformed rows (incorrect column count)
  const malformedIssue = detectMalformedRows(parsed);
  if (malformedIssue) issues.push(malformedIssue);

  // Rule 7: Detect header inconsistencies
  const headerIssue = detectHeaderIssues(parsed);
  if (headerIssue) issues.push(headerIssue);

  // Rule 8: Detect header casing / special chars
  const headerCaseIssue = detectHeaderCaseIssues(parsed);
  if (headerCaseIssue) issues.push(headerCaseIssue);

  // Rule 9: Detect currency formatting
  const currencyIssue = detectCurrencyFormatting(parsed);
  if (currencyIssue) issues.push(currencyIssue);

  // Rule 10: Detect missing values in data
  const missingValueIssue = detectMissingValues(parsed);
  if (missingValueIssue) issues.push(missingValueIssue);

  // Rule 11: Detect formula injection risks
  const formulaIssue = detectFormulaInjection(parsed);
  if (formulaIssue) issues.push(formulaIssue);

  // Rule 12: Detect non-ASCII / Unicode characters
  const unicodeIssue = detectUnicodeData(parsed);
  if (unicodeIssue) issues.push(unicodeIssue);

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
      if (cell !== cell.trim() && cell.trim() !== '') {
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
    title: `${count} cells contain extra whitespace`,
    explanation: `${count} cells have leading or trailing spaces. Safe to trim automatically to prevent database matching errors.`,
    affectedRows,
    count,
    safetyLevel: 'safe',
  };
}

function detectWhitespaceOnly(parsed: ParsedCSV): DiagnosticIssue | null {
  const affectedRows: number[] = [];
  let count = 0;

  parsed.rows.forEach((row, rowIndex) => {
    row.forEach((cell) => {
      if (cell.length > 0 && cell.trim() === '') {
        if (!affectedRows.includes(rowIndex)) {
          affectedRows.push(rowIndex);
        }
        count++;
      }
    });
  });

  if (count === 0) return null;

  return {
    id: 'whitespace-only',
    type: 'whitespace-only',
    severity: 'warning',
    title: `${count} cells contain space-only values`,
    explanation: `${count} cells contain spaces instead of empty strings. Safe to convert to clean empty cells.`,
    affectedRows,
    count,
    safetyLevel: 'safe',
  };
}

function detectDuplicates(parsed: ParsedCSV): DiagnosticIssue | null {
  const seen = new Map<string, number>();
  const affectedRows: number[] = [];

  parsed.rows.forEach((row, index) => {
    const key = JSON.stringify(row);
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
    explanation: `${affectedRows.length} rows are exact duplicates. Review is recommended before removal to ensure no valid identical transactions are deleted.`,
    affectedRows,
    count: affectedRows.length,
    safetyLevel: 'review-recommended',
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
    explanation: `${affectedRows.length} rows are completely blank. Safe to remove.`,
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
    explanation: `${affectedColumns.length} columns contain no data: ${columnNames.join(', ')}. Review recommended before dropping columns.`,
    affectedRows: [],
    affectedColumns,
    count: affectedColumns.length,
    safetyLevel: 'review-recommended',
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
    explanation: `${affectedRows.length} rows differ from the expected column count (${parsed.columnCount}). Extra columns will be quarantined safely rather than silently truncated.`,
    affectedRows,
    count: affectedRows.length,
    safetyLevel: 'potentially-destructive',
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
    explanation: `Header issues detected: ${issues.join(', ')}. Standardizing headers prevents SQL/database insertion failures.`,
    affectedRows: [],
    affectedColumns,
    count: issues.length,
    safetyLevel: 'safe',
  };
}

function detectHeaderCaseIssues(parsed: ParsedCSV): DiagnosticIssue | null {
  const nonSnakeOrCamel = parsed.headers.filter(h => h.includes(' ') || (/[A-Z]/.test(h) && /[a-z]/.test(h)));
  if (nonSnakeOrCamel.length === 0) return null;

  return {
    id: 'header-case',
    type: 'header-case',
    severity: 'info',
    title: `${nonSnakeOrCamel.length} headers contain spaces or mixed casing`,
    explanation: `Headers like "${nonSnakeOrCamel.slice(0, 3).join('", "')}" contain spaces or inconsistent casing. Standardizing to snake_case simplifies API usage.`,
    affectedRows: [],
    count: nonSnakeOrCamel.length,
    safetyLevel: 'safe',
  };
}

function detectCurrencyFormatting(parsed: ParsedCSV): DiagnosticIssue | null {
  let count = 0;
  const currencyRegex = /^\s*[$€£¥]\s*[\d,]+(\.\d+)?\s*$/;

  parsed.rows.forEach(row => {
    row.forEach(cell => {
      if (currencyRegex.test(cell)) {
        count++;
      }
    });
  });

  if (count === 0) return null;

  return {
    id: 'unformatted-currency',
    type: 'unformatted-currency',
    severity: 'info',
    title: `${count} formatted currency values found`,
    explanation: `Values containing currency symbols or commas (e.g. "$1,250.00") can be stripped to raw numeric values. Review recommended.`,
    affectedRows: [],
    count,
    safetyLevel: 'review-recommended',
  };
}

function detectMissingValues(parsed: ParsedCSV): DiagnosticIssue | null {
  let count = 0;
  parsed.rows.forEach(row => {
    row.forEach(cell => {
      const lower = cell.toLowerCase();
      if (cell === '' || lower === 'null' || lower === 'undefined' || lower === 'n/a' || lower === 'na' || lower === 'none') {
        count++;
      }
    });
  });

  if (count === 0) return null;

  return {
    id: 'missing-values',
    type: 'missing-values',
    severity: 'warning',
    title: `${count} missing or placeholder cell values`,
    explanation: `${count} cells contain empty or placeholder values (N/A, NULL). You can impute custom replacement values.`,
    affectedRows: [],
    count,
    safetyLevel: 'review-recommended',
  };
}

function detectFormulaInjection(parsed: ParsedCSV): DiagnosticIssue | null {
  const affectedRows: number[] = [];
  let count = 0;
  const formulaRegex = /^\s*([=+\-@|])(SUM|CMD|EVAL|DDE|HYPERLINK|SYSTEM|\d|\w|\.|\()/i;

  parsed.rows.forEach((row, rowIndex) => {
    row.forEach(cell => {
      if (formulaRegex.test(cell)) {
        if (!affectedRows.includes(rowIndex)) {
          affectedRows.push(rowIndex);
        }
        count++;
      }
    });
  });

  if (count === 0) return null;

  return {
    id: 'formula-injection',
    type: 'formula-injection',
    severity: 'critical',
    title: `${count} formula injection risks detected`,
    explanation: `${count} cells start with formula triggers (=, +, -, @). When opened in Excel, these can execute arbitrary commands or leak data.`,
    affectedRows,
    count,
    safetyLevel: 'review-recommended',
  };
}

function detectUnicodeData(parsed: ParsedCSV): DiagnosticIssue | null {
  const affectedRows: number[] = [];
  let count = 0;
  // Non-ASCII character regex
  const nonAsciiRegex = /[^\x00-\x7F]/;

  parsed.rows.forEach((row, rowIndex) => {
    row.forEach(cell => {
      if (nonAsciiRegex.test(cell)) {
        if (!affectedRows.includes(rowIndex)) {
          affectedRows.push(rowIndex);
        }
        count++;
      }
    });
  });

  if (count === 0) return null;

  return {
    id: 'unicode-data',
    type: 'unicode-data',
    severity: 'info',
    title: `${count} cells contain non-ASCII/Unicode characters`,
    explanation: `International characters, non-English scripts, or emojis detected. Verified safe under UTF-8 encoding.`,
    affectedRows,
    count,
    safetyLevel: 'safe',
  };
}

function calculateHealthScore(issues: DiagnosticIssue[], parsed: ParsedCSV): number {
  if (parsed.rowCount === 0) return 100;

  let totalDeduction = 0;

  issues.forEach(issue => {
    const ratio = Math.min(1, issue.count / Math.max(1, parsed.rowCount));

    switch (issue.severity) {
      case 'critical':
        totalDeduction += 15 + ratio * 25;
        break;
      case 'warning':
        totalDeduction += 5 + ratio * 15;
        break;
      case 'info':
        totalDeduction += 2 + ratio * 5;
        break;
    }
  });

  const finalScore = Math.max(0, Math.min(100, Math.round(100 - totalDeduction)));
  return finalScore;
}

