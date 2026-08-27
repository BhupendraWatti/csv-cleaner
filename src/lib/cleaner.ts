import type { ParsedCSV, DiagnosticIssue, CleanedResult, QuarantinedRow, HeaderCaseOption, FindAndReplaceConfig } from './types';

export function cleanCSV(
  parsed: ParsedCSV,
  issuesToFix: DiagnosticIssue[],
  options?: {
    headerCase?: HeaderCaseOption;
    findReplace?: FindAndReplaceConfig;
    missingValueReplacement?: string;
  }
): CleanedResult {
  let cleanedHeaders = [...parsed.headers];
  let cleanedRows = [...parsed.rows.map(row => [...row])];
  const quarantinedRows: QuarantinedRow[] = [];
  let rowsRemoved = 0;
  let cellsModified = 0;

  const issuesByType = new Map<string, DiagnosticIssue>();
  issuesToFix.forEach(issue => issuesByType.set(issue.type, issue));

  // 1. Trim whitespace (safe)
  if (issuesByType.has('whitespace')) {
    const result = trimWhitespace(cleanedRows);
    cleanedRows = result.rows;
    cellsModified += result.modified;
  }

  // 2. Clear whitespace-only cells (safe)
  if (issuesByType.has('whitespace-only')) {
    const result = clearWhitespaceOnly(cleanedRows);
    cleanedRows = result.rows;
    cellsModified += result.modified;
  }

  // 3. Remove empty rows (safe)
  if (issuesByType.has('empty-rows')) {
    const result = removeEmptyRows(cleanedRows);
    cleanedRows = result.rows;
    rowsRemoved += result.removed;
  }

  // 4. Remove duplicate rows (review recommended)
  if (issuesByType.has('duplicate-rows')) {
    const result = removeDuplicates(cleanedRows);
    cleanedRows = result.rows;
    rowsRemoved += result.removed;
  }

  // 5. Fix malformed rows & quarantine extra columns (potentially destructive if truncated)
  if (issuesByType.has('malformed-rows')) {
    const result = fixAndQuarantineMalformedRows(cleanedRows, parsed.columnCount);
    cleanedRows = result.rows;
    quarantinedRows.push(...result.quarantined);
    cellsModified += result.modified;
    rowsRemoved += result.quarantined.length;
  }

  // 6. Clean header casing (optional / issue-based)
  if (issuesByType.has('header-case') || options?.headerCase) {
    const caseFormat = options?.headerCase || 'snake_case';
    cleanedHeaders = formatHeaderCase(cleanedHeaders, caseFormat);
  }

  // 7. Currency formatting strip (review recommended)
  if (issuesByType.has('unformatted-currency')) {
    const result = stripCurrencySymbols(cleanedRows);
    cleanedRows = result.rows;
    cellsModified += result.modified;
  }

  // 8. Escape formula injection risks (review recommended)
  if (issuesByType.has('formula-injection')) {
    const result = escapeFormulaInjection(cleanedRows);
    cleanedRows = result.rows;
    cellsModified += result.modified;
  }

  // 9. Impute missing values (review recommended)
  if (issuesByType.has('missing-values') && options?.missingValueReplacement !== undefined) {
    const result = imputeMissingValues(cleanedRows, options.missingValueReplacement);
    cleanedRows = result.rows;
    cellsModified += result.modified;
  }

  // 10. Find and Replace transform
  if (options?.findReplace && options.findReplace.search) {
    const result = applyFindAndReplace(cleanedRows, options.findReplace);
    cleanedRows = result.rows;
    cellsModified += result.modified;
  }

  return {
    cleanedHeaders,
    cleanedRows,
    quarantinedRows,
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
      if (trimmed !== cell && trimmed !== '') {
        modified++;
        return trimmed;
      }
      return cell;
    })
  );
  return { rows: cleanedRows, modified };
}

