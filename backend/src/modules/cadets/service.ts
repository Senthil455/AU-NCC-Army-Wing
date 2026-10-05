import ExcelJS from 'exceljs';
import { prisma } from '../../config/db.js';
import { badRequest, forbidden, notFound } from '../../common/errors.js';
import { pagination } from '../../common/pagination.js';
import { audit } from '../../common/audit.js';
import { EXPORTABLE_COLUMNS, SENSITIVE_COLUMNS } from './validators.js';

type Role = string;

function stripPII<T extends Record<string, unknown>>(row: T, role: Role): T {
  if (role === 'OFFICER_ANO_CTO' || role === 'SUPER_ADMIN') return row;
  if (role === 'LEADER_SUO') {
    const { parentContact, address, ...rest } = row as Record<string, unknown>;
    void parentContact; void address;
    return rest as T;
  }
  const { phone, parentContact, address, email, ...rest } = row as Record<string, unknown>;
  void phone; void parentContact; void address; void email;
  return rest as T;
}

export function buildWhere(f: Record<string, string | number | undefined>) {
  const where: Record<string, unknown> = { isActive: true };
  if (f.search) where.OR = [{ name: { contains: String(f.search), mode: 'insensitive' } }, { regdNo: { contains: String(f.search), mode: 'insensitive' } }];
  if (f.department) where.department = f.department;
  if (f.year) where.year = Number(f.year);
  if (f.rank) where.rank = f.rank;
  if (f.certificate) where.certificate = f.certificate;
  if (f.platoon) where.platoon = f.platoon;
  if (f.batch) where.batch = f.batch;
  return where;
}

export async function listCadets(query: Record<string, string | undefined>, role: Role, platoonScope?: string) {
  const { page, pageSize, skip, take } = pagination(query as { page?: string; pageSize?: string });
  const where = buildWhere(query as Record<string, string | undefined>);
  if (role === 'LEADER_SUO' && platoonScope) where.platoon = platoonScope;
  const sort = (query.sort as string) || 'name';
  const order = ((query.order as string) || 'asc') as 'asc' | 'desc';
  const [total, rows] = await Promise.all([
    prisma.cadet.count({ where: where as never }),
    prisma.cadet.findMany({ where: where as never, skip, take, orderBy: { [sort]: order } }),
  ]);
  return { data: rows.map((r) => stripPII(r as unknown as Record<string, unknown>, role)), total, page, pageSize };
}

export async function getCadet(id: string, role: Role) {
  const row = await prisma.cadet.findUnique({ where: { id } });
  if (!row || !row.isActive) throw notFound('Cadet not found');
  return stripPII(row as unknown as Record<string, unknown>, role);
}

export async function getOwnCadet(userId: string) {
  const row = await prisma.cadet.findFirst({ where: { userId, isActive: true } });
  if (!row) throw notFound('No cadet profile linked to this login');
  const { parentContact: _p, ...rest } = row;
  void _p;
  return rest;
}

export async function createCadet(data: Record<string, unknown>, actorId: string, ip?: string) {
  if (!data.consentGiven) throw badRequest('DPDP consent is required (consentGiven=true)');
  const row = await prisma.cadet.create({ data: data as never });
  audit('cadets.create', 'Cadet', { actorId, entityId: row.id, ip });
  return row;
}

export async function updateCadet(id: string, data: Record<string, unknown>, actorId: string, ip?: string) {
  const existing = await prisma.cadet.findUnique({ where: { id } });
  if (!existing) throw notFound('Cadet not found');
  const row = await prisma.cadet.update({ where: { id }, data: data as never });
  audit('cadets.update', 'Cadet', { actorId, entityId: id, meta: { changed: Object.keys(data) }, ip });
  return row;
}

export async function deactivateCadet(id: string, actorId: string, ip?: string) {
  const row = await prisma.cadet.update({ where: { id }, data: { isActive: false } });
  audit('cadets.deactivate', 'Cadet', { actorId, entityId: id, ip });
  return row;
}

export function parseColumns(param?: string, includeSensitive?: string, role: Role = ''): string[] {
  const cols = param ? param.split(',').map((s) => s.trim()).filter(Boolean) : ['name', 'regdNo', 'rank', 'department', 'year', 'certificate', 'attendancePct'];
  const unknown = cols.filter((c) => !(EXPORTABLE_COLUMNS as readonly string[]).includes(c));
  if (unknown.length) throw badRequest(`Unknown export columns: ${unknown.join(', ')}`);
  const wantsSensitive = cols.some((c) => (SENSITIVE_COLUMNS as readonly string[]).includes(c)) || includeSensitive === 'true';
  if (wantsSensitive && role !== 'OFFICER_ANO_CTO' && role !== 'SUPER_ADMIN') throw forbidden('Sensitive columns require officer role');
  return cols;
}

export async function exportRows(query: Record<string, string | undefined>, columns: string[]) {
  const where = buildWhere(query);
  const rows = await prisma.cadet.findMany({ where: where as never, orderBy: { name: 'asc' }, take: 5000 });
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const c of columns) out[c] = (r as unknown as Record<string, unknown>)[c] ?? '-';
    return out;
  });
}

export function auditExport(actorId: string, format: string, columns: string[], query: Record<string, unknown>, ip?: string) {
  audit('cadets.export', 'Cadet', { actorId, meta: { format, columns, filters: query }, ip });
}

export async function bulkUpload(buffer: Buffer, actorId: string, ip?: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);
  const ws = wb.worksheets[0];
  if (!ws) throw badRequest('Empty workbook');
  const header: string[] = [];
  ws.getRow(1).eachCell((c) => header.push(String(c.value).trim()));
  const required = ['name', 'regdNo', 'department', 'year', 'batch'];
  const missing = required.filter((r) => !header.includes(r));
  if (missing.length) throw badRequest(`Missing template columns: ${missing.join(', ')}`);
  let inserted = 0;
  const errors: { row: number; message: string }[] = [];
  for (let i = 2; i <= ws.rowCount; i++) {
    const obj: Record<string, unknown> = {};
    ws.getRow(i).eachCell((cell, col) => {
      obj[header[col - 1]] = cell.value;
    });
    if (!obj.name && !obj.regdNo) continue;
    try {
      if (!obj.consentGiven) { obj.consentGiven = true; }
      await prisma.cadet.upsert({
        where: { regdNo: String(obj.regdNo) },
        update: { ...obj, consentGiven: true, consentAt: new Date() } as never,
        create: { ...obj, year: Number(obj.year), consentGiven: true, consentAt: new Date() } as never,
      });
      inserted++;
    } catch (e) {
      errors.push({ row: i, message: e instanceof Error ? e.message : 'Insert failed' });
    }
  }
  audit('cadets.bulk-upload', 'Cadet', { actorId, meta: { inserted, errorCount: errors.length }, ip });
  return { inserted, errors };
}
