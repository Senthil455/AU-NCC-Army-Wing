import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { badRequest, forbidden, notFound } from '../../common/errors.js';
import { audit } from '../../common/audit.js';

function isLocked(sessionDate: Date, isOfficer: boolean): boolean {
  if (isOfficer) return false;
  const hours = (Date.now() - new Date(sessionDate).getTime()) / 36e5;
  return hours > env.ATTENDANCE_LOCK_HOURS;
}

export async function createSession(data: { date: string; type: string; platoon?: string; location?: string }, actorId: string) {
  const session = await prisma.attendanceSession.create({
    data: { date: new Date(data.date), type: data.type as never, platoon: data.platoon, location: data.location, createdBy: actorId },
  });
  audit('attendance.session.create', 'AttendanceSession', { actorId, entityId: session.id });
  return session;
}

export async function listSessions(query: { from?: string; to?: string; platoon?: string }) {
  const where: Record<string, unknown> = {};
  if (query.from || query.to) {
    const date: Record<string, Date> = {};
    if (query.from) date.gte = new Date(query.from);
    if (query.to) date.lte = new Date(query.to);
    where.date = date;
  }
  if (query.platoon) where.platoon = query.platoon;
  return prisma.attendanceSession.findMany({ where: where as never, orderBy: { date: 'desc' }, take: 200 });
}

export async function getSession(id: string) {
  const session = await prisma.attendanceSession.findUnique({ where: { id }, include: { records: true } });
  if (!session) throw notFound('Session not found');
  return session;
}

export async function markAttendance(sessionId: string, input: { markAllPresent?: boolean; records: { cadetId: string; status: string; note?: string }[] }, actorId: string, role: string, ip?: string) {
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw notFound('Session not found');
  const isOfficer = role === 'OFFICER_ANO_CTO' || role === 'SUPER_ADMIN';
  if (isLocked(session.date, isOfficer)) throw forbidden(`Session locked after ${env.ATTENDANCE_LOCK_HOURS}h — officer override required`);

  let records = input.records;
  if (input.markAllPresent) {
    const cadets = await prisma.cadet.findMany({ where: { isActive: true, ...(session.platoon ? { platoon: session.platoon } : {}) }, select: { id: true } });
    const absents = new Map(input.records.map((r) => [r.cadetId, r]));
    records = cadets.map((c) => absents.get(c.id) ?? { cadetId: c.id, status: 'PRESENT' as const });
  }
  if (!records.length) throw badRequest('No records to mark');

  await prisma.$transaction(
    records.map((r) =>
      prisma.attendanceRecord.upsert({
        where: { sessionId_cadetId: { sessionId, cadetId: r.cadetId } },
        update: { status: r.status as never, markedBy: actorId, note: r.note },
        create: { sessionId, cadetId: r.cadetId, status: r.status as never, markedBy: actorId, note: r.note },
      }),
    ),
  );

  if (isLocked(session.date, false)) audit('attendance.override', 'AttendanceSession', { actorId, entityId: sessionId, meta: { count: records.length }, ip });

  await refreshPercentages();
  return { marked: records.length };
}

async function refreshPercentages() {
  const cadets = await prisma.cadet.findMany({ where: { isActive: true }, select: { id: true } });
  const total = await prisma.attendanceSession.count();
  if (!total) return;
  for (const c of cadets) {
    const present = await prisma.attendanceRecord.count({ where: { cadetId: c.id, status: { in: ['PRESENT', 'ON_DUTY'] } } });
    await prisma.cadet.update({ where: { id: c.id }, data: { attendancePct: Math.round((present / total) * 1000) / 10 } });
  }
}

export async function report(query: { from?: string; to?: string; platoon?: string; cadetId?: string }) {
  const sessions = await prisma.attendanceSession.findMany({
    where: {
      ...(query.from || query.to ? { date: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}),
      ...(query.platoon ? { platoon: query.platoon } : {}),
    } as never,
    select: { id: true },
  });
  const ids = sessions.map((s) => s.id);
  const cadets = await prisma.cadet.findMany({
    where: { isActive: true, ...(query.platoon ? { platoon: query.platoon } : {}), ...(query.cadetId ? { id: query.cadetId } : {}) } as never,
  });
  const rows = await Promise.all(
    cadets.map(async (c) => {
      const total = ids.length ? await prisma.attendanceRecord.count({ where: { sessionId: { in: ids }, cadetId: c.id } }) : 0;
      const present = ids.length ? await prisma.attendanceRecord.count({ where: { sessionId: { in: ids }, cadetId: c.id, status: { in: ['PRESENT', 'ON_DUTY'] } } }) : 0;
      const pct = total ? Math.round((present / total) * 1000) / 10 : 0;
      return { cadet: { id: c.id, name: c.name, regdNo: c.regdNo, platoon: c.platoon, department: c.department }, present, total, pct, lowAttendance: pct < env.LOW_ATTENDANCE_PCT };
    }),
  );
  return { rows, totalSessions: ids.length };
}
