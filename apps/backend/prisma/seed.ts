import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Passw0rd!', 12);

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

  const sample = [
    { name: 'Demo Cadet', regdNo: '2023CS001', department: 'CSE', year: 2, batch: '2023-26', platoon: 'Alpha', certificate: 'NONE' as const },
    { name: 'Arjun Kumar', regdNo: '2023ME014', department: 'MECH', year: 2, batch: '2023-26', platoon: 'Bravo', certificate: 'A' as const },
    { name: 'Divya S', regdNo: '2024EC032', department: 'ECE', year: 1, batch: '2024-28', platoon: 'Alpha', certificate: 'NONE' as const },
  ];

  for (const c of sample) {
    await prisma.cadet.upsert({
      where: { regdNo: c.regdNo },
      update: {},
      create: {
        ...c,
        rank: 'Cadet',
        phone: '9000000000',
        email: `${c.regdNo.toLowerCase()}@annauniv.edu`,
        consentGiven: true,
        consentAt: new Date(),
        userId: c.regdNo === '2023CS001' ? cadetUser.id : undefined,
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

  console.log('Seeded:', { officer: officer.email, leader: leader.email, cadet: cadetUser.email });
}

main().finally(() => prisma.$disconnect());
