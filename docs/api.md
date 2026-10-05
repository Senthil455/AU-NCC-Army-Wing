# API contract — v1 (MVP)

Base: `${NEXT_PUBLIC_API_URL}` → `http://localhost:4000/api`. JSON unless noted. Auth: `Authorization: Bearer <accessToken>`.

## Auth

- `POST /auth/register` (officer-only bootstrap, or open in dev) `{ name, email, password, role, regdNo? }` → `{ user, accessToken, refreshToken }`
- `POST /auth/login` `{ emailOrRegdNo, password }` → `{ user, accessToken, refreshToken }`
- `POST /auth/refresh` `{ refreshToken }` → `{ accessToken, refreshToken }` (rotation)
- `POST /auth/logout` `{ refreshToken }` → `{ ok: true }`
- `GET /auth/me` (auth) → `{ user }`

Roles: `SUPER_ADMIN | OFFICER_ANO_CTO | LEADER_SUO | CADET`.

## Cadets

- `GET /cadets?search=&department=&year=&rank=&certificate=&platoon=&batch=&page=&pageSize=&sort=&order=` → `{ data[], total, page, pageSize }`. PII (phone/address/parentContact) included only for officer/leader roles; cadet role must use `/cadets/me`.
- `GET /cadets/me` (cadet) → own record.
- `GET /cadets/:id` (officer/leader; leader platoon-scoped).
- `POST /cadets` (officer) — zod-validated body.
- `PATCH /cadets/:id` (officer; key changes audited).
- `DELETE /cadets/:id` (super admin; soft-deactivate).
- `GET /cadets/template` → `.xlsx` blank template for bulk enrolment.
- `POST /cadets/bulk-upload` (officer, multipart `file`) → `{ inserted, errors: [{row, message}] }`.
- `GET /cadets/export.xlsx?columns=name,regdNo,phone&...filters` (officer/leader) → Excel. `columns` whitelisted; unknown → 400. Audited.
- `GET /cadets/export.csv?...` → CSV. `GET /cadets/export.pdf?...` → print-ready PDF.

Exportable columns: `name regdNo nccRegimentalNo rank department year batch platoon bloodGroup phone email parentContact certificate attendancePct`. Default set excludes `parentContact,address` unless `?includeSensitive=true` (officer only).

## Attendance

- `POST /attendance/sessions` (officer/leader) `{ date, type, platoon?, location? }` → session.
- `GET /attendance/sessions?from=&to=&platoon=` → list.
- `POST /attendance/sessions/:id/mark` (officer/leader) `{ records: [{ cadetId, status, note? }], markAllPresent?: boolean }`. Statuses: `PRESENT|ABSENT|ON_DUTY|LEAVE|MEDICAL`.
- `GET /attendance/sessions/:id` → session + records.
- `GET /attendance/report?from=&to=&platoon=&cadetId=` → `{ rows: [{ cadet, present, total, pct, lowAttendance }] }`. `pct` auto-calc; `lowAttendance = pct < 75`.
- `GET /attendance/report.xlsx?from=&to=...` → Excel. `.../report.pdf` → PDF.
- Edit lock: marking blocked 24h after session `date` unless officer (audited override).

Session types: `DRILL|WEAPON_TRAINING|MAP_READING|PHYSICAL_TRAINING|SOCIAL_SERVICE|CLASS|OTHER`.

## Announcements

- `GET /announcements?priority=&limit=` (public-auth; published only for cadets) → list.
- `POST /announcements` (officer/leader) `{ title, body, priority, attachmentUrl? }`.
- `PATCH /announcements/:id`, `DELETE /announcements/:id` (officer or author).

## Dashboard / public content

- `GET /dashboard/summary` (officer) → `{ totalCadets, deptWise[{department,count}], avgAttendancePct, upcomingEvents[], lowAttendanceCount }`.
- `GET /news` (public), `POST /news` (officer). `GET /events` (public), `POST /events` (officer). Same shape: `{ id, title, body/description, date, venue? }`.
- `GET /health` → `{ ok: true }`.

## Errors

`{ error: { message, code?, details? } }` with HTTP status. Validation → 400, Unauthorized → 401, Forbidden → 403, Not found → 404.
