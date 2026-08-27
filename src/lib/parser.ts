import Papa from 'papaparse';
import type { ParsedCSV } from './types';

export function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;

      Papa.parse(text, {
        header: false,
        skipEmptyLines: false,
        dynamicTyping: false, // Keep everything as strings to preserve leading zeros
        complete: (results) => {
          const rows = results.data as string[][];
          const headers = rows.length > 0 ? rows[0] : [];
          const dataRows = rows.slice(1);

          resolve({
            raw: text,
            rows: dataRows,
            headers,
            delimiter: results.meta.delimiter || ',',
            rowCount: dataRows.length,
            columnCount: headers.length,
            fileName: file.name,
            fileSize: file.size,
          });
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

export function parseSampleCSV(csvText: string, fileName: string = 'sample.csv'): ParsedCSV {
  const result = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  });

  const rows = result.data as string[][];
  const headers = rows.length > 0 ? rows[0] : [];
  const dataRows = rows.slice(1);

  return {
    raw: csvText,
    rows: dataRows,
    headers,
    delimiter: result.meta.delimiter || ',',
    rowCount: dataRows.length,
    columnCount: headers.length,
    fileName,
    fileSize: new Blob([csvText]).size,
  };
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
