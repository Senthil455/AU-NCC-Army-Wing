import ExcelJS from 'exceljs';
import { Response } from 'express';

export async function sendExcel(res: Response, filename: string, columns: string[], rows: Record<string, unknown>[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AU NCC Army Wing';
  const ws = wb.addWorksheet('Report');
  ws.columns = columns.map((c) => ({ header: c, key: c, width: 18 }));
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
}

export function pickColumns<T extends Record<string, unknown>>(row: T, columns: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of columns) out[c] = row[c];
  return out;
}
