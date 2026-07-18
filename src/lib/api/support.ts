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
const SUPPORT_PREFIX = '/support';
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

// The backend validates social links as URLs; users often type bare handles like
// "instagram.com/me". Prefix a scheme and drop empties so PATCH/POST don't 422.
function normalizeSocialUrl(platform: 'x' | 'instagram' | 'youtube' | 'website', value?: string): string | undefined {
  let trimmed = String(value ?? '').trim();
  if (!trimmed) return undefined;

  // Remove query parameters and trailing slashes
  trimmed = trimmed.split('?')[0].replace(/\/+$/, '');

  // Strip leading @
  if (trimmed.startsWith('@')) {
    trimmed = trimmed.substring(1);
  }

  if (platform === 'website') {
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  // Extract handle if they pasted a full URL
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split('/').filter(Boolean);
      const handle = parts[parts.length - 1];
      if (handle) {
        trimmed = handle;
      }
    } catch {
      const segments = trimmed.split('/');
      trimmed = segments[segments.length - 1] || trimmed;
    }
  } else {
    // If they typed something like "instagram.com/username"
    const segments = trimmed.split('/');
    trimmed = segments[segments.length - 1] || trimmed;
  }

  trimmed = trimmed.trim();

  if (platform === 'x') {
    return `https://x.com/${trimmed}`;
  }
  if (platform === 'instagram') {
    return `https://instagram.com/${trimmed}`;
  }
  if (platform === 'youtube') {
    return `https://youtube.com/@${trimmed}`;
  }

  return trimmed;
}

function mapSupportProfilePayload(data: Partial<SupportProfile>): Record<string, unknown> {
  const supportEnabled = data.support_enabled ?? data.accept_tips;
  const profileType = data.profile_type === 'organizer' ? 'event_organizer' : data.profile_type;
  const supportCardVariant =
    typeof data.support_card_variant === 'number'
      ? SUPPORT_CARD_VARIANTS[data.support_card_variant] ?? SUPPORT_CARD_VARIANTS[0]
      : data.support_card_variant;

  return {
    full_name: data.full_name,
    support_avatar_url: data.support_avatar_url,
    support_banner_url: data.support_banner_url,
    support_enabled: supportEnabled,
    profile_type: profileType,
    support_message: data.support_message ?? data.support_tagline,
    support_tagline: data.support_tagline ?? data.support_message,
    support_amounts: data.support_amounts,
    support_card_variant: supportCardVariant,
    // When socials are provided, an emptied field maps to null so the backend clears it;
    // when the caller sends no socials at all, the fields are omitted and left untouched.
    x_url: data.support_socials ? normalizeSocialUrl('x', data.support_socials.x) ?? null : undefined,
    instagram_url: data.support_socials ? normalizeSocialUrl('instagram', data.support_socials.instagram) ?? null : undefined,
    youtube_url: data.support_socials ? normalizeSocialUrl('youtube', data.support_socials.youtube) ?? null : undefined,
    website_url: data.support_socials ? normalizeSocialUrl('website', data.support_socials.website) ?? null : undefined,
  };
}

function compactPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

// The backend stores the card variant as a name ("Prism Shard") and the profile type as
// "event_organizer"; the UI works with a numeric variant index and "organizer".
function normalizeSupportRecord(record: SupportProfile | null): SupportProfile | null {
  if (!record) return null;
  const rawVariant = record.support_card_variant as unknown;
  const variantIndex = typeof rawVariant === 'number'
    ? rawVariant
    : Math.max(0, SUPPORT_CARD_VARIANTS.indexOf(String(rawVariant ?? '')));
  
  const fullName = record.full_name || record.name || (record as any).display_name || '';

  return {
    ...record,
    full_name: fullName,
    name: fullName,
    profile_type: record.profile_type === 'event_organizer' ? 'organizer' : record.profile_type,
    support_card_variant: variantIndex,
    support_message: (record.support_message as string) || record.support_tagline || '',
    support_socials: {
      x: (record as any).x_url || record.support_socials?.x || undefined,
      instagram: (record as any).instagram_url || record.support_socials?.instagram || undefined,
      youtube: (record as any).youtube_url || record.support_socials?.youtube || undefined,
      website: (record as any).website_url || record.support_socials?.website || undefined,
    },
  };
}

