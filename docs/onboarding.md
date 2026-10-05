# Onboarding (15-min path for a new developer)

You just joined after a developer change. This gets you running and shipping safely.

## 1. Read (5 min)
1. `README.md` → scope + quickstart.
2. `ARCHITECTURE.md` → where to put code (never cross module boundaries).
3. `docs/api.md` → HTTP contract. 4. Your area: frontend → `frontend/README.md`; backend → `backend/README.md`.

## 2. Run (5 min)
```bash
docker compose up -d db
cd backend && cp .env.example .env && npm install && npx prisma migrate dev && npm run db:seed && npm run dev
# new terminal:
cd frontend && cp .env.example .env.local && npm install && npm run dev
```
Log in with `ano@annauniv.edu / Passw0rd!` (dev seed only).

## 3. Ship (5 min pattern)
- Pick issue → `git checkout -b feat/<domain>-<short>` from `develop`.
- Backend: copy nearest module (`announcements/` is smallest), add zod validator, service, mount route, `npm run typecheck && npm test`.
- Frontend: add route under `app/`, component under `src/components/<domain>/`, fetch via `api()` lib, gate with `RequireRole`.
- Open PR to `develop` with API-doc update + screenshot. Attend Mon/Wed/Sat syncs.
