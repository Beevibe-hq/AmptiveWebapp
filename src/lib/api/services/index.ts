import { verify } from 'crypto';
import { api } from '../client';
import type { StandardResponse } from '../client';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  username: string;
  email?: string | null;
  phone_number?: string | null;
  dob?: string | null;
  profile_picture?: string | null;
  avatar_url?: string | null;
  country?: string | null;
  bio?: string | null;
  cover_photo?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  x_url?: string | null;
  followers_count?: number;
  following_count?: number;
  has_hosted_shows?: boolean;
  has_hosted_events?: boolean;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email?: string;
  phone_number?: string;
  password: string;
}

export interface LoginResponse {
  user: UserProfile;
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  dob: string;
  name?: string;
  phone_number?: string;
  profile_picture?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

export interface AuthResponse {
  status: boolean;
  message: string;
  data?: {
    access_token?: string;
    refresh_token?: string;
    user?: UserProfile;
  };
}

export interface AvailabilityRequest {
  email?: string;
  username?: string;
}

export interface AvailabilityResponse {
  status: boolean;
  status_code: number;
  message: string;
}

export type ImageUploadPurpose = 'profile-picture' | 'livestream-banner' | 'community-image'

const USERS_PREFIX = '/users';
const AUTH_PREFIX = '/auth';
const EVENTS_PREFIX = '/events';
const COMMUNITIES_PREFIX = '/communities';
const TICKETS_PREFIX = '/tickets';
const PURCHASES_PREFIX = '/purchases';
const EXTRA_PREFIX = '/extras';
const PAYMENT_PREFIX = '/payments';


// ============================================
// USERS SERVICE
// ============================================

export const $users = {
  getCurrent: () => api.get<UserProfile>(`${USERS_PREFIX}/me`),

  update: (data: Partial<UserProfile>) =>
    api.request<UserProfile>(`${USERS_PREFIX}/me`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getById: (userId: string) =>
    api.get<UserProfile>(`${USERS_PREFIX}/${userId}`),
};

// ============================================
// AUTH SERVICE
// ============================================

export const $auth = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>(`${AUTH_PREFIX}/login`, data),

  register: (data: RegisterRequest) =>
    api.post<StandardResponse<AuthResponse>>(`${AUTH_PREFIX}/register`, data),

  refresh: (data: RefreshTokenRequest) =>
    api.post<RefreshTokenResponse>(`${AUTH_PREFIX}/refresh`, data),

  verifyOtp: (email: string, otp: string) =>
    api.post<StandardResponse<unknown>>(`${AUTH_PREFIX}/verify-otp`, { email, otp }),

  resendOtp: (email: string) =>
    api.post<StandardResponse<unknown>>(`${AUTH_PREFIX}/init`, { email }),

  checkAvailability: (data: AvailabilityRequest) =>
    api.post<AvailabilityResponse>(`${AUTH_PREFIX}/check-availability`, data),
};

// ============================================
// EVENTS SERVICE
// ============================================

export const $events = {
  list: (params?: Record<string, string>) => {
    const endpoint = EVENTS_PREFIX + (params ? `/?${new URLSearchParams(params).toString()}` : '');
    return api.get<{ events: unknown[]; total: number }>(endpoint, { skipAuth: true });
  },

  getById: (eventId: string) =>
    api.get<unknown>(`${EVENTS_PREFIX}/${eventId}`, { skipAuth: true }),

  create: (event: unknown) =>
    api.post<unknown>(`${EVENTS_PREFIX}/`, event),

  update: (eventId: string, event: unknown) =>
    api.patch<unknown>(`${EVENTS_PREFIX}/${eventId}`, event),

  delete: (eventId: string) =>
    api.delete<unknown>(`${EVENTS_PREFIX}/${eventId}`),

  getForCurrentUser: () =>
    api.get<{ events: unknown[]; total: number }>(`${EVENTS_PREFIX}/me/`),

  publish: (eventId: string) =>
    api.post<unknown>(`${EVENTS_PREFIX}/${eventId}/publish`),

  getOrders: (eventId: string) =>
    api.get<unknown>(`${EVENTS_PREFIX}/${eventId}/orders`),
};

// ============================================
// COMMUNITIES SERVICE
// ============================================

export const $communities = {
  list: (params?: Record<string, string>) => {
    const endpoint = COMMUNITIES_PREFIX + (params ? `/?${new URLSearchParams(params).toString()}` : '');
    return api.get<{ communities: unknown[]; total: number }>(endpoint, { skipAuth: true });
  },

  getById: (communityId: string) =>
    api.get<unknown>(`${COMMUNITIES_PREFIX}/${communityId}`),

  getMembers: (communityId: string) =>
    api.get<unknown[]>(`${COMMUNITIES_PREFIX}/${communityId}/members`),

  join: (communityId: string) =>
    api.post<unknown>(`${COMMUNITIES_PREFIX}/${communityId}/join`),

  leave: (communityId: string) =>
    api.post<unknown>(`${COMMUNITIES_PREFIX}/${communityId}/leave`),

  getMyCommunities: () =>
    api.get<unknown>(`${COMMUNITIES_PREFIX}/my-communities`),
};

// ============================================
// TICKETS SERVICE
// ============================================

export const $tickets = {
  getById: (ticketId: string) =>
    api.get<any>(`${TICKETS_PREFIX}/${ticketId}`),

  getForEvent: (eventId: string) =>
    api.get<{ tickets: any }>(`${TICKETS_PREFIX}/events/${eventId}/list`, {skipAuth: true}),

  getMine: () =>
    api.get<{ tickets: any[] }>(`${TICKETS_PREFIX}/me`),

  create: (eventId: string, ticket: unknown) =>
    api.post<unknown>(`${TICKETS_PREFIX}/events/${eventId}/create`, ticket),

  update: (ticketId: string, ticket: unknown) =>
    api.patch<unknown>(`${TICKETS_PREFIX}/${ticketId}/update`, ticket),

  delete: (ticketId: string) =>
    api.delete<unknown>(`${TICKETS_PREFIX}/${ticketId}/deactivate`),

  bulkDelete: (ticketIds: string[]) =>
    api.post<unknown>(`${TICKETS_PREFIX}/bulk-delete`, { ids: ticketIds }),

  checkout: (eventId: string, data: unknown, options?: { skipAuth?: boolean }) =>
    api.post<unknown>(`${TICKETS_PREFIX}/events/${eventId}/checkout`, data, options),

  walletPay: (eventId: string, data: unknown) =>
    api.post<unknown>(`${TICKETS_PREFIX}/events/${eventId}/wallet-pay`, data),
};

// ============================================
// PURCHASES SERVICE
// ============================================

export const $purchases = {
  create: (purchases: unknown) =>
    api.post<unknown>(`${PURCHASES_PREFIX}`, purchases),

  getById: (purchaseId: string) =>
    api.get<unknown>(`${PURCHASES_PREFIX}/${purchaseId}`),
};

// ============================================
// STORAGE SERVICE
// ============================================

export const $storage = {
  listFiles: (bucket: string) =>
    api.get<string[]>(`${EVENTS_PREFIX}/${bucket}`),

  upload: (files: File[], purpose: ImageUploadPurpose) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    formData.append('purpose', purpose);
    return api.postFormData<{ urls: any[] }>(`${EXTRA_PREFIX}/upload-image`, formData);
  }
};


// ============================================
// PAYMENT SERVICE
// ============================================

export const $payment = {
  verify: (reference: string, isGuest: boolean) =>
    api.get<string[]>(`${PAYMENT_PREFIX}/verify?reference=${reference}`, {skipAuth: isGuest}),
};