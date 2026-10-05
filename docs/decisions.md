# Decisions (ADRs, condensed)

Meeting decided: **Next.js + Node.js + Postgres + JWT + Excel/PDF libs**. Rationale recorded so future devs don't re-litigate.

## ADR-1: Next.js (React + Tailwind) frontend
- Why: team knows React; App Router gives public pages (SEO) + dashboards in one deploy; Tailwind gives military theme fast.
- Alternatives rejected: plain HTML/CSS/JS (faster day-1, unmaintainable at Phase 3); separate SPA + static site (two deploys).

## ADR-2: Express + TypeScript backend (not Next.js API routes, not Django)
- Why: team split (frontend/backend owners) needs independent deploy + clear HTTP contract; Express hiring/tutorials abundant; TypeScript + zod catches contract drift.
- Django/Flask would be fine but splits language expertise (meeting chose Node for dev efficiency).

## ADR-3: Postgres (not Mongo/Firebase)
- Why: cadet/attendance/reporting is relational + filter-heavy; Postgres handles Excel-scale exports, audit, year rollover cleanly. Prisma migrations are reviewable SQL.
- Firebase OK for prototype, wrong for Group HQ tabular reports + DPDP audit.

## ADR-4: JWT access+refresh (not sessions, not SSO yet)
- Why: stateless API suits Vercel/Render hosting; refresh rotation + revocation table gives logout control. AU SSO added later behind `auth/` service boundary.
- Sessions would be simpler but complicate split hosting.

## ADR-5: ExcelJS + pdfkit server-side (not client-only SheetJS/jspdf)
- Why: officer exports must be identical regardless of browser; server enforces column whitelist + audit + sensitive-data gating. Client libs can't be trusted with PII filtering.
- ReportLab (Python) rejected — no Python service in stack.

## ADR-6: Prisma ORM
- Why: schema.prisma is readable onboarding doc; migrations + seed + type-safe client reduce backend handoff errors between Lokashakthivel/Isheetha and future maintainers.

## ADR-7: Monorepo with split Docker images
- Why: one `git clone` for Mon/Wed/Sat workflow; `docker-compose.yml` runs db+api+web; CI builds each package independently. Avoids micro-repo drift.

## Open questions (from plan §7) — defaults chosen, confirm Monday
1. Admins: `SUPER_ADMIN`=ANO; full download = officer roles only. ✅ implemented.
2. Login: AU email **or** regd no. ✅ implemented (`emailOrRegdNo`).
3. Attendance: manual + bulk-present now; QR+geofence is Phase-3 slot (stub noted). ✅.
4. Tamil+English: `i18n` context + dictionary now, full translation later. ✅.
5. Hosting: Docker images + Vercel/Render-ready; `ncc.annauniv.edu` needs IT ticket. ⬜ team action.
6. Mandatory fields: name/regdNo/department/year/batch + consent; rest optional. ✅.
7. Maintenance: ANO + SUO own content; yearly rollover script slot. ✅ documented.
8. Directorate formats: export columns match enrolment/camp nomination layout; confirm with sample forms Monday.
9. Timeline/roles: per CONTRIBUTING. 10. Budget SMS/domain: email+in-app now; SMS/WhatsApp behind `notifications/` interface (no vendor lock).
