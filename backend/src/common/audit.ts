import { prisma } from '../config/db.js';

export function audit(action: string, entity: string, opts: { actorId?: string; entityId?: string; meta?: object; ip?: string } = {}) {
  // Fire-and-forget: audit must never break the request.
  prisma.auditLog
    .create({ data: { action, entity, entityId: opts.entityId, actorId: opts.actorId, meta: (opts.meta ?? {}) as object, ip: opts.ip } })
    .catch(() => undefined);
}
