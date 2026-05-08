import { $tickets } from './services';

export type TicketTheme = 'silver' | 'bronze' | 'gold' | 'platinum' | 'obsidian';

export interface EventTicket {
  id: string;
  event_id: string;
  label: string;
  price: number;
  currency: string;
  quantity_total: number | null;
  quantity_sold: number;
  quantity_remaining: number;
  reserved_quantity: number;
  is_active: boolean;
  benefits?: string[];
  color_theme?: TicketTheme | null;
  is_physical?: boolean;
  created_at?: string;
  quantity?: number;
}

export interface CheckoutItem {
  ticket_type_id: string;
  quantity: number;
}

export interface Attendee {
  ticket_type_id: string;
  name: string;
  email?: string;
  phone?: string;
  is_me?: boolean;
}

export interface CheckoutRequest {
  items: CheckoutItem[];
  attendees: Attendee[];
  wants_physical_delivery?: boolean;
  callback_url?: string;
  metadata?: Record<string, unknown>;
  buyer_email?: string;
  buyer_name?: string;
  buyer_phone?: string;
}

export interface CheckoutResponse {
  purchase: {
    status: string;
    amount: number;
  };
  payment_url: string;
  access_code: string;
}

export interface TicketCreateInput {
  label: string;
  price: number;
  currency: string;
  quantity_total: number | null;
  benefits?: string[];
  color_theme?: string | null;
  is_physical?: boolean;
}

export async function getTicketsForEvent(eventId: string): Promise<EventTicket[]> {
  const response = await $tickets.getForEvent(eventId);
  return response.tickets as EventTicket[];
}

export async function getTicket(ticketId: string): Promise<EventTicket | null> {
  try {
    const response = await $tickets.getById(ticketId);    
    return (response as EventTicket) ?? null;
  } catch {
    return null;
  }
}

export async function createTicket(ticket: TicketCreateInput, eventId: string): Promise<EventTicket> {
  return $tickets.create(eventId, ticket) as unknown as Promise<EventTicket>;
}

export async function createTickets(eventId: string, tickets: TicketCreateInput[]): Promise<{ ok: boolean; error?: string }> {
  try {
    for (const ticket of tickets) {
      await $tickets.create(eventId, ticket);
    }
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateTicket(ticketId: string, ticket: Partial<EventTicket>): Promise<{ ok: boolean; error?: string }> {
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

export async function checkoutTicket(eventId: string, request: CheckoutRequest, options?: { skipAuth?: boolean }): Promise<CheckoutResponse> {
  return $tickets.checkout(eventId, request, options) as unknown as Promise<CheckoutResponse>;
}

export async function walletPayTicket(eventId: string, request: CheckoutRequest): Promise<CheckoutResponse> {
  return $tickets.walletPay(eventId, request) as unknown as Promise<CheckoutResponse>;
}
