import { $tickets } from './services';

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
  return $tickets.create(eventId, []) as unknown as Promise<Ticket[]>;
}

export async function getTicket(ticketId: string): Promise<Ticket | null> {
  try {
    return await $tickets.getById(ticketId) as Ticket;
  } catch {
    return null;
  }
}

export async function createTicket(ticket: Omit<Ticket, 'id' | 'created_at'>): Promise<{ id: string }> {
  return { id: '' };
}

export async function createTickets(eventId: string, tickets: Omit<Ticket, 'id' | 'created_at'>[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await $tickets.create(eventId, tickets);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateTicket(ticketId: string, ticket: Partial<Ticket>): Promise<{ ok: boolean; error?: string }> {
  try {
    await $tickets.update(ticketId, ticket);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteTicket(ticketId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await $tickets.delete(ticketId);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteTickets(ticketIds: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await $tickets.bulkDelete(ticketIds);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}