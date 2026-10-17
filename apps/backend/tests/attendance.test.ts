import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listSessions,
  markAttendance,
  recomputeAttendancePercentages,
  report,
  createSession,
} from '../src/modules/attendance/service.js';
import { prisma } from '../src/config/db.js';
import type { PrismaMock } from './helpers/mockPrisma.js';

vi.mock('../src/config/db.js', async () => {
  const { createPrismaMock } = await import('./helpers/mockPrisma.js');
  return { prisma: createPrismaMock(), disconnectPrisma: vi.fn(), pingDatabase: vi.fn() };
});

const db = prisma as unknown as PrismaMock;

const officer = { sub: 'user-officer', role: 'OFFICER_ANO_CTO' as const };
const leader = { sub: 'user-leader', role: 'LEADER_SUO' as const };

/** A leader is scoped by the platoon of the cadet record linked to their login. */
function linkLeaderTo(platoon: string): void {
  db.cadet.findFirst.mockResolvedValue({ platoon });
}

function session(overrides: Partial<{ id: string; platoon: string | null; date: Date }> = {}) {
  return {
    id: overrides.id ?? 'session-1',
    date: overrides.date ?? new Date(),
    type: 'DRILL' as const,
    platoon: overrides.platoon === undefined ? 'Alpha' : overrides.platoon,
    location: 'Kottur ground',
    createdBy: 'user-officer',
    lockedAt: null,
    createdAt: new Date(),
  };
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000 + 3_600_000);

describe('attendance session listing', () => {
  beforeEach(() => {
    db.attendanceSession.findMany.mockResolvedValue([]);
  });

  it('includes wing-wide parades in a leader\'s list', async () => {
    linkLeaderTo('Alpha');
    await listSessions({}, leader);

    expect(db.attendanceSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ platoon: 'Alpha' }, { platoon: null }] } }),
    );
  });

  it('filters an officer by the requested platoon only', async () => {
    await listSessions({ platoon: 'Bravo' }, officer);
    expect(db.attendanceSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ platoon: 'Bravo' }] } }),
    );
  });

  it('treats the `to` date as inclusive of the whole day', async () => {
    await listSessions({ from: '2026-01-01', to: '2026-01-31' }, officer);
    const arg = db.attendanceSession.findMany.mock.calls[0][0] as { where: { date: { gte: Date; lt: Date } } };
    expect(arg.where.date.gte.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(arg.where.date.lt.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });
});

describe('creating a session', () => {
  beforeEach(() => {
    db.attendanceSession.create.mockImplementation(async (arg: { data: Record<string, unknown> }) => ({
      id: 'session-1',
      ...arg.data,
    }));
  });

  it('forces a leader onto their own platoon even when the body omits it', async () => {
    linkLeaderTo('Alpha');
    await createSession({ date: '2026-02-14', type: 'DRILL' } as never, leader);

    expect(db.attendanceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ platoon: 'Alpha' }) }),
    );
  });

  it('lets an officer open a wing-wide session', async () => {
    await createSession({ date: '2026-02-14', type: 'DRILL' } as never, officer);
    expect(db.attendanceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ platoon: null }) }),
    );
  });
});

