import { api } from '../client';
import type { StandardResponse } from '../client';

export interface UserProfile {
  id: string;
  user_id?: string;
  email?: string;
  username?: string;
  name?: string;
  dob?: string;
  phone_number?: string;
  profile_picture?: string;
  bio?: string;
  cover_image?: string;
  linkedin_url?: string;
  website_url?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
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

const USERS_PREFIX = '/users';
const AUTH_PREFIX = '/auth';
const EVENTS_PREFIX = '/events';
const COMMUNITIES_PREFIX = '/communities';
const TICKETS_PREFIX = '/tickets';
const PURCHASES_PREFIX = '/purchases';
const STORAGE_PREFIX = '/storage';

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
    return api.get<{ events: unknown[]; total: number }>(endpoint);
  },

  getById: (eventId: string) =>
    api.get<unknown>(`${EVENTS_PREFIX}/${eventId}`),

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
    return api.get<{ communities: unknown[]; total: number }>(endpoint);
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
    api.get<unknown>(`${TICKETS_PREFIX}/${ticketId}`),

  getForEvent: (eventId: string) =>
    api.get<unknown>(`${TICKETS_PREFIX}/events/${eventId}/list`),

  create: (eventId: string, tickets: unknown) =>
    api.post<unknown>(`${TICKETS_PREFIX}/event/${eventId}/create`, tickets),

  update: (ticketId: string, ticket: unknown) =>
    api.put<unknown>(`${TICKETS_PREFIX}/${ticketId}/update`, ticket),

  delete: (ticketId: string) =>
    api.delete<unknown>(`${TICKETS_PREFIX}/${ticketId}/deactivate`),

  bulkDelete: (ticketIds: string[]) =>
    api.post<unknown>(`${TICKETS_PREFIX}/bulk-delete`, { ids: ticketIds }),
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
    api.get<string[]>(`${STORAGE_PREFIX}/${bucket}`),

  upload: (bucket: string, path: string, file: File) =>
    api.uploadFile(bucket, path, file),
};

