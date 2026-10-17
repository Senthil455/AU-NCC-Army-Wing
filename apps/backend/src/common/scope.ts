import { isOfficer, type Role } from '@ncc/shared';
import { prisma } from '../config/db.js';
import { forbidden } from './errors.js';

/** The authenticated caller every service takes. Structurally compatible with `TokenPayload`. */
export interface Actor {
  sub: string;
  role: Role;
}

export interface StaffScope {
  /** Officers see every platoon; leaders never do. */
  unrestricted: boolean;
  platoon?: string;
}

/**
 * Resolve what a staff member is allowed to read or write.
 *
 * Officers are unrestricted. A `LEADER_SUO` is scoped to the platoon of the Cadet record linked
 * to their login — the previous implementation took a `platoonScope` argument that no caller
 * ever passed, so "platoon-scoped leaders" were an unenforced comment in docs/api.md.
 */
export async function staffScope(user: { sub: string; role: Role }): Promise<StaffScope> {
  if (isOfficer(user.role)) return { unrestricted: true };
  if (user.role !== 'LEADER_SUO') throw forbidden('Staff access required');

  const cadet = await prisma.cadet.findFirst({
    where: { userId: user.sub, isActive: true },
    select: { platoon: true },
  });
  if (!cadet) {
    throw forbidden('Leader login is not linked to a cadet record — ask an officer to link your platoon');
  }
  return { unrestricted: false, platoon: cadet.platoon };
}

/**
 * Intersect a requested platoon filter with the caller's scope.
 * Returns `undefined` for "no filter" and a platoon string for "filter to this platoon".
 */
export function scopedPlatoon(scope: StaffScope, requested?: string | null): string | undefined {
  if (scope.unrestricted) return requested ?? undefined;
  if (requested && requested !== scope.platoon) {
    throw forbidden(`You can only access platoon ${scope.platoon ?? 'assigned to you'}`);
  }
  return scope.platoon;
}
