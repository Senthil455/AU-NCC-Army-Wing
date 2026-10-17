import { prisma } from '../config/db.js';

export interface AuditInput {
  actorId?: string | null;
  actorRole?: string | null;
  entityId?: string | null;
  meta?: object;
  ip?: string | null;
}

/**
 * Fire-and-forget: auditing must never break the request. It must not fail silently either —
 * a lost audit row is a DPDP compliance gap, so write failures are logged.
 */
export function audit(action: string, entity: string, opts: AuditInput = {}): void {
  void prisma.auditLog
    .create({
      data: {
        action,
        entity,
        entityId: opts.entityId ?? null,
        actorId: opts.actorId ?? null,
        meta: { ...(opts.meta ?? {}), actorRole: opts.actorRole ?? null },
        ip: opts.ip ?? null,
      },
    })
    .catch((error: unknown) => {
      console.error(`[audit] failed to record "${action}" on ${entity}`, error);
    });
}
