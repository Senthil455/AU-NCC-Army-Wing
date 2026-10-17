import type { Cadet as PrismaCadet, Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import {
  BULK_UPLOAD_COLUMNS,
  BULK_UPLOAD_REQUIRED_COLUMNS,
  DEFAULT_EXPORT_COLUMNS,
  EXPORTABLE_COLUMNS,
  SENSITIVE_COLUMNS,
  SORTABLE_CADET_FIELDS,
  isOfficer,
  type Cadet as CadetDto,
  type ExportableColumn,
  type Paginated,
  type Role,
} from '@ncc/shared';
import { env } from '../../config/env.js';
import { prisma } from '../../config/db.js';
import { audit } from '../../common/audit.js';
import { badRequest, forbidden, notFound } from '../../common/errors.js';
import { pagination, parseSort } from '../../common/pagination.js';
import { scopedPlatoon, staffScope, type Actor } from '../../common/scope.js';
import { cellText, loadWorkbook } from '../../utils/excel.js';
import { bulkRowSchema, type BulkRow, type CadetFilter, type CadetInput, type CadetUpdateInput } from './validators.js';

export interface ExportPayload {
  columns: ExportableColumn[];
  rows: Record<string, unknown>[];
  truncated: boolean;
}

/* ------------------------------------------------------------------ reads */

/**
 * What a role may see of a cadet row.
 * Officers get everything; leaders lose the two most sensitive contact fields; everyone else
 * (i.e. the cadet themselves, via `/cadets/me`) loses the whole personal contact block.
 */
function stripPII(row: PrismaCadet, role: Role): CadetDto {
  const dto = toDto(row);
  if (isOfficer(role)) return dto;

  if (role === 'LEADER_SUO') {
    const { parentContact: _parentContact, address: _address, ...rest } = dto;
    return rest;
  }

  const { phone: _phone, parentContact: _parentContact, address: _address, email: _email, ...rest } = dto;
  return rest;
}

/** Explicit mapping: keeps Prisma `Date` objects out of the wire contract. */
function toDto(row: PrismaCadet): CadetDto {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    regdNo: row.regdNo,
    nccRegimentalNo: row.nccRegimentalNo,
    rank: row.rank,
    department: row.department,
    year: row.year,
    batch: row.batch,
    platoon: row.platoon,
    bloodGroup: row.bloodGroup,
    phone: row.phone,
    email: row.email,
    parentContact: row.parentContact,
    address: row.address,
    photoUrl: row.photoUrl,
    certificate: row.certificate,
    enrollmentStatus: row.enrollmentStatus,
    attendancePct: row.attendancePct,
    consentGiven: row.consentGiven,
    consentAt: row.consentAt?.toISOString() ?? null,
  };
}

export function buildWhere(filter: CadetFilter, platoon?: string): Prisma.CadetWhereInput {
  const where: Prisma.CadetWhereInput = { isActive: true };

  if (filter.search) {
    where.OR = [
      { name: { contains: filter.search, mode: 'insensitive' } },
      { regdNo: { contains: filter.search, mode: 'insensitive' } },
      { nccRegimentalNo: { contains: filter.search, mode: 'insensitive' } },
    ];
  }
  if (filter.department) where.department = filter.department;
  if (filter.year) where.year = filter.year;
  if (filter.rank) where.rank = filter.rank;
  if (filter.certificate) where.certificate = filter.certificate;
  if (filter.batch) where.batch = filter.batch;

  // The caller's platoon scope always wins over a platoon from the query string.
  const effectivePlatoon = platoon ?? filter.platoon;
  if (effectivePlatoon) where.platoon = effectivePlatoon;

  return where;
}

export async function listCadets(filter: CadetFilter, actor: Actor): Promise<Paginated<CadetDto>> {
  const scope = await staffScope(actor);
  const platoon = scopedPlatoon(scope, filter.platoon);
  const where = buildWhere(filter, platoon);
  const { page, pageSize, skip, take } = pagination(filter);
  const { field, direction } = parseSort(filter, SORTABLE_CADET_FIELDS, 'name');

  const [total, rows] = await Promise.all([
    prisma.cadet.count({ where }),
    prisma.cadet.findMany({ where, skip, take, orderBy: { [field]: direction } as Prisma.CadetOrderByWithRelationInput }),
  ]);

  return { data: rows.map((row) => stripPII(row, actor.role)), total, page, pageSize };
}

