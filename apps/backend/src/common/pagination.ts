export function pagination(query: { page?: string; pageSize?: string }) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(query.pageSize ?? '20', 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
