import { Router } from 'express';
import { prisma } from '../../config/db.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { env } from '../../config/env.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(authenticate, requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN', 'LEADER_SUO'));

dashboardRoutes.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const [totalCadets, cadets, sessions, upcomingEvents, lowQ] = await Promise.all([
      prisma.cadet.count({ where: { isActive: true } }),
      prisma.cadet.findMany({ where: { isActive: true }, select: { department: true, attendancePct: true } }),
      prisma.attendanceSession.count(),
      prisma.eventCamp.findMany({ where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 5 }),
      prisma.cadet.count({ where: { isActive: true, attendancePct: { lt: env.LOW_ATTENDANCE_PCT } } }),
    ]);
    const deptMap = new Map<string, number>();
    let pctSum = 0;
    cadets.forEach((c) => {
      deptMap.set(c.department, (deptMap.get(c.department) ?? 0) + 1);
      pctSum += c.attendancePct;
    });
    res.json({
      totalCadets,
      totalSessions: sessions,
      deptWise: [...deptMap.entries()].map(([department, count]) => ({ department, count })),
      avgAttendancePct: cadets.length ? Math.round((pctSum / cadets.length) * 10) / 10 : 0,
      lowAttendanceCount: lowQ,
      upcomingEvents,
    });
  }),
);
