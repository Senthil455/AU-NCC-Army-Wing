import type { Prisma } from '@prisma/client';
import { ATTENDED_STATUSES, isOfficer, type AttendanceReportRow, type AttendanceStatus } from '@ncc/shared';
import { env } from '../../config/env.js';
import { prisma } from '../../config/db.js';
import { audit } from '../../common/audit.js';
import { badRequest, forbidden, notFound } from '../../common/errors.js';
import { scopedPlatoon, staffScope, type Actor } from '../../common/scope.js';
import type { MarkInput, ReportFilter, SessionFilter, SessionInput } from './validators.js';

const ATTENDED: AttendanceStatus[] = [...ATTENDED_STATUSES];

/* ----------------------------------------------------------------- helpers */

/** Marking stays editable for `ATTENDANCE_LOCK_HOURS` after the parade, officers excepted. */
function isPastLock(sessionDate: Date): boolean {
  return (Date.now() - sessionDate.getTime()) / 3_600_000 > env.ATTENDANCE_LOCK_HOURS;
}

/** Inclusive day range: `to` covers the whole day rather than midnight. */
function dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const range: Prisma.DateTimeFilter = {};
  if (from) range.gte = new Date(from);
  if (to) range.lt = new Date(new Date(to).getTime() + 86_400_000);
  return range;
}

/* ---------------------------------------------------------------- sessions */

export async function createSession(input: SessionInput, actor: Actor, ip?: string) {
  const scope = await staffScope(actor);
  // A leader can only ever open a session for their own platoon; an officer may open a wing-wide one.
  const platoon = scopedPlatoon(scope, input.platoon) ?? null;

  const session = await prisma.attendanceSession.create({
    data: {
      date: new Date(input.date),
      type: input.type,
      platoon,
      location: input.location,
      createdBy: actor.sub,
    },
  });

  audit('attendance.session.create', 'AttendanceSession', {
    actorId: actor.sub,
    actorRole: actor.role,
    entityId: session.id,
    meta: { platoon: session.platoon, type: session.type },
    ip,
  });
  return session;
}

export async function listSessions(filter: SessionFilter, actor: Actor) {
  const scope = await staffScope(actor);
  const platoon = scopedPlatoon(scope, filter.platoon);

  const where: Prisma.AttendanceSessionWhereInput = {};
  const range = dateRange(filter.from, filter.to);
  if (range) where.date = range;
  if (filter.type) where.type = filter.type;
  if (platoon) {
    // A platoon-scoped leader needs the wing-wide sessions too, otherwise their report is short.
    where.OR = scope.unrestricted ? [{ platoon }] : [{ platoon }, { platoon: null }];
  }

  return prisma.attendanceSession.findMany({
    where,
    orderBy: { date: 'desc' },
    take: filter.limit ?? 200,
  });
}

export async function getSession(id: string, actor: Actor) {
  const scope = await staffScope(actor);
  const session = await prisma.attendanceSession.findUnique({ where: { id }, include: { records: true } });
  if (!session) throw notFound('Session not found');
  if (scope.unrestricted) return session;

  if (session.platoon && session.platoon !== scope.platoon) {
    throw forbidden(`You can only open platoon ${scope.platoon}`);
  }

  // Wing-wide session: a leader sees the roster of their own platoon only.
  const roster = await prisma.cadet.findMany({
    where: { platoon: scope.platoon, isActive: true },
    select: { id: true },
  });
  const allowed = new Set(roster.map((cadet) => cadet.id));
  return { ...session, records: session.records.filter((record) => allowed.has(record.cadetId)) };
}

