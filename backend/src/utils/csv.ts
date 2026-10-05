import { stringify } from 'csv-stringify/sync';
import { Response } from 'express';

export function sendCsv(res: Response, filename: string, columns: string[], rows: Record<string, unknown>[]) {
  const csv = stringify(rows, { header: true, columns });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}
