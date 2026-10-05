import PDFDocument from 'pdfkit';
import { Response } from 'express';

export function sendPdf(res: Response, filename: string, title: string, columns: string[], rows: Record<string, unknown>[]) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
  doc.pipe(res);
  doc.fontSize(16).text(title, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(9).text(`Generated: ${new Date().toLocaleString('en-IN')} | Rows: ${rows.length}`);
  doc.moveDown(0.5);
  // Simple print-ready list (Excel is primary for analysis; table layout can be upgraded without contract change)
  doc.font('Helvetica-Bold').text(columns.join('  |  '));
  doc.moveDown(0.25);
  doc.font('Helvetica');
  rows.slice(0, 500).forEach((r, idx) => {
    const line = columns.map((c) => String(r[c] ?? '-')).join('  |  ');
    doc.text(`${idx + 1}. ${line}`);
    if (idx % 40 === 39) doc.moveDown(0.25);
  });
  if (rows.length > 500) doc.moveDown().text(`... ${rows.length - 500} more rows in Excel export.`);
  doc.end();
}
