'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, setTokens, clearTokens } from './api';
import type { User, Role } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (emailOrRegdNo: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState>({ user: null, loading: true, login: async () => undefined, logout: () => undefined });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ncc_access');
    if (!token) {
      setLoading(false);
      return;
    }
    api<{ user: User }>('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const login = async (emailOrRegdNo: string, password: string) => {
    const d = await api<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrRegdNo, password }),
    });
    setTokens(d.accessToken, d.refreshToken);
    setUser(d.user);
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && (!user || !roles.includes(user.role))) router.replace('/login');
  }, [user, loading, roles, router]);
  if (loading) return <p className="p-8">Loading…</p>;
  if (!user || !roles.includes(user.role)) return null;
  return <>{children}</>;
}
