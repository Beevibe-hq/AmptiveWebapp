import { api, API_BASE } from './client';
import { UserProfile } from './profiles';

export interface UserResponse {
  status: boolean,
  status_code: number,
  message: string,
  data: UserProfile
}

export interface AuthResponse {
  status: boolean;
  message?: string;
  data?: {
    access_token: string;
    // token_type: string;
    // expires_in: number;
    refresh_token?: string;
    user?: UserProfile;
  };
  error?: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });

    if (response.data?.access_token) {
      api.setToken(response.data.access_token);
    }

    return response;
  } catch (error: any) {
    console.log("Login error:", error.response?.data || error.message);
    return error;
  }
}

export const signInWithEmail = login;
export const signUpWithEmail = register;

export async function signOutSilent(): Promise<{ error: null }> {
  try {
    await api.post('/auth/logout');
  } finally {
    api.clearToken();
  }
  return { error: null };
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', { email, password });
  if (response.data?.access_token) {
    api.setToken(response.data.access_token);
  }
  return response;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    api.clearToken();
    localStorage.removeItem('amptive.auth');
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = api.getToken();
  if (!token) return null;

  try {
    const user = await api.get<UserResponse>('/users/me');
    return user.data;
  } catch {
    api.clearToken();
    return null;
  }
}

export async function getSession(): Promise<{ user: UserProfile | null; token: string | null }> {
  const token = localStorage.getItem('amptive.auth_token');
  if (!token) return { user: null, token: null };

  try {
    const user = await api.get<UserResponse>('/users/me');
    return { user: user.data, token };
  } catch {
    return { user: null, token: null };
  }
}

export async function refreshSession(): Promise<AuthResponse> {

  const response = await api.post<AuthResponse>('/auth/refresh');
  if (response.data?.access_token) {
    api.setToken(response.data.access_token);
  }
  return response;
}

export function signInWithGoogle(): void {
  const currentOrigin = window.location.origin;
  const redirectTo = `${currentOrigin}/auth/callback`;
  window.location.href = `${API_BASE}/auth/oauth/google?redirectTo=${encodeURIComponent(redirectTo)}`;
}

export async function handleOAuthCallback(code: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/callback', { code });
  if (response.data?.access_token) {
    api.setToken(response.data.access_token);
  }
  return response;
}

export type VerifyOtpResponse = { success: boolean; message?: string };
export type ResendOtpResponse = { success: boolean; message?: string };

export async function verifyOtp(email: string, code: string): Promise<VerifyOtpResponse> {
  return api.post<VerifyOtpResponse>('/otp/verify', { email, code });
}

export async function resendOtp(email: string): Promise<ResendOtpResponse> {
  return api.post<ResendOtpResponse>('/otp/resend', { email });
}

export async function isVerified(email: string): Promise<{ verified: boolean }> {
  return api.post<{ verified: boolean }>('/otp/check', { email });
}

export async function checkEmailExists(email: string): Promise<{ exists: boolean }> {
  return api.post<{ exists: boolean }>('/auth/check-email', { email });
}

export async function stashSignup(email: string, password: string): Promise<{ ok: boolean; token?: string; ttlSeconds?: number; message?: string }> {
  return api.post<{ ok: boolean; token?: string; ttlSeconds?: number; message?: string }>('/auth/stash-signup', { email, password });
}

export async function consumeSignup(token: string): Promise<{ ok: boolean; email?: string; password?: string; message?: string }> {
  return api.post<{ ok: boolean; email?: string; password?: string; message?: string }>('/auth/consume-signup', { token });
}