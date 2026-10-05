# Frontend — Next.js 14 App Router + Tailwind

Owner: Senthil.

```bash
cp .env.example .env.local
npm install
npm run dev   # :3000
```

Structure: `app/` routes (public + login + dashboard/cadets/attendance/announcements) · `src/components/` per domain · `src/lib/api.ts` (only fetch wrapper) · `src/lib/auth.tsx` (JWT + role guard) · `src/lib/i18n.tsx` (EN/TA).
