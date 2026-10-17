import { describe, expect, it } from 'vitest';
import {
  ATTENDED_STATUSES,
  ATTENDANCE_STATUSES,
  BULK_UPLOAD_COLUMNS,
  BULK_UPLOAD_REQUIRED_COLUMNS,
  DEFAULT_EXPORT_COLUMNS,
  EXPORTABLE_COLUMNS,
  OFFICER_ROLES,
  ROLES,
  SENSITIVE_COLUMNS,
  SORTABLE_CADET_FIELDS,
  STAFF_ROLES,
  isLowAttendance,
  isOfficer,
  isRole,
  isStaff,
} from '../src/index.js';

describe('role contract', () => {
  it('keeps officer and staff roles inside the role union', () => {
    for (const role of [...OFFICER_ROLES, ...STAFF_ROLES]) expect(ROLES).toContain(role);
  });

  it('treats every officer as staff', () => {
    for (const role of OFFICER_ROLES) expect(isStaff(role)).toBe(true);
  });

  it('never mistakes a cadet or an unknown value for staff', () => {
    expect(isOfficer('CADET')).toBe(false);
    expect(isStaff('LEADER_SUO')).toBe(true);
    expect(isRole('SUPER_ADMIN')).toBe(true);
    expect(isRole('super_admin')).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe('export contract', () => {
  it('only exposes whitelisted default columns', () => {
    for (const column of DEFAULT_EXPORT_COLUMNS) expect(EXPORTABLE_COLUMNS).toContain(column);
  });

  it('only marks whitelisted columns as sensitive', () => {
    for (const column of SENSITIVE_COLUMNS) expect(EXPORTABLE_COLUMNS).toContain(column);
  });

  it('has no duplicated columns', () => {
    expect(new Set(EXPORTABLE_COLUMNS).size).toBe(EXPORTABLE_COLUMNS.length);
  });

  it('sorts only by exportable cadet fields', () => {
    for (const field of SORTABLE_CADET_FIELDS) {
      if (field === 'createdAt' || field === 'updatedAt') continue;
      expect(EXPORTABLE_COLUMNS).toContain(field);
    }
  });
});

describe('bulk-upload contract', () => {
  it('requires columns the importer understands', () => {
    for (const column of BULK_UPLOAD_REQUIRED_COLUMNS) expect(BULK_UPLOAD_COLUMNS).toContain(column);
  });
});

describe('attendance contract', () => {
  it('counts attended statuses that exist', () => {
    for (const status of ATTENDED_STATUSES) expect(ATTENDANCE_STATUSES).toContain(status);
  });

  it('flags anything under the threshold', () => {
    expect(isLowAttendance(74.9)).toBe(true);
    expect(isLowAttendance(75)).toBe(false);
    expect(isLowAttendance(76, 80)).toBe(true);
  });
});
