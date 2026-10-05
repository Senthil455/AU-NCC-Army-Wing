# Data model (Postgres via Prisma)

Single source of truth: `backend/prisma/schema.prisma`. Summary for the meeting discussion:

## User (login)
- `id` uuid, `name`, `email` unique, `regdNo` unique nullable (cadet login via regd no. or AU email — Q2 in plan), `passwordHash`, `role` (SUPER_ADMIN, OFFICER_ANO_CTO, LEADER_SUO, CADET), `isActive`, timestamps.
- `RefreshToken`: hashed rotating refresh tokens, `expiresAt`, `revokedAt`.

## Cadet (core portal record)
Academic: `regdNo` unique, `department`, `year` (1-4), `batch` (e.g. 2023-26), `rank` (CADET … SUO), `nccRegimentalNo` unique nullable.
Personal: `name`, `bloodGroup`, `phone`, `email`, `parentContact`, `address`, `photoUrl`.
NCC: `platoon` (e.g. Alpha/Bravo), `certificate` (NONE/A/B/C), `enrollmentStatus` (APPLIED/SHORTLISTED/SELECTED/ACTIVE/EXITED), `attendancePct` cached, `consentGiven + consentAt` (DPDP), `userId` link nullable, `isActive`.

Indexes: `(department, year)`, `(platoon)`, `search(name, regdNo)`.

## Attendance
- `AttendanceSession`: `date`, `type`, `platoon?`, `location?`, `createdBy`, `lockedAt?`.
- `AttendanceRecord`: unique `(sessionId, cadetId)`, `status` (PRESENT/ABSENT/ON_DUTY/LEAVE/MEDICAL), `markedBy`, `note?`.
- `%` computed as `PRESENT + ON_DUTY / total sessions` over window; cached to `Cadet.attendancePct` nightly (or on mark for MVP).

## Announcements / News / Events
- `Announcement`: `title, body, priority (URGENT/GENERAL), attachmentUrl?, publishedBy, isPublished`.
- `NewsItem`, `EventCamp`: public reads; officer writes. `EventCamp` doubles as Phase-2 camp base (add `selectionStatus`, `checklist` later without migration pain — JSON `meta` column reserved).

## AuditLog
`actorId?, action (e.g. cadets.export, attendance.override), entity, entityId?, meta JSON?, ip?`. Written fire-and-forget from services. Full-cadet download restricted to officer roles and always logged.

## Yearly rollover (hostel/year-specific concern from meeting)
- Never mutate history: on new academic year run `backend:rollover` (documented script slot) — increments `year`, sets exited batch `isActive=false`, keeps attendance records. Old platoon lists remain queryable via `batch` filter.

## What NOT to store
Aadhaar unless legally required. Photos need gallery consent flag before public display.
