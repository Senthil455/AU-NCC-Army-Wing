/**
 * @ncc/shared — single source of truth for the NCC portal HTTP contract.
 *
 * Both deployables import from here so a role, enum or export column can never drift between
 * the Express API (`apps/backend`) and the Next.js client (`apps/frontend`). Keep this package
 * dependency-free (types + frozen constants only) so it stays importable from any runtime.
 *
 * Anything changed here is a contract change: update `docs/api.md` in the same commit.
 */

/* ------------------------------------------------------------------ roles */

export const ROLES = ['SUPER_ADMIN', 'OFFICER_ANO_CTO', 'LEADER_SUO', 'CADET'] as const;
export type Role = (typeof ROLES)[number];

/** Roles that may read full cadet PII and export the sensitive column set. */
export const OFFICER_ROLES = ['OFFICER_ANO_CTO', 'SUPER_ADMIN'] as const satisfies readonly Role[];
export type OfficerRole = (typeof OFFICER_ROLES)[number];

/** Roles allowed into the staff console: dashboard, cadet list, attendance marking. */
export const STAFF_ROLES = ['SUPER_ADMIN', 'OFFICER_ANO_CTO', 'LEADER_SUO'] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];

/** The role a self-service registration gets when no officer is doing the inviting. */
export const DEFAULT_ROLE: Role = 'CADET';

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function isOfficer(role: string | undefined | null): boolean {
  return !!role && (OFFICER_ROLES as readonly string[]).includes(role);
}

export function isStaff(role: string | undefined | null): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

/* ------------------------------------------------------------ domain enums */

export const CERTIFICATES = ['NONE', 'A', 'B', 'C'] as const;
export type Certificate = (typeof CERTIFICATES)[number];

