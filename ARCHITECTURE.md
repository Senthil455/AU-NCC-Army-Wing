# Architecture — AU NCC Army Wing

Goal from Oct 02 meeting: **portal + export** that survives developer change and Phase 2/3 additions.

## Principles

1. **Monorepo, split deployables.** `frontend/` and `backend/` version together, deploy separately. No cross-imports except documented HTTP contract (`docs/api.md`) + duplicated DTO types (keep in sync, or extract `packages/shared` later).
2. **Module (domain) isolation on backend.** Each domain lives in `backend/src/modules/<domain>/` with `routes.ts + controller.ts + service.ts + validators.ts`. Cross-domain calls go via service functions, never via HTTP internally. Adding camps/certs/quiz = copy `announcements/` module.
3. **Thin controllers, fat services.** Controllers: parse/validate/auth → service → respond. Services: Prisma + business rules. Utils (`excel/pdf/jwt`) are stateless.
4. **Contract-first exports.** Export columns are whitelisted (`cadets/export.service.ts: EXPORTABLE_COLUMNS`). Frontend sends `?columns=a,b` — backend rejects unknown columns. Same pattern reused for attendance/applicant exports.
5. **RBAC at middleware + service.** `requireRole(...)` gates routes; services re-check for PII/full-export (`OFFICER` only). Audit log is fire-and-forget, never blocks the request.
6. **Frontend feature folders.** `frontend/src/components/<domain>/` + `frontend/app/<route>/`. API access only via `src/lib/api.ts`. Auth only via `src/lib/auth.tsx`. No direct `fetch` elsewhere.

## Backend map

```
src/
  server.ts            # listen (only side-effect file)
  app.ts               # express wiring: helmet/cors/rate-limit/routes/errors
  config/env.ts        # zod-validated env (fails fast)
  config/db.ts         # single PrismaClient singleton
  common/              # AppError, asyncHandler, pagination, audit helper
  middleware/          # authenticate, requireRole, errorHandler
  routes/index.ts      # mounts /api/<domain>
  modules/
    auth/              # login/refresh/me
    cadets/            # CRUD + search/filter/sort/page + export + bulk upload
    attendance/        # sessions + marking + % + lock + reports
    announcements/     # board
    dashboard/         # stats for officers
    publicContent/     # news + events (public read, officer write)
  utils/               # jwt, password, excel, pdf, csv
prisma/schema.prisma   # single source of truth — see docs/data-model.md
```

## Frontend map

```
app/
  layout.tsx, page.tsx            # shell + home (hero, motto, news)
  about|organisation|gallery|news|events|contact/
  login/                          # JWT login
  dashboard/                      # role switch (officer/leader/cadet)
  cadets/                         # table + filters + column chooser + export
  attendance/                     # session list + marking (mobile-first, offline queue)
  announcements/
src/
  lib/api.ts           # fetch wrapper (base URL, token, refresh)
  lib/auth.tsx         # AuthProvider + useAuth + role guard
  lib/i18n.tsx         # EN/TA dictionary + LanguageToggle
  components/...       # Navbar, Footer, CadetTable, etc.
  types/index.ts       # DTO mirrors of backend
```

## Adding a feature (example: Camps — Phase 2)

Backend:
1. Add models to `prisma/schema.prisma` → `npx prisma migrate dev --name add_camps`.
2. Copy `modules/announcements/` → `modules/camps/`, rename service fns, add validators with zod.
3. Mount in `routes/index.ts`: `router.use('/camps', campsRoutes)`.
4. Add audit calls (`audit()`) for create/update/download.
5. Document in `docs/api.md`.

Frontend:
1. Add `app/camps/page.tsx` + `src/components/camps/*`.
2. Add types in `src/types/index.ts`, fetch via `api()` lib.
3. Gate with `<RequireRole roles={...}>`.

No changes to auth/cadets/attendance files. That is the extensibility test — if you touch existing modules, the boundary is wrong.

## Data & exports

- Postgres via Prisma. All list endpoints: `?search=&year=&department=&page=&pageSize=&sort=&order=`.
- Excel: ExcelJS. PDF: pdfkit (server-side, print-ready). CSV: csv-stringify. All stream from memory — no temp files.
- Bulk upload: `POST /api/cadets/bulk-upload` accepts `.xlsx` (multer memory), validates rows with zod, returns `{ inserted, errors[] }`. Template at `GET /api/cadets/template`.

## Auth & RBAC

- Access JWT (15 min) + rotating refresh JWT (7 d, hashed in DB). `authenticate` verifies access; `requireRole('OFFICER_ANO_CTO','SUPER_ADMIN',...)` checks `req.user.role`.
- Roles: `SUPER_ADMIN | OFFICER_ANO_CTO | LEADER_SUO | CADET`. Public = no token.
- Full-PII download restricted to officer roles; leaders get platoon-scoped view (service filters by `platoon`); cadets get own record only (`GET /api/cadets/me`).

## Decisions (ADRs)

See `docs/decisions.md`: why Next.js+Express+Postgres+JWT+ExcelJS/pdfkit, why Prisma, why monorepo, why server-side PDF.

## Non-goals (for now)

QR+geofence, merit leaderboard, portfolio PDF, chatbot — defined as Phase 3 slots with stub routes/types so they slot in without refactor.
