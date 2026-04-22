import { api } from './client';

export interface UserProfile {
  user_id: string;
  name?: string | null;
  username?: string | null;
  dob?: string | null;
  avatar_url?: string | null;
  preferences?: unknown | null;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    return await api.get<UserProfile>(`/profiles/${userId}`);
  } catch {
    return null;
  }
}

export async function updateProfile(userId: string, data: Partial<UserProfile>): Promise<{ ok: boolean; error?: string }> {
  try {
    return await api.put<{ ok: boolean; error?: string }>(`/profiles/${userId}`, data);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function upsertProfile(profile: UserProfile): Promise<{ ok: boolean; error?: string }> {
  try {
    return await api.post<{ ok: boolean; error?: string }>('/profiles', profile);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function isProfileComplete(profile: UserProfile | null): boolean {
  console.log(profile, "======");
  
  if (!profile) return false;
  const hasUsername = typeof profile.username === 'string' && profile.username.trim().length >= 3;
  const hasFullName = typeof profile.name === 'string' && profile.name.trim().length > 0;
  const hasDob = typeof profile.dob === 'string' && profile.dob.trim().length > 0;
  return hasUsername && hasFullName && hasDob;
}

export async function checkUsernameAvailability(username: string, excludeUserId?: string): Promise<boolean> {
  if (username.length < 3) return false;

  try {
    const params = new URLSearchParams({ username });
    if (excludeUserId) params.append('excludeUserId', excludeUserId);
    const result = await api.get<{ available: boolean }>(`/profiles/check-username?${params}`);
    return result.available;
  } catch {
    return false;
  }
}

export async function updateProfileAvatar(userId: string, avatarUrl: string): Promise<{ ok: boolean; error?: string }> {
  return updateProfile(userId, { avatar_url: avatarUrl });
}

export async function checkUsername(username: string): Promise<{ available: boolean }> {
  try {
    const result = await api.get<{ available: boolean }>(`/profiles/check-username?username=${username}`);
    return result;
  } catch {
    return { available: false };
  }
}

export async function completeProfile(
  email: string,
  fullName: string,
  username: string,
  options?: { dob?: string; avatarDataUrl?: string; avatarStyle?: 'emoji'; avatarEmoji?: string; avatarBg?: string }
): Promise<{ ok: boolean; message?: string }> {
  try {
    return api.post<{ ok: boolean; message?: string }>('/auth/complete-profile', {
      email,
      fullName,
      username,
      ...options,
    });
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}