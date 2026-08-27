import { parseCSVText, unparseCSV } from '../lib/parser';
import { diagnoseCSV } from '../lib/diagnostics';
import { cleanCSV } from '../lib/cleaner';
import { verifyCleanedCSV } from '../lib/verifier';
import type { ParsedCSV, DiagnosticIssue, HeaderCaseOption, FindAndReplaceConfig } from '../lib/types';

export interface WorkerParseRequest {
  type: 'PARSE_AND_DIAGNOSE';
  csvText: string;
  fileName: string;
  fileSize: number;
}

export interface WorkerCleanRequest {
  type: 'CLEAN_AND_VERIFY';
  parsed: ParsedCSV;
  issuesToFix: DiagnosticIssue[];
  options?: {
    headerCase?: HeaderCaseOption;
    findReplace?: FindAndReplaceConfig;
    missingValueReplacement?: string;
  };
}

export type WorkerMessage = WorkerParseRequest | WorkerCleanRequest;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const data = e.data;

  try {
    if (data.type === 'PARSE_AND_DIAGNOSE') {
      const parsed = parseCSVText(data.csvText, data.fileName, data.fileSize);
      const report = diagnoseCSV(parsed);
      self.postMessage({
        success: true,
        type: 'PARSE_AND_DIAGNOSE',
        payload: { parsed, report },
      });
    } else if (data.type === 'CLEAN_AND_VERIFY') {
      const cleanedResult = cleanCSV(data.parsed, data.issuesToFix, data.options);
      const unparsedCSV = unparseCSV(cleanedResult.cleanedHeaders, cleanedResult.cleanedRows, data.parsed.delimiter || ',');
      const verificationReport = verifyCleanedCSV(data.parsed, cleanedResult, unparsedCSV);

      self.postMessage({
        success: true,
        type: 'CLEAN_AND_VERIFY',
        payload: { cleanedResult, unparsedCSV, verificationReport },
      });
    }
  } catch (err) {
    self.postMessage({
      success: false,
      type: data.type,
      error: err instanceof Error ? err.message : 'Worker processing error',
    });
  }
};
