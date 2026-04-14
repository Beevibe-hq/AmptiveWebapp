import { api, StandardResponse } from './client';

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
  created_at?: string;
  updated_at?: string;
}

export interface UpdateProfilePayload {
  profile_picture?: string | null;
  name?: string | null;
  username?: string | null;
  bio?: string | null;
  country?: string | null;
  cover_photo?: string | null;
  x_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
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

export function normalizeUserProfile(user: Partial<UserProfile> | null | undefined): UserProfile | null {
  if (!user) return null;

  const id = String(user.id || user.user_id || '');
  if (!id) return null;

  const name = user.name || '';
  const username = user.username || '';
  const profilePicture = user.profile_picture ?? user.avatar_url ?? null;

  return {
    id,
    user_id: id,
    name,
    username,
    email: user.email ?? null,
    phone_number: user.phone_number ?? null,
    dob: user.dob ?? null,
    profile_picture: profilePicture,
    avatar_url: profilePicture,
    country: user.country ?? null,
    bio: user.bio ?? null,
    cover_photo: user.cover_photo ?? null,
    website_url: user.website_url ?? null,
    instagram_url: user.instagram_url ?? null,
    linkedin_url: user.linkedin_url ?? null,
    x_url: user.x_url ?? null,
    followers_count: user.followers_count ?? 0,
    following_count: user.following_count ?? 0,
    has_hosted_shows: user.has_hosted_shows ?? false,
    has_hosted_events: user.has_hosted_events ?? false,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function mapUpdatePayload(data: Partial<UserProfile>): UpdateProfilePayload {
  return {
    profile_picture: data.profile_picture ?? data.avatar_url ?? undefined,
    name: data.name ?? undefined,
    username: data.username ?? undefined,
    bio: data.bio ?? undefined,
    country: data.country ?? undefined,
    cover_photo: data.cover_photo ?? undefined,
    x_url: data.x_url ?? undefined,
    instagram_url: data.instagram_url ?? undefined,
    linkedin_url: data.linkedin_url ?? undefined,
    website_url: data.website_url ?? undefined,
  };
}

export async function getProfile(userId?: string): Promise<UserProfile | null> {
  try {
    const response = await api.get<StandardResponse<UserProfile>>('/users/me');
    const profile = normalizeUserProfile(response.data);
    if (!profile) return null;
    if (userId && profile.id !== userId && profile.user_id !== userId) return null;
    return profile;
  } catch {
    return null;
  }
}

export async function getProfileByUserId(targetUserId: string): Promise<UserProfile | null> {
  try {
    const response = await api.get<StandardResponse<UserProfile>>(`/users/${targetUserId}`);
    return normalizeUserProfile(response.data);
  } catch {
    return null;
  }
}

export async function updateProfile(
  _userId: string,
  data: Partial<UserProfile>
): Promise<{ ok: boolean; error?: string; profile?: UserProfile | null }> {
  try {
    const response = await api.request<StandardResponse<UserProfile>>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(mapUpdatePayload(data)),
    });

    return {
      ok: response.status,
      error: response.status ? undefined : response.message,
      profile: normalizeUserProfile(response.data),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function upsertProfile(_profile: UserProfile): Promise<{ ok: boolean; error?: string }> {
  return {
    ok: false,
    error: 'Profile upsert is not supported by the current backend. Use PATCH /users/me instead.',
  };
}

export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;
  const hasUsername = typeof profile.username === 'string' && profile.username.trim().length >= 3;
  const hasFullName = typeof profile.name === 'string' && profile.name.trim().length > 0;
  const hasDob = typeof profile.dob === 'string' && profile.dob.trim().length > 0;
  return hasUsername && hasFullName && hasDob;
}

export async function checkUsernameAvailability(username: string, _excludeUserId?: string): Promise<boolean> {
  if (username.length < 3) return false;

  try {
    const response = await api.post<StandardResponse<AvailabilityData>>('/auth/check-availability', { username });
    const available = firstBoolean(response.data);

    if (available !== null) return available;

    return response.status && /available/i.test(response.message);
  } catch {
    return false;
  }
}

export async function updateProfileAvatar(userId: string, avatarUrl: string): Promise<{ ok: boolean; error?: string }> {
  const result = await updateProfile(userId, { profile_picture: avatarUrl, avatar_url: avatarUrl });
  return { ok: result.ok, error: result.error };
}

export async function checkUsername(username: string): Promise<{ available: boolean; invalid?: boolean; message?: string }> {
  if (username.trim().length < 3) {
    return { available: false, invalid: true, message: 'Username must be at least 3 characters long.' };
  }

  try {
    const response = await api.post<StandardResponse<AvailabilityData>>('/auth/check-availability', { username });
    const available = firstBoolean(response.data);

    if (available !== null) {
      return { available, message: response.message };
    }

    if (response.status && /available/i.test(response.message)) {
      return { available: true, message: response.message };
    }

    if (/invalid/i.test(response.message)) {
      return { available: false, invalid: true, message: response.message };
    }

    return { available: false, message: response.message };
  } catch (e) {
    return { available: false, message: (e as Error).message };
  }
}

export async function completeProfile(): Promise<{ ok: boolean; message?: string }> {
  return {
    ok: false,
    message: 'Complete profile is not supported by the current backend contract. Use registration plus PATCH /users/me instead.',
  };
}
