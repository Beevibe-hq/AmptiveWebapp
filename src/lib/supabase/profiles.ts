import { createClient } from '@/lib/supabase/client';

export type ProfileRow = {
  user_id: string; // UUID, equals auth.users.id
  full_name?: string | null;
  username?: string | null;
  dob?: string | null; // ISO date string YYYY-MM-DD
  avatar_url?: string | null;
  preferences?: any | null;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
  support_enabled?: boolean;
  support_message?: string | null;
  support_button_text?: string | null;
  support_amounts?: number[] | null;
  flutterwave_subaccount_id?: string | null;
  profile_type?: 'creator' | 'business' | 'organizer' | null;
  support_avatar_url?: string | null;
  support_banner_url?: string | null;
  support_tagline?: string | null;
  support_card_variant?: number | null;
  support_socials?: {
    x?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  } | null;
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
  
  // Clean the object: remove created_at but KEEP email if it exists
  const { created_at, ...cleanRow } = row as any;
  const toSave = { ...cleanRow, updated_at: now };

  if (!toSave.user_id) return { ok: false, error: 'user_id is required' };
  
  try {
    const { error } = await supabase.from('profiles').upsert(toSave, { onConflict: 'user_id' });
    if (error) {
      console.error('[profiles] upsertProfile database error:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('[profiles] upsertProfile catch error:', e);
    return { ok: false, error: e.message || 'Unknown error' };
  }
}

export async function updateProfile(userId: string, updates: Partial<ProfileRow>): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  
  // Clean updates: remove created_at and user_id, but KEEP email
  const { created_at, user_id, ...cleanUpdates } = updates as any;
  const toSave = { ...cleanUpdates, updated_at: now };

  try {
    const { error } = await supabase
      .from('profiles')
      .update(toSave)
      .eq('user_id', userId);

    if (error) {
      console.error('[profiles] updateProfile database error:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('[profiles] updateProfile catch error:', e);
    return { ok: false, error: e.message || 'Unknown error' };
  }
}

export function isProfileComplete(p?: ProfileRow | null): boolean {
  if (!p) return false;
  const hasUsername = typeof p.username === 'string' && p.username.trim().length >= 3;
  const hasFullName = typeof p.full_name === 'string' && p.full_name.trim().length > 0;
  const hasDob = typeof p.dob === 'string' && p.dob.trim().length > 0;
  return hasUsername && hasFullName && hasDob;
}

export async function checkUsernameAvailability(username: string, currentUserId: string): Promise<boolean> {
  if (username.length < 3) return false;

  const supabase = createClient();
  const { count, error } = await supabase
    .from('profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('username', username)
    .neq('user_id', currentUserId); // Exclude current user

  if (error) {
    console.error('Error checking username:', error);
    return false; // Assume unavailable on error to be safe, or handle differently
  }

  return count === 0;
}
