# AU NCC Army Wing — Anna University

Central portal for NCC Army Wing cadets: academic/personal data, attendance, exports (Excel/PDF/CSV) for reporting to Group HQ / University.

**Meeting source (Oct 02):** Core = user portal + export. Stack = Next.js + Node.js + Postgres. Workflow = Mon task / Wed progress / Sat retro. Roles = Senthil (frontend), Lokashakthivel + Isheetha (backend).

## Monorepo layout

```
AU-NCC-Army-Wing/
├── frontend/          # Next.js 14 (App Router) + Tailwind — Senthil
├── backend/           # Express + TypeScript + Prisma + Postgres — Lokashakthivel, Isheetha
├── docs/              # ADRs, API, data model, privacy
├── docker-compose.yml # postgres + backend + frontend (dev)
├── Makefile           # shortcuts
└── .github/workflows/ci.yml
```

## Quickstart (dev)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# edit DATABASE_URL + JWT secrets

docker compose up -d db
cd backend && npm install && npx prisma migrate dev && npm run db:seed && npm run dev
cd ../frontend && npm install && npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000/api/health
- API docs: `docs/api.md`

## Weekly workflow (from meeting)

| Day | Meeting | Duration |
|---|---|---|
| Monday | Tasking — assign work | 15 min |
| Wednesday | Progress — unblock | 15 min |
| Saturday | Retro — review + next plan | 15 min |

Branching: `main` (protected) ← `develop` ← `feat/<scope>-<short>` . Conventional commits. See `CONTRIBUTING.md`.

## MVP scope (Phase 1)

- [x] Login + RBAC (Officer / Leader / Cadet / Public)
- [x] Cadet database + filter + column-chooser + Excel/CSV/PDF export + bulk upload template
- [x] Attendance (manual + bulk-present, % calc, <75% flag, edit lock + audit)
- [x] Public pages (home, about, org, gallery, news, events, contact, EN/TA)
- [x] Announcements (urgent/general + attachments)

Phase 2/3 (enrollment, QR+geofence, camps, cert tracker, merit, portfolio, alumni…) are **extension slots** — see `ARCHITECTURE.md § Adding a feature`.

## Security / privacy

DPDP Act 2023: consent flag on cadet, role-gated PII, full-export officer-only, audit log on every edit/download. See `docs/privacy-dpdp.md`.
