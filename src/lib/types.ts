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
  | 'header-inconsistency'
  | 'header-case'
  | 'invalid-dates'
  | 'unformatted-currency'
  | 'missing-values';

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
  cleanedHeaders: string[];
  cleanedRows: string[][];
  rowsRemoved: number;
  cellsModified: number;
  report: DiagnosticReport;
}

export type HeaderCaseOption = 'snake_case' | 'camelCase' | 'UPPERCASE' | 'Title Case' | 'lowercase';

export interface FindAndReplaceConfig {
  search: string;
  replace: string;
  isRegex: boolean;
  matchCase: boolean;
  columnIndex?: number; // undefined means all columns
}

export type ExportFormat = 'csv' | 'tsv' | 'json' | 'xlsx';
