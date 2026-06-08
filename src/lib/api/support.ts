import { $users, $auth } from './services';
import { api } from './client';

export interface SupportProfile {
  user_id: string;
  email?: string;
  username?: string;
  name?: string;
  full_name?: string;
  avatar_url?: string;
  support_enabled?: boolean;
  support_message?: string;
  support_tagline?: string;
  support_button_text?: string;
  support_amounts?: number[];
  support_card_variant?: number;
  flutterwave_subaccount_id?: string;
  profile_type?: string | null;
  support_socials?: {
    x?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
  support_avatar_url?: string;
  support_banner_url?: string;
  updated_at?: string;
  [key: string]: unknown;
}

const USERS_PREFIX = '/users';
const SUPPORT_PAYMENTS_PREFIX = '/support-payments';

export async function getSupportProfile(userId: string): Promise<SupportProfile | null> {
  try {
    const response = await $users.getById(userId);
    return response as unknown as SupportProfile;
  } catch {
    return null;
  }
}

export async function getSupportProfileByUsername(username: string): Promise<SupportProfile | null> {
  try {
    const response = await api.get<SupportProfile>(
      `${USERS_PREFIX}/by-username/${encodeURIComponent(username)}`
    );
    return response;
  } catch {
    return null;
  }
}

export async function updateSupportProfile(data: Partial<SupportProfile>): Promise<{ ok: boolean; error?: string }> {
  try {
    await $users.update(data as Record<string, unknown>);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getSupportPayments(
  receiverId: string
): Promise<{ data: unknown[]; error?: string }> {
  try {
    const response = await api.get<unknown[]>(
      `${SUPPORT_PAYMENTS_PREFIX}?receiver_id=${receiverId}&status=completed`
    );
    return { data: response || [] };
  } catch (e) {
    return { data: [], error: (e as Error).message };
  }
}
