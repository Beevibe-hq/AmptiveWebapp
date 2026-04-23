import { api, API_BASE, StandardResponse } from './client';
import { UserProfile, normalizeUserProfile } from './profiles';

export interface UserResponse {
  status: boolean;
  status_code: number;
  message: string;
  data: UserProfile | null;
}

export interface LoginResponse {
  user: UserProfile | null;
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  status: boolean;
  status_code?: number;
  message?: string;
  data?: {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    user: UserProfile | null;
  };
  error?: string;
}

export interface LoginRequest {
  email?: string;
  phone_number?: string;
  password: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface RegisterOptions {
  username?: string;
  dob?: string;
  name?: string;
  phone_number?: string;
}

export interface AuthResponse {
  status: boolean;
  message?: string;
  data?: {
    access_token?: string;
    refresh_token?: string;
    user?: UserProfile;
  };
  user?: UserProfile;
  access_token?: string;
  refresh_token?: string;
  error?: string;
}

type AvailabilityData = Record<string, unknown> | boolean | null | undefined;

function firstBoolean(data: AvailabilityData): boolean | null {
  if (typeof data === 'boolean') return data;
  if (!data || typeof data !== 'object') return null;

  for (const value of Object.values(data)) {
    if (typeof value === 'boolean') return value;
  }

  return null;
}

function normalizeStandardUserResponse(response: StandardResponse<UserProfile>): UserResponse {
  return {
    status: response.status,
    status_code: response.status_code,
    message: response.message,
    data: normalizeUserProfile(response.data),
  };
}

function unsupportedAuthResponse(message: string): AuthResponse {
  return {
    status: false,
    message,
    error: message,
  };
}

export async function login(email: string, password: string, phoneNumber?: string): Promise<LoginResponse> {
  try {
    const loginData: { email?: string; phone_number?: string; password: string } = { password };
    if (phoneNumber) {
      loginData.phone_number = phoneNumber;
    } else if (email) {
      loginData.email = email;
    }

    const response = await api.post<{ user: UserProfile; access_token: string; refresh_token: string; expires_in?: number }>('/auth/login', loginData);
    
    const user = normalizeUserProfile(response.user);    
    if (!user) {
      throw new Error('Login response did not include a valid user profile.');
    }    

    const expiresIn = response.expires_in;
    api.setSessionTokens(response.access_token, response.refresh_token, expiresIn);

    return {
      user,
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      status: true,
      message: 'Login successful',
      data: {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        user,
      },
    };
  } catch (error: any) {
    return {
      user: null,
      access_token: '',
      refresh_token: '',
      status: false,
      message: error.message,
      error: error.message,
    };
  }
}

export const signInWithEmail = login;

export async function register(email: string, password: string, options?: RegisterOptions): Promise<AuthResponse> {
  if (!options?.username || !options?.dob) {
    return unsupportedAuthResponse('Registration now requires username and date of birth before calling the backend.');
  }

  try {
    const response = await api.post<StandardResponse<unknown>>('/auth/register', {
      email,
      password,
      username: options.username,
      dob: options.dob,
      name: options.name,
      phone_number: options.phone_number,
    });

    return {
      status: response.status,
      message: response.message,
      data: {},
    };
  } catch (error: any) {
    return unsupportedAuthResponse(error.message);
  }
}

export const signUpWithEmail = register;

export async function signOut(): Promise<void> {
  await logout();
}

export async function signOutSilent(): Promise<{ error: null }> {
  api.clearSessionTokens();
  return { error: null };
}

export async function logout(): Promise<void> {
  console.log("called loaout");
  
  api.clearSessionTokens();
  localStorage.removeItem('amptive.auth');
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = api.getToken();  
  if (!token) return null;

  try {
    const response = await api.get<UserProfile>('/users/me');
    return normalizeUserProfile(response);
  } catch {
    api.clearSessionTokens();
    return null;
  }
}

export async function getSession(): Promise<{ user: UserProfile | null; token: string | null }> {
  const token = api.getToken();
  if (!token) return { user: null, token: null };

  try {
    const response = await api.get<StandardResponse<UserProfile>>('/users/me');
    return { user: normalizeUserProfile(response.data), token };
  } catch {
    return { user: null, token: null };
  }
}

export async function refreshSession(): Promise<AuthResponse> {
  const refreshToken = api.getRefreshToken();
  if (!refreshToken) {
    return unsupportedAuthResponse('No refresh token available.');
  }

  try {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });

    api.setSessionTokens(response.access_token, response.refresh_token);

    return {
      status: true,
      message: 'Session refreshed',
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      data: {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      },
    };
  } catch (error: any) {
    api.clearSessionTokens();
    return unsupportedAuthResponse(error.message);
  }
}

export function signInWithGoogle(): void {
  throw new Error('Google OAuth is not supported by the current backend contract.');
}

export async function handleOAuthCallback(_code: string): Promise<AuthResponse> {
  return unsupportedAuthResponse('OAuth callback is not supported by the current backend contract.');
}

export type VerifyOtpResponse = { success: boolean; message?: string };
export type ResendOtpResponse = { success: boolean; message?: string };

export async function verifyOtp(email: string, code: string): Promise<VerifyOtpResponse> {
  try {
    const response = await api.post<StandardResponse<unknown>>('/auth/verify-otp', { email, otp: code });
    return { success: response.status, message: response.message };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function resendOtp(email: string): Promise<ResendOtpResponse> {
  try {
    const response = await api.post<StandardResponse<unknown>>('/auth/init', { email });
    return { success: response.status, message: response.message };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function isVerified(_email: string): Promise<{ verified: boolean }> {
  return { verified: false };
}

export async function checkEmailExists(email: string): Promise<{ exists: boolean; available?: boolean; message?: string }> {
  try {
    const response = await api.post<StandardResponse<AvailabilityData>>('/auth/check-availability', { email });
    const available = firstBoolean(response.data);

    if (available !== null) {
      return { exists: !available, available, message: response.message };
    }

    if (response.status && /available/i.test(response.message)) {
      return { exists: false, available: true, message: response.message };
    }

    return { exists: true, available: false, message: response.message };
  } catch (error: any) {
    return { exists: false, available: false, message: error.message };
  }
}

export async function stashSignup(_email: string, _password: string): Promise<{ ok: boolean; token?: string; ttlSeconds?: number; message?: string }> {
  return {
    ok: false,
    message: 'Signup credential stashing is not supported by the current backend contract.',
  };
}

export async function consumeSignup(_token: string): Promise<{ ok: boolean; email?: string; password?: string; message?: string }> {
  return {
    ok: false,
    message: 'Signup credential consumption is not supported by the current backend contract.',
  };
}

export async function getNormalizedCurrentUserResponse(): Promise<UserResponse> {
  const response = await api.get<StandardResponse<UserProfile>>('/users/me');
  return normalizeStandardUserResponse(response);
}

export type User = UserProfile;

export { API_BASE };
