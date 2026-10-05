# Backend — Express + Prisma + Postgres

Owner: Lokashakthivel, Isheetha.

## Commands

```bash
cp .env.example .env
npm install
npx prisma migrate dev   # first run
npm run db:seed          # dev users + sample cadets
npm run dev              # :4000
npm run typecheck && npm test
```

## Structure

`src/server.ts` (listen) · `src/app.ts` (wiring) · `src/modules/<domain>/` (routes/controller/service/validators) · `src/utils/` (jwt/excel/pdf/csv) · `prisma/schema.prisma` (truth).

Add a domain = copy `modules/announcements/`, mount in `src/routes/index.ts`, document in `docs/api.md`.
