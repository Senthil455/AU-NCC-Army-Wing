import type { EventCamp as PrismaEventCamp, NewsItem as PrismaNewsItem } from '@prisma/client';
import type { EventCamp, NewsItem } from '@ncc/shared';
import { prisma } from '../../config/db.js';
import { audit } from '../../common/audit.js';
import type { Actor } from '../../common/scope.js';
import type { EventInput, NewsInput } from './validators.js';

/** Explicit mappers keep `Date` out of the JSON contract (regression test: docs/api.md). */
export function toNewsDto(row: PrismaNewsItem): NewsItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    date: row.date.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toEventDto(row: PrismaEventCamp): EventCamp {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    venue: row.venue,
  };
}

/* Public reads — no authentication, so only already-published content is ever returned. */

export async function listNews(limit = 50): Promise<NewsItem[]> {
  const rows = await prisma.newsItem.findMany({ orderBy: { date: 'desc' }, take: limit });
  return rows.map(toNewsDto);
}

export async function listEvents(limit = 50): Promise<EventCamp[]> {
  const rows = await prisma.eventCamp.findMany({ orderBy: { startsAt: 'asc' }, take: limit });
  return rows.map(toEventDto);
}

export async function upcomingEvents(limit = 5): Promise<EventCamp[]> {
  const rows = await prisma.eventCamp.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: 'asc' },
    take: limit,
  });
  return rows.map(toEventDto);
}

export async function createNews(input: NewsInput, actor: Actor, ip?: string): Promise<NewsItem> {
  const row = await prisma.newsItem.create({ data: { title: input.title, body: input.body, date: new Date() } });
  audit('news.create', 'NewsItem', { actorId: actor.sub, actorRole: actor.role, entityId: row.id, ip });
  return toNewsDto(row);
}

export async function createEvent(input: EventInput, actor: Actor, ip?: string): Promise<EventCamp> {
  const row = await prisma.eventCamp.create({
    data: {
      title: input.title,
      description: input.description,
      type: input.type,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      venue: input.venue ?? null,
    },
  });
  audit('events.create', 'EventCamp', { actorId: actor.sub, actorRole: actor.role, entityId: row.id, ip });
  return toEventDto(row);
}
