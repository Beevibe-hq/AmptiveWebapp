import { api } from './client';
import { UserProfile, normalizeUserProfile } from './profiles';
import { $auth, $users } from './services';
import type { AvailabilityResponse, LoginRequest, RegisterRequest } from './services';

function decodeTokenExpiry(token: string): number | undefined {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return undefined;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      return payload.exp - now;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

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



function unsupportedAuthResponse(message: string): AuthResponse {
  return {
    status: false,
    message,
    error: message,
  };
}

export async function login(email: string, password: string, phoneNumber?: string): Promise<LoginResponse> {
  try {
    const loginData: LoginRequest = { password };
    if (phoneNumber) {
      loginData.phone_number = phoneNumber;
    } else if (email) {
      loginData.email = email;
    }

    const response = await $auth.login(loginData);
    
    const user = normalizeUserProfile(response.user);    
    if (!user) {
      throw new Error('Login response did not include a valid user profile.');
    }    

    const expiresIn = decodeTokenExpiry(response.access_token);
    const tokenExpiry = expiresIn ?? 86400;
    api.setSessionTokens(response.access_token, response.refresh_token, tokenExpiry);

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
    const registerData: RegisterRequest = {
      email,
      password,
      username: options.username,
      dob: options.dob,
      name: options.name,
      phone_number: options.phone_number,
    };
    const response = await $auth.register(registerData);

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
  api.clearSessionTokens();
  localStorage.removeItem('amptive.auth');
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = api.getToken();  
  if (!token) return null;

  try {
    const response = await $users.getCurrent();    
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
    const response = await $users.getCurrent();    
    return { user: normalizeUserProfile(response), token };
  } catch (error: any) {
    const errorStr = String(error);
    if (errorStr.includes('401') || errorStr.includes('unauthorized') || errorStr.includes('Invalid login') || errorStr.includes('Token expired')) {
      api.clearSessionTokens();
      return { user: null, token: null };
    }
    console.warn('Session fetch error (non-auth):', error);
    return { user: null, token };
  }
}

export async function refreshSession(): Promise<AuthResponse> {
  const refreshToken = api.getRefreshToken();
  if (!refreshToken) {
    return unsupportedAuthResponse('No refresh token available.');
  }

  try {
    const response = await $auth.refresh({ refresh_token: refreshToken });

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
    const response = await $auth.verifyOtp(email, code);
    return { success: response.status, message: response.message };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function resendOtp(email: string): Promise<ResendOtpResponse> {
  try {
    const response = await $auth.resendOtp(email);
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
    const response = await $auth.checkAvailability({ email });
    return { exists: !response.status, available: response.status, message: response.message };
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
  const response = await $users.getCurrent();
  return {
    status: true,
    status_code: 200,
    message: 'Success',
    data: normalizeUserProfile(response),
  };
}

export type User = UserProfile;
