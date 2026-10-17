import PDFDocument from 'pdfkit';
import type { Response } from 'express';

const MAX_ROWS = 500;
const MAX_CELL_CHARS = 40;

export function sendPdf(
  res: Response,
  filename: string,
  title: string,
  columns: string[],
  rows: Record<string, unknown>[],
): void {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
  doc.pipe(res);
  doc.fontSize(16).text(title, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(9).text(`Generated: ${new Date().toLocaleString('en-IN')} | Rows: ${rows.length}`);
  doc.moveDown(0.5);

  // Print-ready list. Excel/CSV stay the primary formats for analysis, and this layout can be
  // upgraded without changing the HTTP contract.
  doc.font('Helvetica-Bold').text(columns.join('  |  '));
  doc.moveDown(0.25);
  doc.font('Helvetica');

  rows.slice(0, MAX_ROWS).forEach((row, index) => {
    const line = columns.map((column) => truncate(row[column])).join('  |  ');
    doc.text(`${index + 1}. ${line}`);
    if (index % 40 === 39) doc.moveDown(0.25);
  });

  if (rows.length > MAX_ROWS) {
    doc.moveDown().text(`... ${rows.length - MAX_ROWS} more rows — use the Excel or CSV export for the full set.`);
  }

  doc.end();
}

function truncate(value: unknown): string {
  const text = value === null || value === undefined || value === '' ? '-' : String(value);
  return text.length > MAX_CELL_CHARS ? `${text.slice(0, MAX_CELL_CHARS - 1)}…` : text;
}
