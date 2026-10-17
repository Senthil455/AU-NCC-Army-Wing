import { SORT_DIRECTIONS, type SortDirection } from '@ncc/shared';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 200;

export interface PageQuery {
  page?: string | number;
  pageSize?: string | number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function pagination(query: PageQuery): Pagination {
  const page = Math.max(1, toInt(query.page, 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, toInt(query.pageSize, DEFAULT_PAGE_SIZE)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * Resolve `?sort=`/`?order=` against a whitelist.
 *
 * The raw query string used to be spread straight into Prisma's `orderBy`, so `?sort=<bogus>`
 * produced a 500 from the ORM. Unknown values now fall back instead of reaching the database.
 */
export function parseSort<const T extends readonly string[]>(
  query: { sort?: string; order?: string },
  allowed: T,
  fallback: T[number],
): { field: T[number]; direction: SortDirection } {
  const field =
    typeof query.sort === 'string' && (allowed as readonly string[]).includes(query.sort)
      ? (query.sort as T[number])
      : fallback;
  const direction: SortDirection =
    typeof query.order === 'string' && (SORT_DIRECTIONS as readonly string[]).includes(query.order)
      ? (query.order as SortDirection)
      : 'asc';
  return { field, direction };
}

function toInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}