export async function markAttendance(sessionId: string, input: MarkInput, actor: Actor, ip?: string) {
  const scope = await staffScope(actor);
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw notFound('Session not found');

  if (!scope.unrestricted) {
    if (session.platoon && session.platoon !== scope.platoon) {
      throw forbidden(`You can only mark platoon ${scope.platoon}`);
    }
    if (!session.platoon) throw forbidden('This session covers the whole wing — only an officer can mark it');
  }

  const pastLock = isPastLock(session.date);
  if (pastLock && !isOfficer(actor.role)) {
    throw forbidden(`Session locked ${env.ATTENDANCE_LOCK_HOURS}h after the parade — an officer can still amend it`);
  }

  // Whoever the session covers is the roster; a stray cadetId must not create a cross-platoon record.
  const roster = await prisma.cadet.findMany({
    where: { isActive: true, ...(session.platoon ? { platoon: session.platoon } : {}) },
    select: { id: true },
  });
  const rosterIds = new Set(roster.map((cadet) => cadet.id));

  const records: { cadetId: string; status: AttendanceStatus; note?: string }[] = input.markAllPresent
    ? (() => {
        const overrides = new Map(input.records.map((record) => [record.cadetId, record]));
        return roster.map((cadet) => overrides.get(cadet.id) ?? { cadetId: cadet.id, status: 'PRESENT' as const });
      })()
    : input.records;

  const outside = records.filter((record) => !rosterIds.has(record.cadetId)).map((record) => record.cadetId);
  if (outside.length) {
    throw badRequest(`${outside.length} cadet(s) are not on this session's roster, e.g. ${outside.slice(0, 3).join(', ')}`);
  }

  await prisma.$transaction(
    records.map((record) =>
      prisma.attendanceRecord.upsert({
        where: { sessionId_cadetId: { sessionId, cadetId: record.cadetId } },
        update: { status: record.status, markedBy: actor.sub, note: record.note ?? null },
        create: { sessionId, cadetId: record.cadetId, status: record.status, markedBy: actor.sub, note: record.note ?? null },
      }),
    ),
  );

  await recomputeAttendancePercentages();

  // Only an officer can reach a locked session, so this is the audited override path.
  const overrodeLock = pastLock && isOfficer(actor.role);
  audit(overrodeLock ? 'attendance.override' : 'attendance.mark', 'AttendanceSession', {
    actorId: actor.sub,
    actorRole: actor.role,
    entityId: sessionId,
    meta: { count: records.length, overrodeLock },
    ip,
  });

  return { marked: records.length, overrodeLock };
}

/**
 * Recompute the cached `Cadet.attendancePct` for the whole wing.
 *
 * The previous implementation issued two queries *per cadet* (`2N+1` round trips, sequentially)
 * on every marking request. This does two aggregates plus one batched transaction.
 */
export async function recomputeAttendancePercentages(): Promise<{ updated: number }> {
  const [totalSessions, attended] = await Promise.all([
    prisma.attendanceSession.count(),
    prisma.attendanceRecord.groupBy({
      by: ['cadetId'],
      where: { status: { in: ATTENDED } },
      _count: { _all: true },
    }),
  ]);

  const attendedByCadet = new Map(attended.map((row) => [row.cadetId, row._count._all]));
  const cadets = await prisma.cadet.findMany({ where: { isActive: true }, select: { id: true } });

  const updates = cadets.map((cadet) => {
    const present = attendedByCadet.get(cadet.id) ?? 0;
    const pct = totalSessions ? Math.round((present / totalSessions) * 1000) / 10 : 0;
    return prisma.cadet.update({ where: { id: cadet.id }, data: { attendancePct: pct } });
  });
  if (updates.length) await prisma.$transaction(updates);

  return { updated: updates.length };
}

/* ------------------------------------------------------------------ report */

export async function report(filter: ReportFilter, actor: Actor): Promise<{ rows: AttendanceReportRow[]; totalSessions: number }> {
  const scope = await staffScope(actor);
  const platoon = scopedPlatoon(scope, filter.platoon);

  const sessionWhere: Prisma.AttendanceSessionWhereInput = {};
  const range = dateRange(filter.from, filter.to);
  if (range) sessionWhere.date = range;
  if (platoon) sessionWhere.OR = [{ platoon }, { platoon: null }];

  const sessions = await prisma.attendanceSession.findMany({ where: sessionWhere, select: { id: true } });
  const sessionIds = sessions.map((session) => session.id);

  const cadets = await prisma.cadet.findMany({
    where: { isActive: true, ...(platoon ? { platoon } : {}), ...(filter.cadetId ? { id: filter.cadetId } : {}) },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, regdNo: true, platoon: true, department: true },
  });
  const cadetIds = cadets.map((cadet) => cadet.id);

  const [totals, presents] = await Promise.all([
    prisma.attendanceRecord.groupBy({
      by: ['cadetId'],
      where: { sessionId: { in: sessionIds }, cadetId: { in: cadetIds } },
      _count: { _all: true },
    }),
    prisma.attendanceRecord.groupBy({
      by: ['cadetId'],
      where: { sessionId: { in: sessionIds }, cadetId: { in: cadetIds }, status: { in: ATTENDED } },
      _count: { _all: true },
    }),
  ]);

  const totalByCadet = new Map(totals.map((row) => [row.cadetId, row._count._all]));
  const presentByCadet = new Map(presents.map((row) => [row.cadetId, row._count._all]));

  const rows: AttendanceReportRow[] = cadets.map((cadet) => {
    const total = totalByCadet.get(cadet.id) ?? 0;
    const present = presentByCadet.get(cadet.id) ?? 0;
    const pct = total ? Math.round((present / total) * 1000) / 10 : 0;
    return {
      cadet: { id: cadet.id, name: cadet.name, regdNo: cadet.regdNo, platoon: cadet.platoon, department: cadet.department },
      present,
      total,
      pct,
      lowAttendance: pct < env.LOW_ATTENDANCE_PCT,
    };
  });

  return { rows, totalSessions: sessionIds.length };
}
