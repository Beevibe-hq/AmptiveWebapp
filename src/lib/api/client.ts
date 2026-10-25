// Same-origin in every environment: the Vite proxy in dev, the Netlify /api/* proxy once
// deployed. Which backend that resolves to is a per-site deploy setting (API_ORIGIN), not
// something baked into the bundle — a hardcoded host here is how production ended up
// serving staging data. Staying same-origin also sidesteps CORS entirely, which matters
// because the production API only allows the getamptive.com origin, not the tip domains.
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
const ACCESS_TOKEN_KEY = 'amptive.auth_token';
const REFRESH_TOKEN_KEY = 'amptive.refresh_token';
const ACCESS_TOKEN_EXPIRY_KEY = 'amptive.auth_token_expiry';

interface StandardResponse<T> {
  status: boolean;
  status_code: number;
  message: string;
  data?: T | null;
  errors?: unknown;
}

interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

function getAuthHeaders(isFormData = false): HeadersInit {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const headers: HeadersInit = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function clearSessionTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRY_KEY);
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    clearSessionTokens();
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearSessionTokens();
      return false;
    }

    const json = await response.json();
    
    let data: TokenRefreshResponse;
    if (json && typeof json === 'object' && 'status' in json && 'data' in json) {
      data = json.data;
    } else {
      data = json;
    }

    if (!data || !data.access_token) {
      clearSessionTokens();
      return false;
    }

    const expiresIn = data.expires_in ?? 3600;
    const expiresAt = Date.now() + (expiresIn * 1000);

    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    if (data.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    }
    localStorage.setItem(ACCESS_TOKEN_EXPIRY_KEY, String(expiresAt));
    return true;
  } catch {
    clearSessionTokens();
    return false;
  }
}

let refreshPromise: Promise<boolean> | null = null;

function isTokenExpiringSoon(bufferMs = 5 * 60 * 1000): boolean {
  const expiryStr = localStorage.getItem(ACCESS_TOKEN_EXPIRY_KEY);
  if (!expiryStr) return true;

  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry)) return true;

  return Date.now() + bufferMs > expiry;
}

async function ensureValidToken(): Promise<boolean> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return false;

  const expiryStr = localStorage.getItem(ACCESS_TOKEN_EXPIRY_KEY);
  if (expiryStr && isTokenExpiringSoon()) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const success = await refreshPromise;
    refreshPromise = null;
    if (!success) {
      // If refresh fails, still attempt request with current token; backend 401 handler will catch invalid tokens
      return true;
    }
  }

  return true;
}

