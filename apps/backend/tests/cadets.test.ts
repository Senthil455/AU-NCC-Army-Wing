import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { parseColumns, buildWhere } from '../src/modules/cadets/service.js';
import { bulkRowSchema, cadetFilterSchema } from '../src/modules/cadets/validators.js';
import { pagination, parseSort } from '../src/common/pagination.js';
import { neutralizeFormula, sendCsv } from '../src/utils/csv.js';
import { scopedPlatoon } from '../src/common/scope.js';
import { SORTABLE_CADET_FIELDS } from '@ncc/shared';

vi.mock('../src/config/db.js', async () => {
  const { createPrismaMock } = await import('./helpers/mockPrisma.js');
  return { prisma: createPrismaMock(), disconnectPrisma: vi.fn(), pingDatabase: vi.fn() };
});

describe('cadet export columns', () => {
  it('accepts the default whitelist', () => {
    expect(parseColumns('name,regdNo', undefined, 'OFFICER_ANO_CTO')).toEqual(['name', 'regdNo']);
  });

  it('rejects unknown columns instead of passing them to the query', () => {
    expect(() => parseColumns('name,aadhaar', undefined, 'OFFICER_ANO_CTO')).toThrow();
  });

  it('blocks sensitive columns below officer rank', () => {
    expect(() => parseColumns('name,phone', undefined, 'CADET')).toThrow();
    expect(() => parseColumns('name', 'true', 'LEADER_SUO')).toThrow();
    expect(parseColumns('name,phone', undefined, 'SUPER_ADMIN')).toEqual(['name', 'phone']);
  });

  it('falls back to the documented default column set', () => {
    expect(parseColumns(undefined, undefined, 'LEADER_SUO')).toContain('name');
  });
});

describe('?sort= is validated before it reaches Prisma', () => {
  it('falls back to `name` for a field outside the whitelist', () => {
    expect(parseSort({ sort: 'passwordHash' }, SORTABLE_CADET_FIELDS, 'name')).toEqual({ field: 'name', direction: 'asc' });
  });

  it('keeps an allowed field and direction', () => {
    expect(parseSort({ sort: 'attendancePct', order: 'desc' }, SORTABLE_CADET_FIELDS, 'name')).toEqual({
      field: 'attendancePct',
      direction: 'desc',
    });
  });

  it('clamps paging to sane bounds', () => {
    expect(pagination({ page: '0', pageSize: '9999' })).toEqual({ page: 1, pageSize: 200, skip: 0, take: 200 });
    expect(pagination({})).toMatchObject({ page: 1, pageSize: 20, skip: 0 });
  });
});

describe('platoon scoping', () => {
  it('always narrows a leader to their own platoon', () => {
    const scope = { unrestricted: false, platoon: 'Alpha' } as const;
    expect(scopedPlatoon(scope, undefined)).toBe('Alpha');
    expect(scopedPlatoon(scope, 'Alpha')).toBe('Alpha');
    expect(() => scopedPlatoon(scope, 'Bravo')).toThrow(/platoon Alpha/);
  });

  it('lets an officer ask for any platoon, or none', () => {
    const scope = { unrestricted: true } as const;
    expect(scopedPlatoon(scope, 'Bravo')).toBe('Bravo');
    expect(scopedPlatoon(scope, undefined)).toBeUndefined();
  });

  it('ignores a platoon the caller is not allowed to see', () => {
    expect(buildWhere({ platoon: 'Bravo' }, 'Alpha')).toMatchObject({ platoon: 'Alpha' });
  });

  it('rejects a platoon from the query string below officer rank (validator + scope)', () => {
    expect(cadetFilterSchema.parse({ platoon: 'Bravo' }).platoon).toBe('Bravo');
    expect(() => scopedPlatoon({ unrestricted: false, platoon: 'Alpha' }, 'Bravo')).toThrow();
  });
});

describe('bulk upload rows', () => {
  it('drops keys that are not on the template whitelist', () => {
    const parsed = bulkRowSchema.parse({
      name: 'Crafted Row',
      regdNo: '2024CS999',
      department: 'CSE',
      year: '1',
      batch: '2024-28',
      attendancePct: '100',
      isActive: 'false',
      userId: 'attacker',
    });
    expect(parsed).not.toHaveProperty('attendancePct');
    expect(parsed).not.toHaveProperty('isActive');
    expect(parsed).not.toHaveProperty('userId');
    expect(parsed.year).toBe(1);
  });

  it('reports a row missing a required column', () => {
    const parsed = bulkRowSchema.safeParse({ name: 'No Batch', regdNo: '2024CS998', department: 'CSE', year: '2' });
    expect(parsed.success).toBe(false);
  });
});

describe('CSV export', () => {
  it('neutralizes formula prefixes', () => {
    expect(neutralizeFormula('=1+1')).toBe("'=1+1");
    expect(neutralizeFormula('+SUM(A1:A9)')).toBe("'+SUM(A1:A9)");
    expect(neutralizeFormula('@import')).toBe("'@import");
    expect(neutralizeFormula('-2+3')).toBe("'-2+3");
    expect(neutralizeFormula('Arjun Kumar')).toBe('Arjun Kumar');
    expect(neutralizeFormula(null)).toBe('');
  });

  it('escapes formulas in the response body', () => {
    const captured: { body?: string; headers: Record<string, string> } = { headers: {} };
    const res = {
      setHeader: (key: string, value: string) => {
        captured.headers[key] = value;
      },
      send: (body: string) => {
        captured.body = body;
      },
    } as unknown as Response;

    sendCsv(res, 'cadets.csv', ['name'], [{ name: '=HYPERLINK("http://evil")' }]);

    expect(captured.body).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(captured.headers['Content-Type']).toContain('text/csv');
  });
});
