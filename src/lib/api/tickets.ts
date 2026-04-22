import { api } from './client';

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

export async function getTicketsForEvent(eventId: string): Promise<Ticket[]> {
  return api.get<Ticket[]>(`/events/${eventId}/tickets`);
}

export async function getTicket(ticketId: string): Promise<Ticket | null> {
  try {
    return await api.get<Ticket>(`/tickets/${ticketId}`);
  } catch {
    return null;
  }
}

export async function createTicket(ticket: Omit<Ticket, 'id' | 'created_at'>): Promise<{ id: string }> {
  return api.post<{ id: string }>(`/events/${ticket.event_id}/tickets`, ticket);
}

export async function createTickets(eventId: string, tickets: Omit<Ticket, 'id' | 'created_at'>[]): Promise<{ ok: boolean; error?: string }> {
  try {
    return await api.post<{ ok: boolean; error?: string }>(`/events/${eventId}/tickets`, tickets);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateTicket(ticketId: string, ticket: Partial<Ticket>): Promise<{ ok: boolean; error?: string }> {
  try {
    return await api.put<{ ok: boolean; error?: string }>(`/tickets/${ticketId}`, ticket);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteTicket(ticketId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    return await api.delete<{ ok: boolean; error?: string }>(`/tickets/${ticketId}`);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteTickets(ticketIds: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    return await api.post<{ ok: boolean; error?: string }>('/tickets/bulk-delete', { ids: ticketIds });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}