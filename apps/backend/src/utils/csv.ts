import { stringify } from 'csv-stringify/sync';
import type { Response } from 'express';

/**
 * Excel, LibreOffice and Sheets evaluate a cell starting with `=`, `+`, `-`, `@`, TAB or CR
 * when a CSV is opened. Cadet data arrives from spreadsheet uploads and self-service forms, so
 * neutralize the classic CSV-injection prefixes before the file leaves the API.
 *
 * (`sendExcel` does not need this: an .xlsx cell written by ExcelJS is typed as a shared string,
 * so spreadsheets never re-interpret it as a formula.)
 */
export function neutralizeFormula(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export function sendCsv(res: Response, filename: string, columns: string[], rows: Record<string, unknown>[]): void {
  const sanitized = rows.map((row) =>
    Object.fromEntries(columns.map((column) => [column, neutralizeFormula(row[column])])),
  );
  const csv = stringify(sanitized, { header: true, columns });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

/** Single-value CSV response, used by the bulk-upload error report. */
export function sendCsvText(res: Response, filename: string, text: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(text);
}
