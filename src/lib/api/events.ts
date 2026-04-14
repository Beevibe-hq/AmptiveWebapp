import { api, StandardResponse } from './client';

export interface StandaloneEvent {
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
  scheduled_for?: string;
  event_type?: string;
}

export interface StandaloneEventUpdateRequest {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  scheduled_for?: string;
  event_type?: string;
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
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.page_size) query.set('page_size', String(params.page_size));

  const queryString = query.toString();
  const endpoint = queryString ? `/events/?${queryString}` : '/events/';

  const response = await api.get<EventListResponse>(endpoint);

  return response.events || [];
}

export async function getEvent(eventId: string): Promise<StandaloneEvent | null> {
  try {
    const response = await api.get<StandaloneEvent>(`/events/${eventId}`);    
    return response || null;
  } catch {
    return null;
  }
}

export async function createEvent(event: StandaloneEventCreateRequest): Promise<{ id: string; event_id?: string }> {
  const response = await api.post<StandardResponse<StandaloneEvent>>('/events/', event);
  if (response.data) {
    return { id: response.data.event_id, event_id: response.data.event_id };
  }
  return { id: '' };
}

export async function updateEvent(eventId: string, event: StandaloneEventUpdateRequest): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await api.patch<StandardResponse<StandaloneEvent>>(`/events/${eventId}`, event);
    return { ok: response.status, error: response.status ? undefined : response.message };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteEvent(eventId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await api.delete<StandardResponse<null>>(`/events/${eventId}`);
    return { ok: response.status, error: response.status ? undefined : response.message };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getEventsByUser(userId: string): Promise<StandaloneEvent[]> {
  const response = await api.get<EventListResponse>(`/events?userId=${userId}`);
  return response?.events || response || [];
}

export async function getRelatedEvents(userId: string, excludeEventId: string, limit = 4): Promise<StandaloneEvent[]> {
  const response = await api.get<EventListResponse>(
    `/events/?userId=${userId}&excludeId=${excludeEventId}&page_size=${limit}`
  );
  return response?.events || response || [];
}

export async function publishEvent(eventId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await api.post<StandardResponse<null>>(`/events/${eventId}/publish`);
    return { ok: response.status, error: response.status ? undefined : response.message };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getEventOrders(eventId: string): Promise<unknown[]> {
  const response = await api.get<any>(`/events/${eventId}/orders`);
  return response?.data || response || [];
}