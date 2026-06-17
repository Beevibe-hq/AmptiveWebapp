import { $events } from './services';
import type { Venue } from './venues';

export interface StandaloneEvent {
  event_tickets: any;
  ticket_types?: any[];
  event_id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  status: string;
  scheduled_for?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  stream_url?: string | null;
  stream_key?: string | null;
  playback_url?: string | null;
  livestream_id?: string | null;
  event_type?: string | null;
  show_type?: 'free' | 'paid';
  viewer_count?: number;
  peak_viewers?: number;
  reaction_count?: number;
  comment_count?: number;
  going_count?: number;
  duration_seconds?: number | null;
  host?: UserSlim;
  co_hosts?: UserSlim[];
  community?: CommunitySlim | null;
  tags?: TagSlim[];
  created_at?: string;
  updated_at?: string;
  hand_raising?: boolean;
  location?: {
    type?: 'physical' | 'online' | null;
    venue?: string;
    city?: string;
    latitude?: number;
    longitude?: number
  };
  venue_id?: string | null;
  venue?: Venue | null;
}

export interface UserSlim {
  user_id: string;
  username: string;
  name: string;
  profile_picture?: string | null;
}

export interface CommunitySlim {
  community_id: string;
  name: string;
  description?: string | null;
  cover_image?: string | null;
  member_count?: number;
}

export interface TagSlim {
  tag_id: string;
  name: string;
}

export interface StandaloneEventCreateRequest {
  title: string;
  description?: string;
  thumbnail_url?: string;
  category?: string;
  show_type: 'free' | 'paid';
  price?: number;
  scheduled_for?: string;
  ended_at?: string;
  community_id?: string;
  tag_ids?: string[];
  co_host_ids?: string[];
  hand_raising: boolean;
  allow_whispers: boolean;
  venue_id?: string | null;
}

export interface StandaloneEventUpdateRequest {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  category?: string;
  show_type?: 'free' | 'paid';
  price?: number;
  scheduled_for?: string;
  ended_at?: string;
  community_id?: string;
  tag_ids?: string[];
  co_host_ids?: string[];
  hand_raising?: boolean;
  allow_whispers?: boolean;
  venue_id?: string | null;
}

export type Event = StandaloneEvent;

export interface EventListResponse {
  events: StandaloneEvent[];
  page: number;
  page_size: number;
  total_count: number;
  has_next: boolean;
  has_prev: boolean;
}

export async function listEvents(params?: {
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<StandaloneEvent[]> {
  const query: Record<string, string> = {};
  if (params?.status) query.status = params.status;
  if (params?.page) query.page = String(params.page);
  if (params?.page_size) query.page_size = String(params.page_size);

  const response = await $events.list(query);
  return (response.events || []) as StandaloneEvent[];
}

export async function getEvent(eventId: string): Promise<StandaloneEvent | null> {
  try {
    const response = await $events.getById(eventId) as StandaloneEvent;    
    return response || null;
  } catch {
    return null;
  }
}

export async function createEvent(event: StandaloneEventCreateRequest): Promise<{ id: string; event_id?: string }> {
  const response = await $events.create(event) as { event_id?: string };
  if (response && response.event_id) {
    return { id: response.event_id, event_id: response.event_id };
  }
  return { id: '' };
}

export async function updateEvent(eventId: string, event: StandaloneEventUpdateRequest): Promise<{ ok: boolean; error?: string }> {
  try {
    await $events.update(eventId, event);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteEvent(eventId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await $events.delete(eventId);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getEventsByUser(userId?: string): Promise<StandaloneEvent[]> {
  if (userId) {
    const response = await $events.list({ userId });
    return (response?.events || []) as StandaloneEvent[];
  }
  const response = await $events.getForCurrentUser();
  return (response?.events || []) as StandaloneEvent[];
}

export async function getRelatedEvents(userId: string, excludeEventId: string, limit = 4): Promise<StandaloneEvent[]> {
  const response = await $events.list({
    userId,
    excludeId: excludeEventId,
    page_size: String(limit),
  });
  return (response?.events || []) as StandaloneEvent[];
}

export async function publishEvent(eventId: string, scheduledDate: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await $events.publish(eventId, { scheduled_date: scheduledDate, reason: '' });
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getEventOrders(eventId: string): Promise<unknown[]> {
  const response = await $events.getOrders(eventId);
  return (response as { data?: unknown[] })?.data || (response as unknown[]) || [];
}
