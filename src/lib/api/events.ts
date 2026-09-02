import { $events, $tickets } from './services';
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

/** The timing fields any event-shaped record needs for the helpers below. */
export type EventTiming = {
  status?: string | null;
  scheduled_for?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
};

const toTime = (iso?: string | null): number => {
  if (!iso) return Number.NaN;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? Number.NaN : time;
};

/** Statuses that close an event regardless of its clock. */
const CLOSED_STATUSES = new Set(['ended', 'completed', 'cancelled', 'canceled', 'past', 'archived']);

/**
 * When the event finishes, as a timestamp. An explicit `ended_at` wins; otherwise
 * the start plus its duration; otherwise the start itself. NaN when nothing is known.
 */
export function getEventEndTime(event: EventTiming): number {
  const ended = toTime(event.ended_at);
  if (!Number.isNaN(ended)) return ended;

  const start = toTime(event.started_at ?? event.scheduled_for);
  if (Number.isNaN(start)) return Number.NaN;

  const duration = event.duration_seconds;
  return duration && duration > 0 ? start + duration * 1000 : start;
}

/**
 * True once the event is over. Sole gate on ticket sales, so every surface agrees.
 * An event with no usable timing stays open rather than being wrongly closed.
 */
export function isEventPast(event: EventTiming, now: number = Date.now()): boolean {
  if (event.status && CLOSED_STATUSES.has(event.status.toLowerCase())) return true;
  const end = getEventEndTime(event);
  return !Number.isNaN(end) && end <= now;
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

const HIDDEN_PUBLIC_EVENT_STATUSES = new Set([
  'archived',
  'cancelled',
  'canceled',
  'deleted',
  'draft',
  'inactive',
  'removed',
]);

const isPubliclyVisibleEvent = (event: StandaloneEvent) => {
  const status = String(event.status || '').trim().toLowerCase();
  return !status || !HIDDEN_PUBLIC_EVENT_STATUSES.has(status);
};

export async function listEvents(params?: {
  status?: string;
  communityId?: string;
  page?: number;
  page_size?: number;
}): Promise<StandaloneEvent[]> {
  const query: Record<string, string> = {};
  if (params?.status) query.status = params.status;
  if (params?.communityId) query.communityId = params.communityId;
  if (params?.page) query.page = String(params.page);
  if (params?.page_size) query.page_size = String(params.page_size);

  const response = await $events.list(query);
  const events = (response.events || []) as StandaloneEvent[];
  return params?.status ? events : events.filter(isPubliclyVisibleEvent);
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

export async function getEventsByUser(userId?: string, params?: { communityId?: string; page?: number; page_size?: number }): Promise<StandaloneEvent[]> {
  const query: Record<string, string> = {};
  if (params?.communityId) query.communityId = params.communityId;
  if (params?.page) query.page = String(params.page);
  if (params?.page_size) query.page_size = String(params.page_size);

  if (userId) {
    const response = await $events.list({ userId, ...query });
    return (response?.events || []) as StandaloneEvent[];
  }
  const response = await $events.getForCurrentUser(Object.keys(query).length ? query : undefined);
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
  const response = await $tickets.getOrdersForEvent(eventId);
  if (Array.isArray(response)) return response;
  const payload = response as { data?: unknown[] | { orders?: unknown[]; purchases?: unknown[]; tickets?: unknown[] }; orders?: unknown[]; purchases?: unknown[]; tickets?: unknown[] };
  if (Array.isArray(payload.orders)) return payload.orders;
  if (Array.isArray(payload.purchases)) return payload.purchases;
  if (Array.isArray(payload.tickets)) return payload.tickets;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.orders)) return payload.data.orders;
  if (Array.isArray(payload.data?.purchases)) return payload.data.purchases;
  if (Array.isArray(payload.data?.tickets)) return payload.data.tickets;
  return [];
}
