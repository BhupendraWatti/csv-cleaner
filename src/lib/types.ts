// Type definitions for CSV Cleaner

export interface ParsedCSV {
  raw: string;
  rows: string[][];
  headers: string[];
  delimiter: string;
  rowCount: number;
  columnCount: number;
  fileName: string;
  fileSize: number;
}

export type Severity = 'critical' | 'warning' | 'info';

export type IssueType =
  | 'whitespace'
  | 'duplicate-rows'
  | 'empty-rows'
  | 'empty-columns'
  | 'malformed-rows'
  | 'header-inconsistency';

export interface DiagnosticIssue {
  id: string;
  type: IssueType;
  severity: Severity;
  title: string;
  explanation: string;
  affectedRows: number[];
  affectedColumns?: number[];
  count: number;
  safetyLevel: 'safe' | 'needs-review';
}

export interface DiagnosticReport {
  issues: DiagnosticIssue[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
  isClean: boolean;
  healthScore: number;
}

export interface CleanedResult {
  cleanedRows: string[][];
  rowsRemoved: number;
  cellsModified: number;
  report: DiagnosticReport;
}
