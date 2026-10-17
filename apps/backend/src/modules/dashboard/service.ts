import type { DashboardSummary } from '@ncc/shared';
import { env } from '../../config/env.js';
import { prisma } from '../../config/db.js';
import { staffScope, type Actor } from '../../common/scope.js';
import { upcomingEvents } from '../publicContent/service.js';

/**
 * Staff dashboard counters, scoped to the caller: a platoon leader sees their platoon, an
 * officer sees the whole wing. The previous query ignored the leader scope entirely.
 */
export async function summary(actor: Actor): Promise<DashboardSummary> {
  const scope = await staffScope(actor);
  const platoon = scope.platoon;
  const cadetWhere = { isActive: true, ...(platoon ? { platoon } : {}) };

  const [totalCadets, totalSessions, lowAttendanceCount, deptWise, avg, events] = await Promise.all([
    prisma.cadet.count({ where: cadetWhere }),
    prisma.attendanceSession.count({ where: platoon ? { OR: [{ platoon }, { platoon: null }] } : {} }),
    prisma.cadet.count({ where: { ...cadetWhere, attendancePct: { lt: env.LOW_ATTENDANCE_PCT } } }),
    prisma.cadet.groupBy({ by: ['department'], where: cadetWhere, _count: { _all: true } }),
    prisma.cadet.aggregate({ where: cadetWhere, _avg: { attendancePct: true } }),
    upcomingEvents(5),
  ]);

  return {
    totalCadets,
    totalSessions,
    deptWise: deptWise
      .map((row) => ({ department: row.department, count: row._count._all }))
      .sort((a, b) => b.count - a.count || a.department.localeCompare(b.department)),
    // Aggregated in Postgres — the old version pulled every cadet row into memory to average it.
    avgAttendancePct: Math.round((avg._avg.attendancePct ?? 0) * 10) / 10,
    lowAttendanceCount,
    upcomingEvents: events,
  };
}
