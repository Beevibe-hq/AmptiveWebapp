import { $users, $auth, type UserProfile } from './services';


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