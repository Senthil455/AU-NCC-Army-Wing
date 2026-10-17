import bcrypt from 'bcryptjs';
import { PrismaClient, type AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Passw0rd!';
const DEMO_ABSENT_REGD_NO = '2024EC032';

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(6, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

/**
 * Demo data for local development: three logins, a small roster, three parades and one
 * announcement so the dashboard, attendance report and exports all have something to show.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV=production');
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const officer = await prisma.user.upsert({
    where: { email: 'ano@annauniv.edu' },
    update: {},
    create: { name: 'ANO Officer', email: 'ano@annauniv.edu', passwordHash, role: 'OFFICER_ANO_CTO' },
  });

  const leader = await prisma.user.upsert({
    where: { email: 'suo@annauniv.edu' },
    update: {},
    create: { name: 'Senior Under Officer', email: 'suo@annauniv.edu', passwordHash, role: 'LEADER_SUO' },
  });

  const cadetUser = await prisma.user.upsert({
    where: { email: 'cadet@annauniv.edu' },
    update: {},
    create: { name: 'Demo Cadet', email: 'cadet@annauniv.edu', regdNo: '2023CS001', passwordHash, role: 'CADET' },
  });

  const roster = [
    { name: 'Demo Cadet', regdNo: '2023CS001', department: 'CSE', year: 2, batch: '2023-26', platoon: 'Alpha', certificate: 'NONE', userId: cadetUser.id },
    { name: 'Arjun Kumar', regdNo: '2023ME014', department: 'MECH', year: 2, batch: '2023-26', platoon: 'Bravo', certificate: 'A', userId: null },
    { name: 'Divya S', regdNo: DEMO_ABSENT_REGD_NO, department: 'ECE', year: 1, batch: '2024-28', platoon: 'Alpha', certificate: 'NONE', userId: null },
    // A LEADER_SUO is scoped to the platoon of the cadet record linked to their login.
    { name: 'Lakshmi SUO', regdNo: '2022EE007', department: 'EEE', year: 4, batch: '2022-26', platoon: 'Bravo', certificate: 'B', userId: leader.id },
  ];

  for (const row of roster) {
    const { certificate, ...rest } = row;
    await prisma.cadet.upsert({
      where: { regdNo: row.regdNo },
      update: { userId: row.userId },
      create: {
        ...rest,
        certificate: certificate as 'NONE' | 'A' | 'B' | 'C',
        rank: 'Cadet',
        phone: '9000000000',
        email: `${row.regdNo.toLowerCase()}@annauniv.edu`,
        consentGiven: true,
        consentAt: new Date(),
      },
    });
  }

  await prisma.announcement.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Saturday parade at 06:00 — Kottur ground',
      body: 'Full uniform. Carry ID card. Report 15 min early.',
      priority: 'URGENT',
      publishedBy: officer.id,
    },
  });

  await prisma.newsItem.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      title: 'Annual Training Camp nominations open',
      body: 'Submit your name to the ANO before the end of the month. B and C certificate holders are prioritised.',
      date: daysAgo(3),
    },
  });

  // Attendance is only seeded into an empty database, so re-running the seed is safe.
  if ((await prisma.attendanceSession.count()) === 0) {
    const cadets = await prisma.cadet.findMany({ select: { id: true, platoon: true, regdNo: true } });

    const parades = [
      { days: 21, type: 'DRILL', platoon: null, location: 'Kottur ground' },
      { days: 14, type: 'WEAPON_TRAINING', platoon: 'Alpha', location: 'Firing range' },
      { days: 7, type: 'PHYSICAL_TRAINING', platoon: null, location: 'Kottur ground' },
    ] as const;

    for (const parade of parades) {
      const session = await prisma.attendanceSession.create({
        data: {
          date: daysAgo(parade.days),
          type: parade.type,
          platoon: parade.platoon,
          location: parade.location,
          createdBy: officer.id,
        },
      });

      const roster = parade.platoon ? cadets.filter((cadet) => cadet.platoon === parade.platoon) : cadets;
      await prisma.attendanceRecord.createMany({
        data: roster.map((cadet) => ({
          sessionId: session.id,
          cadetId: cadet.id,
          // One cadet deliberately below the 75% threshold, so the flag has something to show.
          status: (cadet.regdNo === DEMO_ABSENT_REGD_NO ? 'ABSENT' : 'PRESENT') as AttendanceStatus,
          markedBy: officer.id,
        })),
      });
    }

    // Same formula the API uses on every mark: present+on-duty over sessions held.
    const totalSessions = await prisma.attendanceSession.count();
    const attended = await prisma.attendanceRecord.groupBy({
      by: ['cadetId'],
      where: { status: { in: ['PRESENT', 'ON_DUTY'] } },
      _count: { _all: true },
    });
    const attendedByCadet = new Map(attended.map((row) => [row.cadetId, row._count._all]));

    for (const cadet of cadets) {
      const present = attendedByCadet.get(cadet.id) ?? 0;
      await prisma.cadet.update({
        where: { id: cadet.id },
        data: { attendancePct: totalSessions ? Math.round((present / totalSessions) * 1000) / 10 : 0 },
      });
    }
  }

  console.log('Seeded demo data. Logins (dev only):');
  console.log(`  officer  ${officer.email} / ${DEMO_PASSWORD}`);
  console.log(`  leader   ${leader.email} / ${DEMO_PASSWORD}`);
  console.log(`  cadet    ${cadetUser.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
