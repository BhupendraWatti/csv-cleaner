import { parseCSVText } from './parser';
import type { ParsedCSV, CleanedResult, VerificationReport } from './types';

export function verifyCleanedCSV(
  originalParsed: ParsedCSV,
  cleanedResult: CleanedResult,
  unparsedCSV: string
): VerificationReport {
  const messages: string[] = [];

  try {
    // 1. Re-parse the generated output CSV string
    const reParsed = parseCSVText(unparsedCSV, 'verified.csv', new Blob([unparsedCSV]).size);

    if (reParsed.isEmptyFile && originalParsed.rowCount > 0 && cleanedResult.cleanedRows.length > 0) {
      return {
        isValid: false,
        error: 'Verification Failed: Exported file is empty despite having cleaned rows.',
        beforeStats: {
          rowCount: originalParsed.rowCount,
          columnCount: originalParsed.columnCount,
          cellSize: calculateTotalCells(originalParsed.rows),
        },
        afterStats: {
          rowCount: 0,
          columnCount: 0,
          cellSize: 0,
        },
        rowsRemoved: cleanedResult.rowsRemoved,
        cellsModified: cleanedResult.cellsModified,
        quarantinedCount: cleanedResult.quarantinedRows.length,
        messages: ['❌ Generated CSV output re-parsed as empty file.'],
      };
    }

    // 2. Validate row count
    const expectedRowCount = cleanedResult.cleanedRows.length;
    const actualRowCount = reParsed.rowCount;
    if (actualRowCount !== expectedRowCount) {
      messages.push(`❌ Row count mismatch: expected ${expectedRowCount}, got ${actualRowCount} after re-parsing.`);
    } else {
      messages.push(`✅ Structural validity confirmed: ${actualRowCount} data rows verified.`);
    }

    // 3. Validate column count
    const expectedColCount = cleanedResult.cleanedHeaders.length;
    const actualColCount = reParsed.columnCount;
    if (actualColCount !== expectedColCount) {
      messages.push(`❌ Column count mismatch: expected ${expectedColCount}, got ${actualColCount}.`);
    } else {
      messages.push(`✅ Header structure verified: ${actualColCount} columns aligned.`);
    }

    // 4. Summarize transformations & safety checks
    if (cleanedResult.rowsRemoved > 0) {
      messages.push(`ℹ️ ${cleanedResult.rowsRemoved} rows purged (duplicates, blank rows, or quarantined).`);
    }

    if (cleanedResult.cellsModified > 0) {
      messages.push(`ℹ️ ${cleanedResult.cellsModified} cell values sanitized.`);
    }

    if (cleanedResult.quarantinedRows.length > 0) {
      messages.push(`⚠️ ${cleanedResult.quarantinedRows.length} rows quarantined to prevent silent truncation.`);
    }

    const isValid = actualRowCount === expectedRowCount && actualColCount === expectedColCount;

    return {
      isValid,
      beforeStats: {
        rowCount: originalParsed.rowCount,
        columnCount: originalParsed.columnCount,
        cellSize: calculateTotalCells(originalParsed.rows),
      },
      afterStats: {
        rowCount: reParsed.rowCount,
        columnCount: reParsed.columnCount,
        cellSize: calculateTotalCells(reParsed.rows),
      },
      rowsRemoved: cleanedResult.rowsRemoved,
      cellsModified: cleanedResult.cellsModified,
      quarantinedCount: cleanedResult.quarantinedRows.length,
      messages,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Verification Re-parse Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      beforeStats: {
        rowCount: originalParsed.rowCount,
        columnCount: originalParsed.columnCount,
        cellSize: calculateTotalCells(originalParsed.rows),
      },
      afterStats: {
        rowCount: 0,
        columnCount: 0,
        cellSize: 0,
      },
      rowsRemoved: cleanedResult.rowsRemoved,
      cellsModified: cleanedResult.cellsModified,
      quarantinedCount: cleanedResult.quarantinedRows.length,
      messages: [`❌ Fatal parsing error while verifying generated CSV string: ${err instanceof Error ? err.message : 'Unknown'}`],
    };
  }
}

function calculateTotalCells(rows: string[][]): number {
  return rows.reduce((acc, row) => acc + row.length, 0);
}