export function mergeSupportProfileIdentity(
  record: SupportProfile,
  identity: Record<string, unknown> | null | undefined
): SupportProfile {
  if (!identity) return record;

  const identityId = String(identity.user_id || identity.id || '');
  const fullName = String(
    record.full_name ||
    record.name ||
    identity.full_name ||
    identity.name ||
    identity.display_name ||
    identity.username ||
    ''
  );
  const avatarUrl = String(
    record.avatar_url || identity.avatar_url || identity.profile_picture || ''
  );

  return {
    ...identity,
    ...record,
    user_id: record.user_id || identityId,
    email: record.email || String(identity.email || ''),
    username: record.username || String(identity.username || ''),
    name: fullName,
    full_name: fullName,
    avatar_url: avatarUrl || undefined,
    support_avatar_url:
      record.support_avatar_url || String(identity.support_avatar_url || '') || undefined,
    support_banner_url:
      record.support_banner_url ||
      String(identity.support_banner_url || identity.cover_photo || '') ||
      undefined,
    support_socials: {
      x: record.support_socials?.x || String(identity.x_url || '') || undefined,
      instagram:
        record.support_socials?.instagram || String(identity.instagram_url || '') || undefined,
      youtube:
        record.support_socials?.youtube || String(identity.youtube_url || '') || undefined,
      website:
        record.support_socials?.website || String(identity.website_url || '') || undefined,
    },
  };
}

export async function getMySupportProfile(): Promise<SupportProfile | null> {
  try {
    const response = await api.get<unknown>(`${SUPPORT_PREFIX}/`);
    const normalized = normalizeSupportRecord(unwrapSupportProfile(response));
    if (normalized) {
      try {
        const currentUser = await $users.getCurrent();
        return mergeSupportProfileIdentity(
          normalized,
          currentUser as unknown as Record<string, unknown>
        );
      } catch {
        return normalized;
      }
    }
  } catch {
    // No support profile yet, or the endpoint failed — fall back to the base user record.
  }
  try {
    const response = await $users.getCurrent();
    return normalizeSupportRecord(unwrapSupportProfile(response));
  } catch {
    return null;
  }
}

export async function getSupportProfile(userId: string): Promise<SupportProfile | null> {
  try {
    const response = await $users.getById(userId);
    return normalizeSupportRecord(unwrapSupportProfile(response));
  } catch {
    return null;
  }
}

export async function getSupportProfileByUsername(username: string): Promise<SupportProfile | null> {
  try {
    const response = await api.get<unknown>(
      `${USERS_PREFIX}/by-username/${encodeURIComponent(username)}`
    );
    return normalizeSupportRecord(unwrapSupportProfile(response));
  } catch {
    return null;
  }
}

export async function updateSupportProfile(data: Partial<SupportProfile>): Promise<{ ok: boolean; error?: string }> {
  const payload = compactPayload(mapSupportProfilePayload(data));

  try {
    await api.patch<SupportProfile>(`${SUPPORT_PREFIX}/`, payload);
    return { ok: true };
  } catch (patchError: any) {
    // Only attempt POST creation if the record is explicitly not found (404)
    const isNotFound = patchError?.status === 404 || 
                       patchError?.status_code === 404 ||
                       String(patchError?.message || '').toLowerCase().includes('not found');
    
    if (isNotFound) {
      try {
        await api.post<SupportProfile>(`${SUPPORT_PREFIX}/`, {
          profile_type: 'creator',
          support_enabled: data.support_enabled ?? true,
          support_tagline: data.support_tagline ?? data.support_message ?? '',
          support_card_variant: SUPPORT_CARD_VARIANTS[0],
          support_amounts: data.support_amounts ?? [],
          ...payload,
        });
        return { ok: true };
      } catch (createError) {
        return { ok: false, error: (createError as Error).message };
      }
    }
    
    // Bubble up the actual validation or server error from the PATCH attempt
    return { ok: false, error: patchError.message || 'Failed to update support profile' };
  }
}

export async function getSupportProfileBySlug(slug: string): Promise<SupportProfile | null> {
  try {
    const response = await api.get<unknown>(
      `${SUPPORT_PREFIX}/${encodeURIComponent(slug)}`,
      { skipAuth: true }
    );
    const profile = normalizeSupportRecord(unwrapSupportProfile(response));
    return profile;
  } catch {
    return null;
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
