import { parseCSVText, unparseCSV } from './parser';
import { diagnoseCSV } from './diagnostics';
import { cleanCSV } from './cleaner';
import { verifyCleanedCSV } from './verifier';
import type { ParsedCSV, DiagnosticReport, DiagnosticIssue, CleanedResult, VerificationReport, HeaderCaseOption, FindAndReplaceConfig } from './types';

export interface ParseAndDiagnoseResult {
  parsed: ParsedCSV;
  report: DiagnosticReport;
}

export interface CleanAndVerifyResult {
  cleanedResult: CleanedResult;
  unparsedCSV: string;
  verificationReport: VerificationReport;
}

export async function parseAndDiagnoseAsync(
  csvText: string,
  fileName: string = 'file.csv',
  fileSize: number = 0
): Promise<ParseAndDiagnoseResult> {
  // If Worker is available and file > 100KB, use Web Worker
  if (typeof window !== 'undefined' && window.Worker && csvText.length > 100 * 1024) {
    try {
      return await executeInWorker<ParseAndDiagnoseResult>({
        type: 'PARSE_AND_DIAGNOSE',
        csvText,
        fileName,
        fileSize,
      });
    } catch (e) {
      console.warn('Worker execution failed, falling back to main thread:', e);
    }
  }

  // Fallback: Inline synchronous execution
  const parsed = parseCSVText(csvText, fileName, fileSize);
  const report = diagnoseCSV(parsed);
  return { parsed, report };
}

export async function cleanAndVerifyAsync(
  parsed: ParsedCSV,
  issuesToFix: DiagnosticIssue[],
  options?: {
    headerCase?: HeaderCaseOption;
    findReplace?: FindAndReplaceConfig;
    missingValueReplacement?: string;
  }
): Promise<CleanAndVerifyResult> {
  if (typeof window !== 'undefined' && window.Worker && parsed.rowCount > 500) {
    try {
      return await executeInWorker<CleanAndVerifyResult>({
        type: 'CLEAN_AND_VERIFY',
        parsed,
        issuesToFix,
        options,
      });
    } catch (e) {
      console.warn('Worker clean failed, falling back to main thread:', e);
    }
  }

  const cleanedResult = cleanCSV(parsed, issuesToFix, options);
  const unparsedCSV = unparseCSV(cleanedResult.cleanedHeaders, cleanedResult.cleanedRows, parsed.delimiter || ',');
  const verificationReport = verifyCleanedCSV(parsed, cleanedResult, unparsedCSV);

  return { cleanedResult, unparsedCSV, verificationReport };
}

function executeInWorker<T>(message: any): Promise<T> {
  return new Promise((resolve, reject) => {
    // Vite Web Worker instantiation
    const worker = new Worker(new URL('../workers/csv.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e) => {
      const { success, payload, error } = e.data;
      worker.terminate();
      if (success) {
        resolve(payload);
      } else {
        reject(new Error(error || 'Worker error'));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    worker.postMessage(message);
  });
}
