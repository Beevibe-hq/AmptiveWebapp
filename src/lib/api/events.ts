import { api } from './client';

export interface Event {
  id: string;
  user_id: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  start_time: string;
  end_time: string;
  venue?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cover_image?: string | null;
  location_type?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventWithTickets extends Event {
  tickets?: Ticket[];
}

export interface Ticket {
  id: string;
  event_id: string;
  label: string;
  price: number;
  currency: string;
  benefits?: string[];
  color_theme?: string | null;
  quantity?: number | null;
  is_physical?: boolean;
  created_at?: string;
}

export type { Ticket as EventTicket };

export async function listEvents(params?: {
  limit?: number;
  offset?: number;
  userId?: string;
}): Promise<Event[]> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.userId) query.set('userId', params.userId);

  return api.get<Event[]>(`/events?${query}`);
}

export async function getEvent(eventId: string): Promise<EventWithTickets | null> {
  try {
    return await api.get<EventWithTickets>(`/events/${eventId}`);
  } catch {
    return null;
  }
}

export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
  return api.post<{ id: string }>('/events', event);
}

export async function updateEvent(eventId: string, event: Partial<Event>): Promise<{ ok: boolean; error?: string }> {
  try {
    return await api.put<{ ok: boolean; error?: string }>(`/events/${eventId}`, event);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteEvent(eventId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    return await api.delete<{ ok: boolean; error?: string }>(`/events/${eventId}`);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getEventsByUser(userId: string): Promise<Event[]> {
  return api.get<Event[]>(`/events?userId=${userId}`);
}

export async function getRelatedEvents(userId: string, excludeEventId: string, limit = 4): Promise<Event[]> {
  return api.get<Event[]>(`/events?userId=${userId}&excludeId=${excludeEventId}&limit=${limit}`);
}