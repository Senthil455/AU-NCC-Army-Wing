# Privacy & DPDP Act 2023 — implementation notes

Personal data (phone, address, parent contact, photo) is **restricted by design**, not policy.

## Enforced now
- **Consent:** `Cadet.consentGiven + consentAt` required on create/bulk-upload. No consent → record rejected (bulk row error) or flagged.
- **Role-gated reads:** public/anon sees no PII. `GET /cadets` strips `phone/address/parentContact` for non-officers; cadets use `/cadets/me` (own only); leaders platoon-scoped in service layer.
- **Restricted downloads:** `export.*` with sensitive columns requires `OFFICER_ANO_CTO`/`SUPER_ADMIN`. Every export writes an `AuditLog` row (who/when/filters/columns/ip).
- **Edit control:** attendance locked 24h after session; override = officer-only + audit. Cadet profile key-change (regdNo/rank/certificate) = officer approval path (PATCH officer-only for those fields — enforced in validator).
- **Transport/storage:** HTTPS (hosting), bcrypt (cost 12) passwords, refresh tokens hashed, `helmet` headers, rate-limit on auth, boring `DELETE` = soft-deactivate (`isActive=false`).
- **Gallery consent:** separate `photoConsent` understanding — never publish cadet photos publicly without explicit flag (add column when gallery upload lands; default deny).

## Operator duties
- Back up Postgres daily; test restore monthly. Rotate `JWT_*` secrets on staff change. Review `AuditLog` weekly (who exported what).
- Avoid Aadhaar collection. If Directorate mandates it, store encrypted + separate table + officer-only, with data-retention ticket.
- Breach: revoke refresh tokens (`auth/logout` all), rotate secrets, notify per DPDP timelines.

## Phase 2 hooks
Notifications via WhatsApp/SMS must log purpose + opt-in; keep sender allowlist in env, never in code.