async function executeRequest<T>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean; isFormData?: boolean } = {}
): Promise<T> {
  const { isFormData, skipAuth, ...fetchOptions } = options;

  if (!skipAuth && !endpoint.includes('/auth/')) {
    const hasValidToken = await ensureValidToken();
    if (!hasValidToken) {
      clearSessionTokens();
      throw new Error('Session expired. Please log in again.');
    }
  }

  const url = `${API_BASE}${endpoint}`;
  const headers = getAuthHeaders(isFormData);

  const response = await fetch(url, {
    ...fetchOptions,
    cache: fetchOptions.method === 'GET' ? 'no-store' : fetchOptions.cache,
    headers: {
      ...headers,
      ...(fetchOptions.method === 'GET' ? { 'Cache-Control': 'no-cache' } : {}),
      ...fetchOptions.headers,
    },
  });

  if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }

    const refreshSuccess = await refreshPromise;
    refreshPromise = null;

    if (refreshSuccess) {
      const retryHeaders = getAuthHeaders(isFormData);
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...retryHeaders,
          ...fetchOptions.headers,
        },
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${retryResponse.status}`);
      }

      return retryResponse.json();
    }

    clearSessionTokens();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    console.error('API Error Response:', errorBody);
    let errorMessage = errorBody.message || errorBody.detail || `HTTP ${response.status}`;
    if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
      // Pages show error.message straight to users, so make it a sentence ("Amount: Input should
      // be greater than or equal to 10000") instead of "Field validation error (Validation: [{…}])".
      // The raw list rides along as fieldErrors for code that needs to branch on a field.
      const readable = errorBody.errors
        .map((item: any) => {
          const field = String(item?.field ?? (Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : '') ?? '').replace(/_/g, ' ').trim();
          const message = String(item?.message ?? item?.msg ?? '').trim();
          if (!message) return '';
          return field ? `${field.charAt(0).toUpperCase()}${field.slice(1)}: ${message}` : message;
        })
        .filter(Boolean)
        .join(' · ');
      throw Object.assign(new Error(readable || errorMessage), { fieldErrors: errorBody.errors, status: response.status });
    } else if (typeof errorBody === 'object' && Object.keys(errorBody).length > 0 && !errorBody.message && !errorBody.detail) {
      errorMessage = JSON.stringify(errorBody);
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (data && typeof data === 'object' && 'status' in data && 'status_code' in data) {
    const stdResponse = data as StandardResponse<T>;
    if (!stdResponse.status && stdResponse.status_code >= 400) {
      throw new Error(stdResponse.message || `Request failed with status ${stdResponse.status_code}`);
    }
    if ('data' in stdResponse) {
      if (stdResponse.data && typeof stdResponse.data === 'object' && !Array.isArray(stdResponse.data)) {
        return {
          total: (data as any).total,
          page: (data as any).page,
          page_size: (data as any).page_size,
          total_pages: (data as any).total_pages,
          metadata: (data as any).metadata,
          ...stdResponse.data,
        } as T;
      }
      return stdResponse.data as T;
    }
    return data as T;
  }

  return data as T;
}

/*
 * Short-lived cache for the reads every dashboard page repeats (the signed-in user, the
 * host's events, each event's tickets and orders). Without it, moving between dashboard
 * pages refetched all of them every time. Identical requests in flight share one fetch.
 * Any write clears the whole cache, before and after it runs, so nothing shown after an
 * edit is stale; so does signing in or out.
 */
const GET_CACHE_TTL_MS = 30 * 1000;
const getCache = new Map<string, { at: number; promise: Promise<unknown> }>();

function clearGetCache(): void {
  getCache.clear();
}

function cloneData<T>(data: T): T {
  // Callers own what they get back; never hand two pages the same object to mutate.
  try {
    return structuredClone(data);
  } catch {
    return data;
  }
}

async function getCached<T>(endpoint: string, options: { skipAuth?: boolean } = {}): Promise<T> {
  const key = `${localStorage.getItem(ACCESS_TOKEN_KEY) || ''}|${endpoint}`;
  const hit = getCache.get(key);
  if (hit && Date.now() - hit.at < GET_CACHE_TTL_MS) {
    return cloneData((await hit.promise) as T);
  }
  const promise = executeRequest<T>(endpoint, { method: 'GET', ...options, isFormData: false });
  const entry = { at: Date.now(), promise };
  getCache.set(key, entry);
  promise.catch(() => {
    if (getCache.get(key) === entry) getCache.delete(key);
  });
  return cloneData(await promise);
}

async function runWrite<T>(endpoint: string, options: RequestInit & { skipAuth?: boolean; isFormData?: boolean }): Promise<T> {
  clearGetCache();
  try {
    return await executeRequest<T>(endpoint, options);
  } finally {
    clearGetCache();
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') return runWrite<T>(endpoint, { ...options, isFormData: false });
  return executeRequest<T>(endpoint, { ...options, isFormData: false });
}

async function requestFormData<T>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  return runWrite<T>(endpoint, { ...options, isFormData: true });
}

export const api = {
  request,
  requestFormData,

  get: <T>(endpoint: string, options?: { skipAuth?: boolean }) => request<T>(endpoint, { method: 'GET', ...options }),

  /** Like get, but reuses a response from the last 30 s (see getCache above). */
  getCached: <T>(endpoint: string, options?: { skipAuth?: boolean }) => getCached<T>(endpoint, options),

  clearCache: clearGetCache,

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  post: <T>(endpoint: string, body?: unknown, options?: { skipAuth?: boolean }) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  postFormData: <T>(endpoint: string, formData?: FormData) =>
    requestFormData<T>(endpoint, {
      method: 'POST',
      body: formData,
    }),

  patchFormData: <T>(endpoint: string, formData?: FormData) =>
    requestFormData<T>(endpoint, {
      method: 'PATCH',
      body: formData,
    }),

  putFormData: <T>(endpoint: string, formData?: FormData) =>
    requestFormData<T>(endpoint, {
      method: 'PUT',
      body: formData,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  setToken: (token: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  setRefreshToken: (token: string) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  setSessionTokens: (accessToken: string, refreshToken?: string | null, expiresIn?: number) => {
    clearGetCache();
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    if (expiresIn && expiresIn > 0) {
      const expiresAt = Date.now() + (expiresIn * 1000);
      localStorage.setItem(ACCESS_TOKEN_EXPIRY_KEY, String(expiresAt));
    } else {
      localStorage.removeItem(ACCESS_TOKEN_EXPIRY_KEY);
    }
  },

  clearToken: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  clearSessionTokens: () => {
    clearGetCache();
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_EXPIRY_KEY);
  },

  getToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),

  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  getProxiedImageUrl: (imageUrl: string): string => {
    if (!imageUrl) return '';
    const isExternal = /^https?:\/\//.test(imageUrl);
    return isExternal ? `${API_BASE}/extras/image-proxy?url=${encodeURIComponent(imageUrl)}` : imageUrl;
  },
};

export { API_BASE };
export type { StandardResponse };