function clearWhitespaceOnly(rows: string[][]): { rows: string[][]; modified: number } {
  let modified = 0;
  const cleanedRows = rows.map(row =>
    row.map(cell => {
      if (cell.length > 0 && cell.trim() === '') {
        modified++;
        return '';
      }
      return cell;
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
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return { rows: cleanedRows, removed: initialCount - cleanedRows.length };
}

function fixAndQuarantineMalformedRows(
  rows: string[][],
  expectedColumns: number
): { rows: string[][]; quarantined: QuarantinedRow[]; modified: number } {
  let modified = 0;
  const quarantined: QuarantinedRow[] = [];
  const validRows: string[][] = [];

  rows.forEach((row, originalIndex) => {
    if (row.length === expectedColumns) {
      validRows.push(row);
    } else if (row.length < expectedColumns) {
      // Safe modification: pad missing columns with empty string
      modified++;
      validRows.push([...row, ...Array(expectedColumns - row.length).fill('')]);
    } else {
      // Extra columns detected: quarantine row to avoid silent data truncation
      quarantined.push({
        originalIndex,
        row,
        reason: `Row has ${row.length} columns (expected ${expectedColumns}). Quarantined to prevent data loss.`,
      });
    }
  });

  return { rows: validRows, quarantined, modified };
}

export function formatHeaderCase(headers: string[], format: HeaderCaseOption): string[] {
  return headers.map(h => {
    let clean = h.trim();
    if (!clean) return 'column';

    switch (format) {
      case 'snake_case':
        return clean.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      case 'camelCase':
        return clean
          .toLowerCase()
          .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
      case 'UPPERCASE':
        return clean.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      case 'lowercase':
        return clean.toLowerCase();
      case 'Title Case':
        return clean.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
      default:
        return clean;
    }
  });
}

function stripCurrencySymbols(rows: string[][]): { rows: string[][]; modified: number } {
  let modified = 0;
  const currencyRegex = /^\s*[$€£¥]\s*([\d,]+(?:\.\d+)?)\s*$/;

  const cleanedRows = rows.map(row =>
    row.map(cell => {
      const match = cell.match(currencyRegex);
      if (match) {
        modified++;
        return match[1].replace(/,/g, '');
      }
      return cell;
    })
  );

  return { rows: cleanedRows, modified };
}

function escapeFormulaInjection(rows: string[][]): { rows: string[][]; modified: number } {
  let modified = 0;
  const formulaRegex = /^\s*([=+\-@|])(SUM|CMD|EVAL|DDE|HYPERLINK|SYSTEM|\d|\w|\.|\()/i;

  const cleanedRows = rows.map(row =>
    row.map(cell => {
      if (formulaRegex.test(cell) && !cell.startsWith("'")) {
        modified++;
        return `'${cell}`;
      }
      return cell;
    })
  );

  return { rows: cleanedRows, modified };
}

function imputeMissingValues(rows: string[][], replacement: string): { rows: string[][]; modified: number } {
  let modified = 0;
  const cleanedRows = rows.map(row =>
    row.map(cell => {
      const lower = cell.toLowerCase();
      if (cell === '' || lower === 'null' || lower === 'undefined' || lower === 'n/a' || lower === 'na' || lower === 'none') {
        modified++;
        return replacement;
      }
      return cell;
    })
  );
  return { rows: cleanedRows, modified };
}

function applyFindAndReplace(rows: string[][], config: FindAndReplaceConfig): { rows: string[][]; modified: number } {
  let modified = 0;
  const flags = config.matchCase ? 'g' : 'gi';
  let regex: RegExp;

  try {
    regex = config.isRegex ? new RegExp(config.search, flags) : new RegExp(escapeRegExp(config.search), flags);
  } catch (e) {
    return { rows, modified: 0 };
  }

  const cleanedRows = rows.map(row =>
    row.map((cell, colIndex) => {
      if (config.columnIndex !== undefined && config.columnIndex !== colIndex) return cell;
      const newCell = cell.replace(regex, config.replace);
      if (newCell !== cell) {
        modified++;
        return newCell;
      }
      return cell;
    })
  );

  return { rows: cleanedRows, modified };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getSampleCSV(): string {
  return `First Name,Email Address,Company Name,Status,Monthly Spend
  Sarah  ,sarah@acme.co,Acme Corp,Active,$1,250.00
  John  ,john@smith .com,Smith LLC,Pending,$850.00
,,,,
Sarah,sarah@acme.co,Acme Corp,Active,$1,250.00
  David  ,david@design.io ,Design IO,Active,$3,400.00
  Emily,emily@tech.com,Tech Solutions,Pending,N/A
,,,,
  Alex,alex@global.org ,Global Org,Active,$920.00
David,david@design.io,Design IO,Active,$3,400.00`;
}

