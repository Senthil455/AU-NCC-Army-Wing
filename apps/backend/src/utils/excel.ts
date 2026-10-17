import ExcelJS from 'exceljs';
import type { Response } from 'express';

export async function sendExcel(
  res: Response,
  filename: string,
  columns: string[],
  rows: Record<string, unknown>[],
  options: { sheetName?: string } = {},
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AU NCC Army Wing';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(options.sheetName ?? 'Report');
  sheet.columns = columns.map((column) => ({ header: column, key: column, width: 18 }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  rows.forEach((row) => sheet.addRow(row));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

/** Load a user-supplied workbook without trusting its size, sheet count or shape. */
export async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

/**
 * A cell can hold a string, number, date, hyperlink, formula result or rich text. Importers care
 * about the text, so normalize every shape to a plain string before validating it.
 */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const cell = value as { text?: unknown; richText?: { text?: string }[]; result?: unknown };
    if (typeof cell.text === 'string') return cell.text.trim();
    if (Array.isArray(cell.richText)) return cell.richText.map((part) => part.text ?? '').join('').trim();
    if (cell.result !== undefined) return cellText(cell.result);
    return String(value);
  }
  return String(value).trim();
}