export async function getCadet(id: string, actor: Actor): Promise<CadetDto> {
  const scope = await staffScope(actor);
  const row = await prisma.cadet.findUnique({ where: { id } });
  if (!row || !row.isActive) throw notFound('Cadet not found');
  if (!scope.unrestricted && row.platoon !== scope.platoon) {
    throw forbidden(`You can only view platoon ${scope.platoon ?? 'assigned to you'}`);
  }
  return stripPII(row, actor.role);
}

/**
 * A cadet's own record — full detail, including the personal contact fields that are stripped
 * from staff-facing lists. This is the DPDP "right to access" path.
 */
export async function getOwnCadet(userId: string): Promise<CadetDto> {
  const row = await prisma.cadet.findFirst({ where: { userId, isActive: true } });
  if (!row) throw notFound('No cadet profile is linked to this login');
  return toDto(row);
}

/* ----------------------------------------------------------------- writes */

async function assertLoginExists(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw badRequest('userId does not match a known login');
}

export async function createCadet(data: CadetInput, actor: Actor, ip?: string): Promise<CadetDto> {
  if (!data.consentGiven) throw badRequest('DPDP consent is required (consentGiven=true)');
  if (data.userId) await assertLoginExists(data.userId);

  const row = await prisma.cadet.create({ data: { ...data, consentAt: new Date() } });
  audit('cadets.create', 'Cadet', { actorId: actor.sub, actorRole: actor.role, entityId: row.id, ip });
  return toDto(row);
}

export async function updateCadet(id: string, data: CadetUpdateInput, actor: Actor, ip?: string): Promise<CadetDto> {
  const existing = await prisma.cadet.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Cadet not found');
  if (data.userId) await assertLoginExists(data.userId);

  const row = await prisma.cadet.update({
    where: { id },
    // Consent withdrawal keeps its original timestamp; (re)granting consent stamps it again.
    data: { ...data, ...(data.consentGiven === true ? { consentAt: new Date() } : {}) },
  });
  audit('cadets.update', 'Cadet', {
    actorId: actor.sub,
    actorRole: actor.role,
    entityId: id,
    meta: { changed: Object.keys(data) },
    ip,
  });
  return toDto(row);
}

export async function deactivateCadet(id: string, actor: Actor, ip?: string): Promise<CadetDto> {
  const existing = await prisma.cadet.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Cadet not found');

  const row = await prisma.cadet.update({ where: { id }, data: { isActive: false } });
  audit('cadets.deactivate', 'Cadet', { actorId: actor.sub, actorRole: actor.role, entityId: id, ip });
  return toDto(row);
}

/* ---------------------------------------------------------------- exports */

export function parseColumns(param: string | undefined, includeSensitive: string | undefined, role: Role): ExportableColumn[] {
  const requested = param
    ? param.split(',').map((column) => column.trim()).filter(Boolean)
    : [...DEFAULT_EXPORT_COLUMNS];

  const unknown = requested.filter((column) => !(EXPORTABLE_COLUMNS as readonly string[]).includes(column));
  if (unknown.length) throw badRequest(`Unknown export columns: ${unknown.join(', ')}`);

  const wantsSensitive =
    requested.some((column) => (SENSITIVE_COLUMNS as readonly string[]).includes(column)) || includeSensitive === 'true';
  if (wantsSensitive && !isOfficer(role)) throw forbidden('Sensitive columns require an officer role');

  return requested as ExportableColumn[];
}

