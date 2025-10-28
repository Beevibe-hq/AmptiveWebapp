import { createClient } from '@/lib/supabase/client';

export type ProfileRow = {
  user_id: string; // UUID, equals auth.users.id
  full_name?: string | null;
  username?: string | null;
  dob?: string | null; // ISO date string YYYY-MM-DD
  avatar_url?: string | null;
  preferences?: any | null;
  created_at?: string;
  updated_at?: string;
};

export async function getProfileById(userId: string): Promise<ProfileRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) {
    console.warn('[profiles] getProfileById error:', error.message);
    return null;
  }
  return data as ProfileRow;
}

export async function updateProfileAvatar(userId: string, avatarUrl: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function upsertProfile(row: ProfileRow): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const toSave: any = { ...row, updated_at: now };
  if (!toSave.user_id) return { ok: false, error: 'user_id is required' };
  const { error } = await supabase.from('profiles').upsert(toSave, { onConflict: 'user_id' });
  if (error) {
    console.error('[profiles] upsertProfile error:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export function isProfileComplete(p?: ProfileRow | null): boolean {
  if (!p) return false;
  const hasUsername = typeof p.username === 'string' && p.username.trim().length >= 3;
  const hasFullName = typeof p.full_name === 'string' && p.full_name.trim().length > 0;
  const hasDob = typeof p.dob === 'string' && p.dob.trim().length > 0;
  return hasUsername && hasFullName && hasDob;
}
