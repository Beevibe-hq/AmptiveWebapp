import { $users, $auth, type UserProfile } from './services';
import { api } from './client';



export interface UpdateProfilePayload {
  profile_picture?: string | undefined;
  name?: string | undefined;
  username?: string | undefined;
  bio?: string | undefined;
  country?: string | undefined;
  cover_photo?: string | undefined;
  x_url?: string | undefined;
  instagram_url?: string | undefined;
  linkedin_url?: string | undefined;
  website_url?: string | undefined;
  [key: string]: unknown;
}



export function normalizeUserProfile(user: Partial<UserProfile> | null | undefined): UserProfile | null {
  if (!user) return null;

  const id = String(user.id || user.user_id || '');
  if (!id) return null;

  const name = user.name || (user as any).display_name || (user as any).full_name || '';
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
    is_wallet_setup: user.is_wallet_setup ?? false,
    support_enabled: user.support_enabled ?? (user as any).accept_tips ?? false,
    accept_tips: (user as any).accept_tips ?? user.support_enabled ?? false,
    support_message: (user as any).support_message ?? null,
    support_tagline: (user as any).support_tagline ?? null,
    support_button_text: (user as any).support_button_text ?? null,
    support_amounts: (user as any).support_amounts ?? null,
    support_card_variant: (user as any).support_card_variant ?? null,
    profile_type: (user as any).profile_type ?? null,
    support_socials: (user as any).support_socials ?? null,
    support_avatar_url: (user as any).support_avatar_url ?? null,
    support_banner_url: (user as any).support_banner_url ?? null,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

// Treat null like undefined: PATCH /users/me should only receive fields being set,
// never nulls that could clear (or fail validation on) existing values.
const orOmit = <T,>(value: T | null | undefined): T | undefined => value ?? undefined;

function mapUpdatePayload(data: Partial<UserProfile>): UpdateProfilePayload {
  return {
    profile_picture: orOmit(data.profile_picture) ?? orOmit(data.avatar_url),
    name: orOmit(data.name),
    username: orOmit(data.username),
    bio: orOmit(data.bio),
    country: orOmit(data.country),
    cover_photo: orOmit(data.cover_photo),
    x_url: orOmit(data.x_url),
    instagram_url: orOmit(data.instagram_url),
    linkedin_url: orOmit(data.linkedin_url),
    website_url: orOmit(data.website_url),
  };
}

export async function getProfile(userId?: string): Promise<UserProfile | null> {
  try {
    const response = await $users.getCurrent();
    const profile = normalizeUserProfile(response);
    if (!profile) return null;
    if (userId && profile.id !== userId && profile.user_id !== userId) return null;
    return profile;
  } catch {
    return null;
  }
}

export async function getProfileByUserId(targetUserId: string): Promise<UserProfile | null> {
  try {
    const response = await $users.getById(targetUserId);
    return normalizeUserProfile(response);
  } catch {
    return null;
  }
}

export async function getProfileByUsername(targetUsername: string): Promise<UserProfile | null> {
  try {
    const response = await api.get<UserProfile>(
      `/users/by-username/${encodeURIComponent(targetUsername)}`,
      { skipAuth: true }
    );
    return normalizeUserProfile(response);
  } catch {
    return null;
  }
}

export async function searchProfiles(query: string): Promise<UserProfile[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const normalizeList = (response: any): UserProfile[] => {
    const rawProfiles =
      response?.users ??
      response?.profiles ??
      response?.results ??
      response?.data?.users ??
      response?.data?.profiles ??
      response?.data?.results ??
      response?.data ??
      response;

    if (!Array.isArray(rawProfiles)) return [];
    return rawProfiles
      .map((profile) => normalizeUserProfile(profile))
      .filter(Boolean) as UserProfile[];
  };

  try {
    const response = await api.get<any>(
      `/search/users?q=${encodeURIComponent(trimmed)}`,
      { skipAuth: !api.getToken() }
    );
    return normalizeList(response);
  } catch {
    const usernameProfile = await getProfileByUsername(trimmed.replace(/^@/, ''));
    return usernameProfile ? [usernameProfile] : [];
  }
}

export async function updateProfile(
  data: Partial<UserProfile>
): Promise<{ ok: boolean; error?: string; profile?: UserProfile | null }> {
  try {
    const response = await $users.update(mapUpdatePayload(data));

    return {
      ok: true,
      error: undefined,
      profile: normalizeUserProfile(response),
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

export function isProfileComplete(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  const hasUsername = typeof profile.username === 'string' && profile.username.trim().length >= 3;
  const hasFullName = typeof profile.name === 'string' && profile.name.trim().length > 0;
  const hasDob = typeof profile.dob === 'string' && profile.dob.trim().length > 0;
  return hasUsername && hasFullName && hasDob;
}

export async function checkUsernameAvailability(username: string, _excludeUserId?: string): Promise<boolean> {
  if (username.length < 3) return false;

  try {
    const response = await $auth.checkAvailability({ username });    
    return response.status === true;
  } catch {
    return false;
  }
}

export async function updateProfileAvatar(avatarUrl: string): Promise<{ ok: boolean; error?: string }> {
  const result = await updateProfile({ profile_picture: avatarUrl, avatar_url: avatarUrl });
  return { ok: result.ok, error: result.error };
}

export async function checkUsername(username: string): Promise<{ available: boolean; invalid?: boolean; message?: string }> {
  if (username.trim().length < 3) {
    return { available: false, invalid: true, message: 'Username must be at least 3 characters long.' };
  }

  try {
    const response = await $auth.checkAvailability({ username });
    return {
      available: response.status === true,
      message: response.message,
    };
  } catch (e) {
    return { available: false, message: (e as Error).message };
  }
}

export async function completeProfile(email?: string, p0?: string, p1?: string, payload?: { dob?: string; avatarDataUrl?: string; avatarStyle?: "emoji"; avatarEmoji?: string; avatarBg?: string; }): Promise<{ ok: boolean; message?: string }> {
  return {
    ok: false,
    message: 'Complete profile is not supported by the current backend contract. Use registration plus PATCH /users/me instead.',
  };
}
