import { $users } from './services';
import { api } from './client';

export interface SupportProfile {
  user_id: string;
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  full_name?: string;
  avatar_url?: string;
  support_enabled?: boolean;
  accept_tips?: boolean;
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
const CURRENT_USER_PROFILE_ENDPOINT = `${USERS_PREFIX}/me/profile`;
const SUPPORT_PAYMENTS_PREFIX = '/support-payments';
const SUPPORT_CARD_VARIANTS = [
  'Prism Shard',
  'Crystal Glow',
  'Midnight Emerald',
  'Neon Pulse',
  'Royal Sapphire',
  'Chroma Drift',
  'Nova Dark',
  'Cosmic Berry',
  'Liquid Aura',
];

function unwrapSupportProfile(response: unknown): SupportProfile | null {
  if (!response || typeof response !== 'object') return null;

  const candidate = response as any;
  const profile =
    candidate.profile ??
    candidate.user ??
    candidate.data?.profile ??
    candidate.data?.user ??
    candidate.data ??
    candidate;

  if (!profile || typeof profile !== 'object') return null;
  return profile as SupportProfile;
}

function mapSupportProfilePayload(data: Partial<SupportProfile>): Record<string, unknown> {
  const supportEnabled = data.support_enabled ?? data.accept_tips;
  const profileType = data.profile_type === 'organizer' ? 'event_organizer' : data.profile_type;
  const supportCardVariant =
    typeof data.support_card_variant === 'number'
      ? SUPPORT_CARD_VARIANTS[data.support_card_variant] ?? SUPPORT_CARD_VARIANTS[0]
      : data.support_card_variant;

  return {
    support_enabled: supportEnabled,
    profile_type: profileType,
    support_tagline: data.support_tagline ?? data.support_message,
    support_amounts: data.support_amounts,
    support_card_variant: supportCardVariant,
    x_url: data.support_socials?.x,
    instagram_url: data.support_socials?.instagram,
    youtube_url: data.support_socials?.youtube,
    website_url: data.support_socials?.website,
  };
}

function compactPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

export async function getMySupportProfile(): Promise<SupportProfile | null> {
  try {
    const response = await api.get<unknown>(CURRENT_USER_PROFILE_ENDPOINT);
    return unwrapSupportProfile(response);
  } catch {
    try {
      const response = await $users.getCurrent();
      return unwrapSupportProfile(response);
    } catch {
      return null;
    }
  }
}

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
    await api.post<SupportProfile>(
      CURRENT_USER_PROFILE_ENDPOINT,
      compactPayload(mapSupportProfilePayload(data))
    );
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