export const ENROLLMENT_STATUSES = ['APPLIED', 'SHORTLISTED', 'SELECTED', 'ACTIVE', 'EXITED'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'ON_DUTY', 'LEAVE', 'MEDICAL'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Statuses counted as "attended" when computing a percentage. */
export const ATTENDED_STATUSES = ['PRESENT', 'ON_DUTY'] as const satisfies readonly AttendanceStatus[];

export const SESSION_TYPES = [
  'DRILL',
  'WEAPON_TRAINING',
  'MAP_READING',
  'PHYSICAL_TRAINING',
  'SOCIAL_SERVICE',
  'CLASS',
  'OTHER',
] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const ANNOUNCEMENT_PRIORITIES = ['URGENT', 'GENERAL'] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const EXPORT_FORMATS = ['xlsx', 'csv', 'pdf'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** Fallback used when `LOW_ATTENDANCE_PCT` is not configured on the server. */
export const DEFAULT_LOW_ATTENDANCE_PCT = 75;

export function isLowAttendance(pct: number, threshold: number = DEFAULT_LOW_ATTENDANCE_PCT): boolean {
  return pct < threshold;
}

/* --------------------------------------------------------- export contract */

/** Whitelist for `?columns=`; the API rejects anything outside this list. */
export const EXPORTABLE_COLUMNS = [
  'name',
  'regdNo',
  'nccRegimentalNo',
  'rank',
  'department',
  'year',
  'batch',
  'platoon',
  'bloodGroup',
  'phone',
  'email',
  'parentContact',
  'certificate',
  'attendancePct',
] as const;
export type ExportableColumn = (typeof EXPORTABLE_COLUMNS)[number];

/** Columns an officer must be to export at all (DPDP Act 2023 — restricted by design). */
export const SENSITIVE_COLUMNS = ['phone', 'parentContact', 'email'] as const satisfies readonly ExportableColumn[];
export type SensitiveColumn = (typeof SENSITIVE_COLUMNS)[number];

export const DEFAULT_EXPORT_COLUMNS = [
  'name',
  'regdNo',
  'rank',
  'department',
  'year',
  'certificate',
  'attendancePct',
] as const satisfies readonly ExportableColumn[];

/** Fields the API accepts in `?sort=`, so a bad query can never reach the ORM. */
export const SORTABLE_CADET_FIELDS = [
  'name',
  'regdNo',
  'nccRegimentalNo',
  'rank',
  'department',
  'year',
  'batch',
  'platoon',
  'certificate',
  'attendancePct',
  'createdAt',
  'updatedAt',
] as const;
export type SortableCadetField = (typeof SORTABLE_CADET_FIELDS)[number];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** PII stripped from a cadet payload before it reaches the given role. */
export const PII_FIELDS = ['phone', 'parentContact', 'address', 'email'] as const;
export type PiiField = (typeof PII_FIELDS)[number];

/** Columns a bulk-upload spreadsheet may set. Everything else in the sheet is ignored. */
export const BULK_UPLOAD_COLUMNS = [
  'name',
  'regdNo',
  'nccRegimentalNo',
  'rank',
  'department',
  'year',
  'batch',
  'platoon',
  'bloodGroup',
  'phone',
  'email',
  'parentContact',
  'address',
  'certificate',
  'enrollmentStatus',
] as const;

/** Columns a bulk-upload sheet must contain. */
export const BULK_UPLOAD_REQUIRED_COLUMNS = ['name', 'regdNo', 'department', 'year', 'batch'] as const;

/* ------------------------------------------------------------- HTTP shapes */

export interface ApiErrorBody {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  regdNo: string | null;
  role: Role;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: User;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** A cadet as the API returns it — PII keys are present only when the caller's role allows. */
export interface Cadet {
  id: string;
  userId?: string | null;
  name: string;
  regdNo: string;
  nccRegimentalNo?: string | null;
  rank: string;
  department: string;
  year: number;
  batch: string;
  platoon: string;
  bloodGroup?: string | null;
  phone?: string | null;
  email?: string | null;
  parentContact?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  certificate: Certificate;
  enrollmentStatus: EnrollmentStatus;
  attendancePct: number;
  consentGiven: boolean;
  consentAt?: string | null;
}

export interface CadetListQuery {
  search?: string;
  department?: string;
  year?: number;
  rank?: string;
  certificate?: Certificate;
  platoon?: string;
  batch?: string;
  page?: number;
  pageSize?: number;
  sort?: SortableCadetField;
  order?: SortDirection;
  columns?: string;
  includeSensitive?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  attachmentUrl?: string | null;
  publishedBy: string;
  isPublished: boolean;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  date: string;
  createdAt: string;
}

export interface EventCamp {
  id: string;
  title: string;
  description: string;
  type: string;
  startsAt: string;
  endsAt?: string | null;
  venue?: string | null;
}

export interface AttendanceSession {
  id: string;
  date: string;
  type: SessionType;
  platoon?: string | null;
  location?: string | null;
  createdBy: string;
  lockedAt?: string | null;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  cadetId: string;
  status: AttendanceStatus;
  markedBy: string;
  note?: string | null;
}

export interface AttendanceSessionDetail extends AttendanceSession {
  records: AttendanceRecord[];
}

export interface AttendanceReportRow {
  cadet: { id: string; name: string; regdNo: string; platoon: string; department: string };
  present: number;
  total: number;
  pct: number;
  lowAttendance: boolean;
}

export interface AttendanceReport {
  rows: AttendanceReportRow[];
  totalSessions: number;
}

export interface DashboardSummary {
  totalCadets: number;
  totalSessions: number;
  deptWise: { department: string; count: number }[];
  avgAttendancePct: number;
  lowAttendanceCount: number;
  upcomingEvents: EventCamp[];
}

export interface HealthResponse {
  ok: boolean;
  uptimeSeconds?: number;
  db?: 'up' | 'down';
}

export interface BulkUploadResult {
  inserted: number;
  errors: { row: number; message: string }[];
}

/** Job/queue-free offline marking payload kept in localStorage by the attendance page. */
export interface QueuedAttendanceMark {
  sessionId: string;
  payload: { records: { cadetId: string; status: AttendanceStatus }[]; markAllPresent?: boolean };
  at: number;
}

export const API_PREFIX = '/api';
