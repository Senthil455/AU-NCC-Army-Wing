import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import { signAccess } from '../src/utils/jwt.js';
import { prisma } from '../src/config/db.js';
import type { PrismaMock } from './helpers/mockPrisma.js';
import type { Role } from '@ncc/shared';

vi.mock('../src/config/db.js', async () => {
  const { createPrismaMock } = await import('./helpers/mockPrisma.js');
  return {
    prisma: createPrismaMock(),
    disconnectPrisma: vi.fn(),
    // Readiness probe is healthy unless a test says otherwise.
    pingDatabase: vi.fn(async () => true),
  };
});

const db = prisma as unknown as PrismaMock;
const app = buildApp();

const token = (role: Role, sub = 'user-1') => signAccess({ sub, role, email: 'cadet@annauniv.edu' });
const auth = (role: Role) => ({ Authorization: `Bearer ${token(role)}` });

describe('API surface', () => {
  it('answers the liveness probe without a token', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it('reports database readiness in the readiness probe', async () => {
    const res = await request(app).get('/api/health/ready').expect(200);
    expect(res.body).toEqual({ ok: true, db: 'up' });
  });

  it('returns a JSON 404 for an unknown route', async () => {
    const res = await request(app).get('/api/does-not-exist').expect(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects a request with no token', async () => {
    await request(app).get('/api/cadets').expect(401);
  });
});

describe('role gating', () => {
  it('stops a cadet from reading the wing roster or any attendance report', async () => {
    // Regression: these three endpoints were reachable with any valid token.
    await request(app).get('/api/cadets').set(auth('CADET')).expect(403);
    await request(app).get('/api/attendance/sessions').set(auth('CADET')).expect(403);
    await request(app).get('/api/attendance/report').set(auth('CADET')).expect(403);
    await request(app).get('/api/attendance/report.xlsx').set(auth('CADET')).expect(403);
    await request(app).get('/api/dashboard/summary').set(auth('CADET')).expect(403);
  });

  it('stops a leader from creating cadet records or reading a template', async () => {
    await request(app).post('/api/cadets').set(auth('LEADER_SUO')).send({ name: 'X' }).expect(403);
    await request(app).post('/api/cadets/bulk-upload').set(auth('LEADER_SUO')).expect(403);
  });

  it('serves the staff cadet list to an officer, honouring paging defaults', async () => {
    db.cadet.count.mockResolvedValue(0);
    db.cadet.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/cadets').set(auth('OFFICER_ANO_CTO')).expect(200);
    expect(res.body).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
  });

  it('rejects an unknown sort field with a 400 instead of a 500 from the ORM', async () => {
    const res = await request(app).get('/api/cadets?sort=nonsense').set(auth('OFFICER_ANO_CTO')).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('public content', () => {
  it('serves news and events to anonymous visitors', async () => {
    db.newsItem.findMany.mockResolvedValue([]);
    db.eventCamp.findMany.mockResolvedValue([]);

    await request(app).get('/api/news').expect(200);
    await request(app).get('/api/events').expect(200);
  });

  it('does not let a cadet publish news', async () => {
    await request(app).post('/api/news').set(auth('CADET')).send({ title: 'Fake', body: 'x' }).expect(403);
  });
});
