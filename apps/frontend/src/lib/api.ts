import type { ApiErrorBody } from '@ncc/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const API_BASE = BASE;

const ACCESS_KEY = 'ncc_access';
const REFRESH_KEY = 'ncc_refresh';

/** Fired when the session cannot be recovered; `AuthProvider` listens and drops the user. */
export const UNAUTHORIZED_EVENT = 'ncc:unauthorized';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = 'INTERNAL') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function getTokens(): { access?: string; refresh?: string } {
  if (typeof window === 'undefined') return {};
  return {
    access: localStorage.getItem(ACCESS_KEY) ?? undefined,
    refresh: localStorage.getItem(REFRESH_KEY) ?? undefined,
  };
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export interface RequestOptions extends RequestInit {
  /** Skip refresh-and-retry — used by the auth calls themselves. */
  skipAuthRetry?: boolean;
}

let refreshing: Promise<string | null> | null = null;

/**
 * Exchange the refresh token for a new pair.
 *
 * Single-flight on purpose: refresh-token rotation revokes the token it replaces, so two
 * parallel 401s must never race to rotate — the loser would invalidate the winner's session.
 */
function tryRefresh(): Promise<string | null> {
  refreshing ??= (async () => {
    try {
      const { refresh } = getTokens();
      if (!refresh) return null;
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      // Network hiccup: keep the tokens, the caller reports the failure.
      return null;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

function buildInit(opts: RequestOptions, access?: string): RequestInit {
  const headers = new Headers(opts.headers);
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  // FormData must keep the boundary the browser generates — setting Content-Type breaks it.
  if (opts.body !== undefined && !isForm && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (access && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${access}`);
  return { ...opts, headers };
}

async function toError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status})`, body?.error?.code ?? 'INTERNAL');
}

export async function api<T>(path: string, opts: RequestOptions = {}, retry = !opts.skipAuthRetry): Promise<T> {
  const res = await fetch(`${BASE}${path}`, buildInit(opts, getTokens().access));

  if (res.status === 401 && retry) {
    const next = await tryRefresh();
    if (next) return api<T>(path, opts, false);
    clearTokens();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw await toError(res);
  }

  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  return (contentType.includes('application/json') ? await res.json() : await res.blob()) as T;
}

export interface DownloadInfo {
  /** True when the server capped the export; the file is complete up to the cap. */
  truncated: boolean;
  rows: number | null;
}

/**
 * Download a generated report.
 *
 * The export routes are authenticated, so a plain `<a href>` cannot be used: the token has to
 * travel in the `Authorization` header, which means fetch → blob → object URL.
 */
export async function apiDownload(path: string, filename: string, retry = true): Promise<DownloadInfo> {
  const res = await fetch(`${BASE}${path}`, buildInit({}, getTokens().access));

  if (res.status === 401 && retry) {
    const next = await tryRefresh();
    if (next) return apiDownload(path, filename, false);
    clearTokens();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!res.ok) throw await toError(res);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  const rows = res.headers.get('x-total-count');
  return { truncated: res.headers.get('x-export-truncated') === 'true', rows: rows ? Number(rows) : null };
}

/** Revoke the refresh token server-side. Local tokens are cleared by the caller either way. */
export async function revokeSession(): Promise<void> {
  const { refresh } = getTokens();
  if (!refresh) return;
  try {
    await fetch(`${BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
  } catch {
    // Logging out while offline must still clear this device.
  }
}
