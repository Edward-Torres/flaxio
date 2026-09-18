const BASE = '/api';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: 'cookie' }),
    credentials: 'include',
  })
    .then(async (r) => {
      if (!r.ok) return null;
      const data = (await r.json()) as { accessToken: string };
      accessToken = data.accessToken;
      return data.accessToken;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken && !options.skipAuth) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include' });

  if (res.status === 401 && !options.skipAuth && !retried) {
    const newToken = await tryRefresh();
    if (newToken) return request<T>(path, options, true);
  }

  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => null)) as
    | { error?: string; details?: unknown }
    | null;

  if (!res.ok) {
    const details = data?.details as Array<{ path?: string; message?: string }> | undefined;
    let msg = data?.error || 'Error de red';
    if (details?.length) {
      msg += ': ' + details.map((d) => d.path && d.message ? `${d.path}: ${d.message}` : (d.message || '')).join(', ');
    }
    throw new ApiError(res.status, msg, data?.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, skipAuth?: boolean): Promise<T> =>
    request<T>(path, { method: 'GET', skipAuth }),
  post: <T>(path: string, body: unknown, skipAuth?: boolean): Promise<T> =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), skipAuth }),
  put: <T>(path: string, body: unknown, skipAuth?: boolean): Promise<T> =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body), skipAuth }),
  del: <T>(path: string, skipAuth?: boolean): Promise<T> =>
    request<T>(path, { method: 'DELETE', skipAuth }),
};
