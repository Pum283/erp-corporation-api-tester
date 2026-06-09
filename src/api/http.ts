import { clearAuth, getRefreshToken, getToken, saveAuth } from '../lib/storage';
import type { ApiError, TokenResponse } from '../types/entities';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7001').replace(/\/$/, '');

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(apiUrl('/api/auth/refresh'), {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!response.ok) return false;
        const res = (await response.json()) as TokenResponse;
        saveAuth(res.token, res.refreshToken, {
          userId: res.userId,
          fullName: res.fullName,
          employeeCode: res.employeeCode,
        });
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

function handleSessionExpired() {
  clearAuth();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

export class HttpError extends Error {
  status: number;
  body: ApiError | string;

  constructor(status: number, body: ApiError | string) {
    const msg =
      typeof body === 'string'
        ? body
        : body.detail || body.title || body.message || `HTTP ${status}`;
    super(msg);
    this.status = status;
    this.body = body;
  }
}

async function parseBody<T>(response: Response): Promise<T | undefined> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
  },
  retried: boolean,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && options.auth !== false && !retried) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return request<T>(path, options, true);
    handleSessionExpired();
  }

  if (!response.ok) {
    const err = await parseBody<ApiError>(response);
    throw new HttpError(response.status, err ?? response.statusText);
  }

  if (response.status === 204) return undefined as T;
  return (await parseBody<T>(response)) as T;
}

export async function http<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
  } = {},
): Promise<T> {
  return request<T>(path, options, false);
}
