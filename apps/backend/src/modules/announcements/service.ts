import { prisma } from '../../config/db.js';
import { audit } from '../../common/audit.js';
import { notFound } from '../../common/errors.js';
import type { Actor } from '../../common/scope.js';
import type { AnnouncementFilter, AnnouncementInput } from './validators.js';

export async function list(filter: AnnouncementFilter) {
  return prisma.announcement.findMany({
    where: { isPublished: true, ...(filter.priority ? { priority: filter.priority } : {}) },
    // Postgres orders enums by declaration, so URGENT surfaces above GENERAL.
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    take: filter.limit ?? 100,
  });
}

export async function create(input: AnnouncementInput, actor: Actor, ip?: string) {
  const row = await prisma.announcement.create({ data: { ...input, publishedBy: actor.sub } });
  audit('announcements.create', 'Announcement', {
    actorId: actor.sub,
    actorRole: actor.role,
    entityId: row.id,
    meta: { priority: row.priority },
    ip,
  });
  return row;
}

export async function update(id: string, input: Partial<AnnouncementInput>, actor: Actor, ip?: string) {
  const existing = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Announcement not found');

  const row = await prisma.announcement.update({ where: { id }, data: input });
  audit('announcements.update', 'Announcement', {
    actorId: actor.sub,
    actorRole: actor.role,
    entityId: id,
    meta: { changed: Object.keys(input) },
    ip,
  });
  return row;
}

/** Soft delete — the board keeps its history for the audit trail. */
export async function remove(id: string, actor: Actor, ip?: string) {
  const existing = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Announcement not found');

  await prisma.announcement.update({ where: { id }, data: { isPublished: false } });
  audit('announcements.unpublish', 'Announcement', { actorId: actor.sub, actorRole: actor.role, entityId: id, ip });
  return { ok: true };
}
