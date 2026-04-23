const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
const ACCESS_TOKEN_KEY = 'amptive.auth_token';
const REFRESH_TOKEN_KEY = 'amptive.refresh_token';
const ACCESS_TOKEN_EXPIRY_KEY = 'amptive.auth_token_expiry';
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

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

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
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

    const data: TokenRefreshResponse = await response.json();
    const expiresIn = data.expires_in ?? 3600;
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    localStorage.setItem(ACCESS_TOKEN_EXPIRY_KEY, String(expiresAt));
    return true;
  } catch {
    clearSessionTokens();
    return false;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

function isTokenExpiringSoon(): boolean {
  const expiryStr = localStorage.getItem(ACCESS_TOKEN_EXPIRY_KEY);
  if (!expiryStr) return false;
  
  const expiry = parseInt(expiryStr, 10);
  return Date.now() + TOKEN_EXPIRY_BUFFER_MS > expiry;
}

async function ensureValidToken(): Promise<boolean> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return false;
  
  if (isTokenExpiringSoon()) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }
    const success = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;
    return success;
  }
  return true;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!endpoint.includes('/auth/')) {
    const hasValidToken = await ensureValidToken();
    if (!hasValidToken) {
      clearSessionTokens();
      throw new Error('Session expired. Please log in again.');
    }
  }

  const url = `${API_BASE}${endpoint}`;
  const headers = getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }

    const refreshSuccess = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshSuccess) {
      const retryHeaders = getAuthHeaders();
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...retryHeaders,
          ...options.headers,
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
    const errorMessage = errorBody.message || errorBody.detail || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (data && typeof data === 'object' && 'status' in data && 'status_code' in data) {
    const stdResponse = data as StandardResponse<T>;
    if (!stdResponse.status && stdResponse.status_code >= 400) {
      throw new Error(stdResponse.message || `Request failed with status ${stdResponse.status_code}`);
    }
    return stdResponse.data as T;
  }

  return data as T;
}

export const api = {
  request,

  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  uploadFile: async (bucket: string, path: string, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/storage/${bucket}/${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Upload failed');
    }

    const data = await response.json();
    return data.url || `${API_BASE}/storage/${bucket}/${path}`;
  },

  setToken: (token: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  setRefreshToken: (token: string) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  setSessionTokens: (accessToken: string, refreshToken?: string | null, expiresIn?: number) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    if (expiresIn) {
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
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_EXPIRY_KEY);
  },

  getToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),

  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
};

export { API_BASE };
export type { StandardResponse };