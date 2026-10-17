const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function getTokens(): { access?: string; refresh?: string } {
  if (typeof window === 'undefined') return {};
  return { access: localStorage.getItem('ncc_access') ?? undefined, refresh: localStorage.getItem('ncc_refresh') ?? undefined };
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('ncc_access', access);
  localStorage.setItem('ncc_refresh', refresh);
}

export function clearTokens() {
  localStorage.removeItem('ncc_access');
  localStorage.removeItem('ncc_refresh');
}

async function tryRefresh(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;
  const r = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!r.ok) return null;
  const data = await r.json();
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function api<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const { access } = getTokens();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}), ...(opts.headers ?? {}) },
  });
  if (res.status === 401 && retry) {
    const next = await tryRefresh();
    if (next) return api<T>(path, opts, false);
    clearTokens();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  return (await res.blob()) as unknown as T;
}

export function downloadUrl(path: string): string {
  const access = typeof window !== 'undefined' ? localStorage.getItem('ncc_access') : null;
  void access;
  // Exports go through fetch+blob to attach the token (see CadetTable).
  return `${BASE}${path}`;
}

export const API_BASE = BASE;