export async function exportRows(filter: CadetFilter, columns: ExportableColumn[], actor: Actor): Promise<ExportPayload> {
  const scope = await staffScope(actor);
  const platoon = scopedPlatoon(scope, filter.platoon);
  const where = buildWhere(filter, platoon);

  // One extra row tells us whether the cap was hit — a silent truncation used to look complete.
  const rows = await prisma.cadet.findMany({
    where,
    orderBy: { name: 'asc' },
    take: env.EXPORT_MAX_ROWS + 1,
  });
  const truncated = rows.length > env.EXPORT_MAX_ROWS;
  const limited = truncated ? rows.slice(0, env.EXPORT_MAX_ROWS) : rows;

  const projected = limited.map((row) => {
    const record = row as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const column of columns) out[column] = record[column] ?? '-';
    return out;
  });

  return { columns, rows: projected, truncated };
}

export function auditExport(input: {
  actor: Actor;
  format: string;
  payload: ExportPayload;
  filter: CadetFilter;
  ip?: string;
}): void {
  const { actor, format, payload, filter, ip } = input;
  const { columns: _columns, includeSensitive: _includeSensitive, page: _page, pageSize: _pageSize, ...filters } = filter;
  audit('cadets.export', 'Cadet', {
    actorId: actor.sub,
    actorRole: actor.role,
    meta: {
      format,
      columns: payload.columns,
      rowCount: payload.rows.length,
      truncated: payload.truncated,
      filters,
    },
    ip,
  });
}

/* ---------------------------------------------------------------- imports */

export async function buildTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AU NCC Army Wing';
  const sheet = workbook.addWorksheet('Cadets');
  sheet.columns = BULK_UPLOAD_COLUMNS.map((column) => ({ header: column, key: column, width: 20 }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.addRow({
    name: 'Example Cadet',
    regdNo: '2024CS100',
    department: 'CSE',
    year: 1,
    batch: '2024-28',
    platoon: 'Alpha',
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export interface BulkUploadResult {
  inserted: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

/**
 * Bulk enrolment from the template.
 *
 * Only columns on the template whitelist are read — the previous version wrote every header in
 * the sheet straight into Prisma, so a crafted workbook could set `attendancePct`, `userId` or
 * `isActive`. Each row is now validated with zod and reported individually.
 */
export async function bulkUpload(buffer: Buffer, actor: Actor, ip?: string): Promise<BulkUploadResult> {
  const workbook = await loadWorkbook(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw badRequest('Workbook has no sheets');
  if (sheet.rowCount - 1 > env.BULK_UPLOAD_MAX_ROWS) {
    throw badRequest(`Spreadsheet has ${sheet.rowCount - 1} data rows — the limit is ${env.BULK_UPLOAD_MAX_ROWS}`);
  }

  const header: string[] = [];
  sheet.getRow(1).eachCell((cell) => header.push(cellText(cell.value)));
  const missing = BULK_UPLOAD_REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length) throw badRequest(`Missing template columns: ${missing.join(', ')}`);

  const allowed = new Set<string>(BULK_UPLOAD_COLUMNS);
  const errors: { row: number; message: string }[] = [];
  let inserted = 0;
  let skipped = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const raw: Record<string, string> = {};
    sheet.getRow(rowNumber).eachCell((cell, columnNumber) => {
      const key = header[columnNumber - 1];
      if (key && allowed.has(key)) raw[key] = cellText(cell.value);
    });

    if (!raw.name && !raw.regdNo) {
      skipped++;
      continue;
    }

    const parsed = bulkRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        row: rowNumber,
        message: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`).join('; '),
      });
      continue;
    }

    const row: BulkRow = parsed.data;
    try {
      await prisma.cadet.upsert({
        where: { regdNo: row.regdNo },
        update: { ...row, consentGiven: true, consentAt: new Date() },
        create: { ...row, consentGiven: true, consentAt: new Date() },
      });
      inserted++;
    } catch (error) {
      errors.push({ row: rowNumber, message: error instanceof Error ? error.message : 'Insert failed' });
    }
  }

  audit('cadets.bulk-upload', 'Cadet', {
    actorId: actor.sub,
    actorRole: actor.role,
    meta: { inserted, skipped, errorCount: errors.length },
    ip,
  });

  return { inserted, skipped, errors };
}
