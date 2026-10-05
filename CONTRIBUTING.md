# Contributing — AU NCC Army Wing

Team (Oct 02): **Senthil — frontend**, **Lokashakthivel + Isheetha — backend**. This file is the handoff contract so anyone can pick up any part.

## Weekly cadence

- **Mon 15 min — Tasking.** Pick issues, assign. Create `feat/<scope>-<short>` branch.
- **Wed 15 min — Progress.** Demo / unblock. Open draft PR early.
- **Sat 15 min — Retro.** Merge to `develop`, tag learnings, plan next.

## Branches & commits

- `main` (protected, releases) ← `develop` (integration) ← feature branches.
- Conventional commits: `feat(cadets): add column chooser`, `fix(attendance): lock edit after 24h`, `docs: update api`.
- PR checklist: `npm run lint && npm run typecheck && npm test` green in its package; update `docs/api.md` if contract changed; attach screenshot for UI.

## Local dev

```bash
docker compose up -d db
# backend
cd backend && cp .env.example .env && npm install && npx prisma migrate dev && npm run db:seed && npm run dev
# frontend (new terminal)
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Seeded logins (dev only): `ano@annauniv.edu / Passw0rd!` (officer), `suo@annauniv.edu / Passw0rd!` (leader), `cadet@annauniv.edu / Passw0rd!` (cadet).

## Standards

- TypeScript strict, no `any` without comment. Zod validates every backend input. No direct `fetch` in frontend components — use `src/lib/api.ts`.
- Research unfamiliar concepts with AI tools (per meeting action item), but **verify against docs + `npm run typecheck`** before committing.
- File structure is fixed: `/frontend`, `/backend`, `/docs`. Don't invent top-level folders without ADR.

## Code owners

- `frontend/**` — @Senthil
- `backend/**` — @Lokashakthivel @Isheetha
- `docs/**`, `docker-compose.yml` — all
