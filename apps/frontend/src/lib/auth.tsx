'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthResponse, MeResponse, Role, User } from '@ncc/shared';
import { UNAUTHORIZED_EVENT, api, clearTokens, revokeSession, setTokens } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (emailOrRegdNo: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {
    throw new Error('AuthProvider missing');
  },
  logout: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on first paint: a stored access token is only trusted once `/auth/me`
  // confirms it (and rotates it through the refresh flow if it has expired).
  useEffect(() => {
    if (!localStorage.getItem('ncc_access')) {
      setLoading(false);
      return;
    }
    let active = true;
    api<MeResponse>('/auth/me')
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        clearTokens();
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // A dead refresh token (revoked, reused, expired) must log the tab out instead of looping.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (emailOrRegdNo: string, password: string) => {
    const data = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrRegdNo, password }),
      skipAuthRetry: true,
    });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    // Revoke first (best effort), then forget the tokens — otherwise the refresh token stays
    // valid on the server until it expires.
    await revokeSession();
    clearTokens();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

/** Client-side gate. The API enforces the same rule server-side — this only avoids a flash of empty UI. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const authorised = !!user && roles.includes(user.role);

  useEffect(() => {
    if (!loading && !authorised) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, authorised, router, pathname]);

  if (loading) {
    return (
      <p className="p-8" role="status">
        Loading…
      </p>
    );
  }
  if (!authorised) return null;
  return <>{children}</>;
}
