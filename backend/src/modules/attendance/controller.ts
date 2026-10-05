import { Request, Response } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import * as service from './service.js';
import { sessionSchema, markSchema } from './validators.js';
import { sendExcel } from '../../utils/excel.js';
import { sendPdf } from '../../utils/pdf.js';
import { audit } from '../../common/audit.js';

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const body = sessionSchema.parse(req.body);
  res.status(201).json(await service.createSession(body, req.user!.sub));
});

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listSessions(req.query as Record<string, string>));
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getSession(req.params.id));
});

export const mark = asyncHandler(async (req: Request, res: Response) => {
  const body = markSchema.parse(req.body);
  res.json(await service.markAttendance(req.params.id, body, req.user!.sub, req.user!.role, req.ip));
});

export const report = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.report(req.query as Record<string, string>));
});

export const reportXlsx = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = await service.report(req.query as Record<string, string>);
  const flat = rows.map((r) => ({ name: r.cadet.name, regdNo: r.cadet.regdNo, platoon: r.cadet.platoon, present: r.present, total: r.total, pct: r.pct, lowAttendance: r.lowAttendance ? 'YES' : 'NO' }));
  audit('attendance.report.export', 'AttendanceSession', { actorId: req.user!.sub, meta: { format: 'xlsx' }, ip: req.ip });
  await sendExcel(res, 'attendance-report.xlsx', ['name', 'regdNo', 'platoon', 'present', 'total', 'pct', 'lowAttendance'], flat);
});

export const reportPdf = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = await service.report(req.query as Record<string, string>);
  const flat = rows.map((r) => ({ name: r.cadet.name, regdNo: r.cadet.regdNo, present: `${r.present}/${r.total}`, pct: `${r.pct}%` }));
  audit('attendance.report.export', 'AttendanceSession', { actorId: req.user!.sub, meta: { format: 'pdf' }, ip: req.ip });
  sendPdf(res, 'attendance-report.pdf', 'NCC — Attendance Report', ['name', 'regdNo', 'present', 'pct'], flat);
});
