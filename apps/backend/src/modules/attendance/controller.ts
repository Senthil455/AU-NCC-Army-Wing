import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { audit } from '../../common/audit.js';
import { requireUser } from '../../middleware/auth.js';
import { sendExcel } from '../../utils/excel.js';
import { sendPdf } from '../../utils/pdf.js';
import * as service from './service.js';
import { markSchema, reportFilterSchema, sessionFilterSchema, sessionSchema } from './validators.js';

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const body = sessionSchema.parse(req.body);
  res.status(201).json(await service.createSession(body, requireUser(req), req.ip));
});

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const filter = sessionFilterSchema.parse(req.query);
  res.json(await service.listSessions(filter, requireUser(req)));
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getSession(req.params.id, requireUser(req)));
});

export const mark = asyncHandler(async (req: Request, res: Response) => {
  const body = markSchema.parse(req.body);
  res.json(await service.markAttendance(req.params.id, body, requireUser(req), req.ip));
});

export const report = asyncHandler(async (req: Request, res: Response) => {
  const filter = reportFilterSchema.parse(req.query);
  res.json(await service.report(filter, requireUser(req)));
});

export const reportXlsx = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireUser(req);
  const { rows, totalSessions } = await service.report(reportFilterSchema.parse(req.query), actor);
  const flat = rows.map((row) => ({
    name: row.cadet.name,
    regdNo: row.cadet.regdNo,
    platoon: row.cadet.platoon,
    department: row.cadet.department,
    present: row.present,
    total: row.total,
    pct: row.pct,
    lowAttendance: row.lowAttendance ? 'YES' : 'NO',
  }));
  audit('attendance.report.export', 'AttendanceSession', {
    actorId: actor.sub,
    actorRole: actor.role,
    meta: { format: 'xlsx', totalSessions, rows: flat.length },
    ip: req.ip,
  });
  await sendExcel(
    res,
    `attendance-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
    ['name', 'regdNo', 'platoon', 'department', 'present', 'total', 'pct', 'lowAttendance'],
    flat,
    { sheetName: 'Attendance' },
  );
});

export const reportPdf = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireUser(req);
  const { rows, totalSessions } = await service.report(reportFilterSchema.parse(req.query), actor);
  const flat = rows.map((row) => ({
    name: row.cadet.name,
    regdNo: row.cadet.regdNo,
    platoon: row.cadet.platoon,
    present: `${row.present}/${row.total}`,
    pct: `${row.pct}%`,
    flag: row.lowAttendance ? 'BELOW THRESHOLD' : '',
  }));
  audit('attendance.report.export', 'AttendanceSession', {
    actorId: actor.sub,
    actorRole: actor.role,
    meta: { format: 'pdf', totalSessions, rows: flat.length },
    ip: req.ip,
  });
  sendPdf(res, `attendance-report-${new Date().toISOString().slice(0, 10)}.pdf`, 'NCC — Attendance Report', ['name', 'regdNo', 'platoon', 'present', 'pct', 'flag'], flat);
});
