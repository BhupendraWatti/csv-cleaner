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
  hasBOM?: boolean;
  isEmptyFile?: boolean;
  isHeaderOnly?: boolean;
}

export type Severity = 'critical' | 'warning' | 'info';

export type SafetyLevel = 'safe' | 'review-recommended' | 'potentially-destructive';

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
  | 'missing-values'
  | 'formula-injection'
  | 'whitespace-only'
  | 'unicode-data';

export interface DiagnosticIssue {
  id: string;
  type: IssueType;
  severity: Severity;
  title: string;
  explanation: string;
  affectedRows: number[];
  affectedColumns?: number[];
  count: number;
  safetyLevel: SafetyLevel;
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

export interface QuarantinedRow {
  originalIndex: number;
  row: string[];
  reason: string;
}

export interface CleanedResult {
  cleanedHeaders: string[];
  cleanedRows: string[][];
  quarantinedRows: QuarantinedRow[];
  rowsRemoved: number;
  cellsModified: number;
  report: DiagnosticReport;
}

export interface VerificationReport {
  isValid: boolean;
  error?: string;
  beforeStats: {
    rowCount: number;
    columnCount: number;
    cellSize: number;
  };
  afterStats: {
    rowCount: number;
    columnCount: number;
    cellSize: number;
  };
  rowsRemoved: number;
  cellsModified: number;
  quarantinedCount: number;
  messages: string[];
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

