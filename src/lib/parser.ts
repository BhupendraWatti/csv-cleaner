import Papa from 'papaparse';
import type { ParsedCSV } from './types';

export function stripBOM(text: string): { cleanedText: string; hasBOM: boolean } {
  if (text.charCodeAt(0) === 0xFEFF || text.startsWith('\uFEFF')) {
    return { cleanedText: text.replace(/^\uFEFF/, ''), hasBOM: true };
  }
  return { cleanedText: text, hasBOM: false };
}

export function sanitizeCSVText(rawText: string): { sanitizedText: string; hasBOM: boolean } {
  const { cleanedText, hasBOM } = stripBOM(rawText);
  // Normalize Windows CRLF and Mac CR to standard LF
  const sanitizedText = cleanedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return { sanitizedText, hasBOM };
}

export function parseCSVText(csvText: string, fileName: string = 'file.csv', fileSize: number = 0): ParsedCSV {
  const { sanitizedText, hasBOM } = sanitizeCSVText(csvText);

  if (!sanitizedText || sanitizedText.trim() === '') {
    return {
      raw: csvText,
      rows: [],
      headers: [],
      delimiter: ',',
      rowCount: 0,
      columnCount: 0,
      fileName,
      fileSize,
      hasBOM,
      isEmptyFile: true,
      isHeaderOnly: false,
    };
  }

  const result = Papa.parse(sanitizedText, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false, // Keep everything as strings to preserve leading zeros
  });

  const rows = (result.data || []) as string[][];
  const headers = rows.length > 0 ? rows[0] : [];
  const dataRows = rows.slice(1);
  const isEmptyFile = rows.length === 0;
  const isHeaderOnly = rows.length === 1 && dataRows.length === 0;

  return {
    raw: sanitizedText,
    rows: dataRows,
    headers,
    delimiter: result.meta.delimiter || ',',
    rowCount: dataRows.length,
    columnCount: headers.length,
    fileName,
    fileSize: fileSize || new Blob([sanitizedText]).size,
    hasBOM,
    isEmptyFile,
    isHeaderOnly,
  };
}

export function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const parsed = parseCSVText(text, file.name, file.size);
        resolve(parsed);
      } catch (error) {
        reject(new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file from disk'));
    };

    reader.readAsText(file);
  });
}

export function parseSampleCSV(csvText: string, fileName: string = 'sample.csv'): ParsedCSV {
  return parseCSVText(csvText, fileName);
}

export function unparseCSV(headers: string[], rows: string[][], delimiter: string = ','): string {
  return Papa.unparse({
    fields: headers,
    data: rows,
  }, {
    delimiter,
    newline: '\n',
  });
}

