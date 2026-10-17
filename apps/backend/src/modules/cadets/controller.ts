import { Request, Response } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../common/asyncHandler.js';
import * as service from './service.js';
import { cadetSchema, cadetUpdateSchema, cadetFilterSchema } from './validators.js';
import { sendExcel, pickColumns } from '../../utils/excel.js';
import { sendCsv } from '../../utils/csv.js';
import { sendPdf } from '../../utils/pdf.js';
import ExcelJS from 'exceljs';

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = cadetFilterSchema.partial().parse(req.query);
  res.json(await service.listCadets(req.query as Record<string, string>, req.user!.role));
  void q;
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getCadet(req.params.id, req.user!.role));
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getOwnCadet(req.user!.sub));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const body = cadetSchema.parse(req.body);
  res.status(201).json(await service.createCadet(body as Record<string, unknown>, req.user!.sub, req.ip));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const body = cadetUpdateSchema.parse(req.body);
  res.json(await service.updateCadet(req.params.id, body as Record<string, unknown>, req.user!.sub, req.ip));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.deactivateCadet(req.params.id, req.user!.sub, req.ip));
});

async function exportCommon(req: Request) {
  const columns = service.parseColumns(req.query.columns as string | undefined, req.query.includeSensitive as string | undefined, req.user!.role);
  const rows = await service.exportRows(req.query as Record<string, string>, columns);
  service.auditExport(req.user!.sub, 'export', columns, req.query as Record<string, unknown>, req.ip);
  return { columns, rows };
}

export const exportXlsx = asyncHandler(async (req: Request, res: Response) => {
  const { columns, rows } = await exportCommon(req);
  await sendExcel(res, 'cadets.xlsx', columns, rows.map((r) => pickColumns(r, columns)));
});

export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  const { columns, rows } = await exportCommon(req);
  sendCsv(res, 'cadets.csv', columns, rows);
});

export const exportPdf = asyncHandler(async (req: Request, res: Response) => {
  const { columns, rows } = await exportCommon(req);
  sendPdf(res, 'cadets.pdf', 'NCC Army Wing — Cadet List', columns, rows);
});

export const template = asyncHandler(async (_req: Request, res: Response) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Cadets');
  const cols = ['name', 'regdNo', 'nccRegimentalNo', 'rank', 'department', 'year', 'batch', 'platoon', 'bloodGroup', 'phone', 'email', 'parentContact', 'certificate'];
  ws.columns = cols.map((c) => ({ header: c, key: c, width: 18 }));
  ws.getRow(1).font = { bold: true };
  ws.addRow({ name: 'Example Cadet', regdNo: '2024CS100', department: 'CSE', year: 1, batch: '2024-28', platoon: 'Alpha' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="cadet-template.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

export const bulkUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) res.status(400).json({ error: { message: 'Attach file as field "file"', code: 'BAD_REQUEST' } });
  else res.json(await service.bulkUpload(req.file.buffer, req.user!.sub, req.ip));
});
