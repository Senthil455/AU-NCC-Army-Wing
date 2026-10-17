import type { Request, Response } from 'express';
import multer from 'multer';
import type { ExportFormat } from '@ncc/shared';
import { asyncHandler } from '../../common/asyncHandler.js';
import { badRequest } from '../../common/errors.js';
import { requireUser } from '../../middleware/auth.js';
import { sendCsv } from '../../utils/csv.js';
import { sendExcel } from '../../utils/excel.js';
import { sendPdf } from '../../utils/pdf.js';
import * as service from './service.js';
import { cadetFilterSchema, cadetSchema, cadetUpdateSchema } from './validators.js';

const XLSX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  // Some browsers send octet-stream for .xlsx; the extension check below still applies.
  'application/octet-stream',
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!/\.xlsx?$/i.test(file.originalname) || !XLSX_MIME_TYPES.has(file.mimetype)) {
      cb(badRequest('Attach an .xlsx file — download the template from GET /cadets/template'));
      return;
    }
    cb(null, true);
  },
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const filter = cadetFilterSchema.parse(req.query);
  res.json(await service.listCadets(filter, requireUser(req)));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getCadet(req.params.id, requireUser(req)));
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getOwnCadet(requireUser(req).sub));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const body = cadetSchema.parse(req.body);
  res.status(201).json(await service.createCadet(body, requireUser(req), req.ip));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const body = cadetUpdateSchema.parse(req.body);
  res.json(await service.updateCadet(req.params.id, body, requireUser(req), req.ip));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.deactivateCadet(req.params.id, requireUser(req), req.ip));
});

async function runExport(req: Request, format: ExportFormat): Promise<service.ExportPayload> {
  const filter = cadetFilterSchema.parse(req.query);
  const actor = requireUser(req);
  const columns = service.parseColumns(filter.columns, filter.includeSensitive, actor.role);
  const payload = await service.exportRows(filter, columns, actor);
  service.auditExport({ actor, format, payload, filter, ip: req.ip });
  return payload;
}

function exportFilename(format: ExportFormat): string {
  return `cadets-${new Date().toISOString().slice(0, 10)}.${format}`;
}

export const exportXlsx = asyncHandler(async (req: Request, res: Response) => {
  const payload = await runExport(req, 'xlsx');
  await sendExcel(res, exportFilename('xlsx'), payload.columns, payload.rows, { sheetName: 'Cadets' });
});

export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  const payload = await runExport(req, 'csv');
  sendCsv(res, exportFilename('csv'), payload.columns, payload.rows);
});

export const exportPdf = asyncHandler(async (req: Request, res: Response) => {
  const payload = await runExport(req, 'pdf');
  sendPdf(res, exportFilename('pdf'), 'NCC Army Wing — Cadet List', payload.columns, payload.rows);
});

export const template = asyncHandler(async (_req: Request, res: Response) => {
  const buffer = await service.buildTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="cadet-template.xlsx"');
  res.send(buffer);
});

export const bulkUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw badRequest('Attach the spreadsheet as multipart field "file"');
  res.json(await service.bulkUpload(req.file.buffer, requireUser(req), req.ip));
});