describe('marking attendance', () => {
  beforeEach(() => {
    db.attendanceRecord.upsert.mockResolvedValue({});
    db.attendanceSession.count.mockResolvedValue(1);
    db.attendanceRecord.groupBy.mockResolvedValue([]);
    db.cadet.update.mockResolvedValue({});
  });

  it('refuses a leader trying to mark a wing-wide parade', async () => {
    linkLeaderTo('Alpha');
    db.attendanceSession.findUnique.mockResolvedValue(session({ platoon: null }));

    await expect(
      markAttendance('session-1', { records: [{ cadetId: 'c1', status: 'PRESENT' }] }, leader),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.attendanceRecord.upsert).not.toHaveBeenCalled();
  });

  it("refuses a leader marking another platoon's parade", async () => {
    linkLeaderTo('Alpha');
    db.attendanceSession.findUnique.mockResolvedValue(session({ platoon: 'Bravo' }));

    await expect(
      markAttendance('session-1', { records: [{ cadetId: 'c1', status: 'PRESENT' }] }, leader),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('locks a parade for a leader once ATTENDANCE_LOCK_HOURS have passed', async () => {
    linkLeaderTo('Alpha');
    db.attendanceSession.findUnique.mockResolvedValue(session({ platoon: 'Alpha', date: daysAgo(3) }));

    await expect(
      markAttendance('session-1', { records: [{ cadetId: 'c1', status: 'PRESENT' }] }, leader),
    ).rejects.toMatchObject({ status: 403, message: expect.stringContaining('locked') });
  });

  it('audits an officer amending a locked parade as an override', async () => {
    db.attendanceSession.findUnique.mockResolvedValue(session({ platoon: null, date: daysAgo(3) }));
    db.cadet.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);

    const result = await markAttendance(
      'session-1',
      { records: [{ cadetId: 'c1', status: 'PRESENT' }, { cadetId: 'c2', status: 'ABSENT' }] },
      officer,
    );

    expect(result).toEqual({ marked: 2, overrodeLock: true });
    expect(db.attendanceRecord.upsert).toHaveBeenCalledTimes(2);
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'attendance.override' }) }),
    );
  });

  it("rejects a cadet who is not on the session's roster", async () => {
    db.attendanceSession.findUnique.mockResolvedValue(session({ platoon: 'Alpha' }));
    db.cadet.findMany.mockResolvedValue([{ id: 'c1' }]);

    await expect(
      markAttendance('session-1', { records: [{ cadetId: 'c-outside', status: 'PRESENT' }] }, officer),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('roster') });
    expect(db.attendanceRecord.upsert).not.toHaveBeenCalled();
  });

  it('marks the whole roster present while keeping the explicit exceptions', async () => {
    db.attendanceSession.findUnique.mockResolvedValue(session({ platoon: 'Alpha' }));
    db.cadet.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);

    await markAttendance(
      'session-1',
      { markAllPresent: true, records: [{ cadetId: 'c2', status: 'LEAVE' }] },
      officer,
    );

    expect(db.attendanceRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_cadetId: { sessionId: 'session-1', cadetId: 'c1' } },
        create: expect.objectContaining({ status: 'PRESENT' }),
      }),
    );
    // The exception is written after the bulk pass, so the last write for c2 is LEAVE.
    expect(db.attendanceRecord.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ cadetId: 'c2', status: 'LEAVE' }) }),
    );
  });
});

describe('attendance percentage refresh', () => {
  it('aggregates in the database instead of querying once per cadet', async () => {
    db.attendanceSession.count.mockResolvedValue(4);
    db.attendanceRecord.groupBy.mockResolvedValue([{ cadetId: 'c1', _count: { _all: 3 } }]);
    db.cadet.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
    db.cadet.update.mockResolvedValue({});

    const result = await recomputeAttendancePercentages();

    // Regression: the old implementation ran two queries per cadet (2N + 1 round trips).
    expect(db.attendanceRecord.groupBy).toHaveBeenCalledTimes(1);
    expect(db.cadet.update).toHaveBeenCalledTimes(2);
    expect(db.cadet.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { attendancePct: 75 } });
    expect(db.cadet.update).toHaveBeenCalledWith({ where: { id: 'c2' }, data: { attendancePct: 0 } });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ updated: 2 });
  });

  it('reports 0% when no parade has been held yet', async () => {
    db.attendanceSession.count.mockResolvedValue(0);
    db.attendanceRecord.groupBy.mockResolvedValue([]);
    db.cadet.findMany.mockResolvedValue([{ id: 'c1' }]);
    db.cadet.update.mockResolvedValue({});

    await recomputeAttendancePercentages();
    expect(db.cadet.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { attendancePct: 0 } });
  });
});

describe('attendance report', () => {
  it('counts wing-wide parades for a platoon-scoped leader', async () => {
    linkLeaderTo('Alpha');
    db.attendanceSession.findMany.mockResolvedValue([{ id: 's1' }]);
    db.cadet.findMany.mockResolvedValue([
      { id: 'c1', name: 'Arjun Kumar', regdNo: '2023ME014', platoon: 'Alpha', department: 'MECH' },
    ]);
    db.attendanceRecord.groupBy
      .mockResolvedValueOnce([{ cadetId: 'c1', _count: { _all: 4 } }])
      .mockResolvedValueOnce([{ cadetId: 'c1', _count: { _all: 2 } }]);

    const result = await report({}, leader);

    expect(db.attendanceSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ platoon: 'Alpha' }, { platoon: null }] } }),
    );
    expect(result).toEqual({
      totalSessions: 1,
      rows: [
        {
          cadet: { id: 'c1', name: 'Arjun Kumar', regdNo: '2023ME014', platoon: 'Alpha', department: 'MECH' },
          present: 2,
          total: 4,
          pct: 50,
          lowAttendance: true,
        },
      ],
    });
  });
});
