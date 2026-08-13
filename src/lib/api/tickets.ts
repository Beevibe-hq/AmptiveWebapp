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
  has_early_bird?: boolean;
  early_bird_units?: number;
  early_bird_discount_percentage?: number;
  early_bird_discount_percent?: number | null;
  early_bird_max_count?: number | null;
  status?: string | null;
  availability?: string | null;
  sold_out?: boolean;
  is_sold_out?: boolean;
  active?: boolean;
  remaining?: number | string | null;
  remaining_quantity?: number | string | null;
  available?: number | string | null;
  available_quantity?: number | string | null;
  capacity?: number | string | null;
  total_quantity?: number | string | null;
  sold?: number | string | null;
  sold_quantity?: number | string | null;
  tickets_sold?: number | string | null;
  stock?: number | string | null;
  inventory?: number | string | null;
  available_count?: number | string | null;
  remaining_count?: number | string | null;
  purchased_count?: number | string | null;
  purchase_count?: number | string | null;
}

type TicketAvailabilityData = {
  is_active?: boolean;
  active?: boolean;
  sold_out?: boolean;
  is_sold_out?: boolean;
  status?: unknown;
  availability?: unknown;
  quantity_remaining?: unknown;
  remaining_quantity?: unknown;
  remaining?: unknown;
  available_quantity?: unknown;
  available?: unknown;
  available_count?: unknown;
  quantity_total?: unknown;
  quantity?: unknown;
  capacity?: unknown;
  total_quantity?: unknown;
  stock?: unknown;
  inventory?: unknown;
  quantity_sold?: unknown;
  sold?: unknown;
  sold_quantity?: unknown;
  tickets_sold?: unknown;
  purchased_count?: unknown;
  purchase_count?: unknown;
  reserved_quantity?: unknown;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function getTicketRemaining(ticket: TicketAvailabilityData): number | null {
  const directRemaining = toFiniteNumber(
    ticket.quantity_remaining ??
    ticket.remaining_quantity ??
    ticket.remaining ??
    ticket.remaining_count ??
    ticket.available_quantity ??
    ticket.available ??
    ticket.available_count
  );

  if (directRemaining !== null) {
    return directRemaining;
  }

  const total = toFiniteNumber(
    ticket.quantity_total ??
    ticket.quantity ??
    ticket.capacity ??
    ticket.total_quantity ??
    ticket.stock ??
    ticket.inventory
  );
  const sold = toFiniteNumber(
    ticket.quantity_sold ??
    ticket.sold ??
    ticket.sold_quantity ??
    ticket.tickets_sold ??
    ticket.purchased_count ??
    ticket.purchase_count
  ) ?? 0;
  const reserved = toFiniteNumber(ticket.reserved_quantity) ?? 0;

  if (total === null) {
    return null;
  }

  return Math.max(total - sold - reserved, 0);
}

export function isTicketSoldOut(ticket: TicketAvailabilityData): boolean {
  const status = String(ticket.status ?? ticket.availability ?? '').trim().toLowerCase();

  if (ticket.is_active === false || ticket.active === false) return true;
  if (ticket.sold_out === true || ticket.is_sold_out === true) return true;
  if (['sold_out', 'sold out', 'sold-out', 'soldout', 'unavailable', 'inactive', 'closed', 'ended', 'disabled'].includes(status)) return true;

  const remaining = getTicketRemaining(ticket);
  return remaining !== null && remaining <= 0;
}

export function getTicketUnitPrice(ticket: Partial<EventTicket>, selectedQuantity = 1): number {
  const basePrice = toFiniteNumber(ticket.price) ?? 0;
  const discount = toFiniteNumber(ticket.early_bird_discount_percent ?? ticket.early_bird_discount_percentage) ?? 0;
  const earlyBirdUnits = toFiniteNumber(ticket.early_bird_max_count ?? ticket.early_bird_units) ?? 0;

  if (discount <= 0 || earlyBirdUnits <= 0 || selectedQuantity <= 0) {
    return basePrice;
  }

  const remainingEarlyBirdUnits = getTicketEarlyBirdRemaining(ticket);
  if (remainingEarlyBirdUnits <= 0) {
    return basePrice;
  }

  const lineTotal = getTicketLineTotal(ticket, selectedQuantity);
  return lineTotal / selectedQuantity;
}

export function getTicketLineTotal(ticket: Partial<EventTicket>, quantity: number): number {
  const basePrice = toFiniteNumber(ticket.price) ?? 0;
  const discount = toFiniteNumber(ticket.early_bird_discount_percent ?? ticket.early_bird_discount_percentage) ?? 0;
  const earlyBirdUnits = toFiniteNumber(ticket.early_bird_max_count ?? ticket.early_bird_units) ?? 0;
  const sold = toFiniteNumber(ticket.quantity_sold) ?? 0;

  if (discount <= 0 || earlyBirdUnits <= 0 || quantity <= 0) {
    return basePrice * quantity;
  }

  const remainingEarlyBirdUnits = getTicketEarlyBirdRemaining(ticket);
  const discountedQuantity = Math.min(quantity, remainingEarlyBirdUnits);
  const regularQuantity = Math.max(quantity - discountedQuantity, 0);
  const discountedPrice = Math.max(basePrice - (basePrice * discount / 100), 0);

  return (discountedPrice * discountedQuantity) + (basePrice * regularQuantity);
}

/**
 * How many discounted early-bird units are still available.
 *
 * Prefers the backend's own counters (`early_bird_remaining`, then
 * `early_bird_sold_count`). Deriving this from the ticket's *total* `quantity_sold`
 * assumes every sale consumed an early-bird unit, so the moment those two diverge the
 * checkout would price a ticket differently from the server that charges for it.
 */
export function getTicketEarlyBirdRemaining(ticket: Partial<EventTicket>): number {
  const reported = toFiniteNumber((ticket as any).early_bird_remaining);
  if (reported !== null && reported !== undefined) return Math.max(reported, 0);

  const earlyBirdUnits = toFiniteNumber(ticket.early_bird_max_count ?? ticket.early_bird_units) ?? 0;
  const earlyBirdSold = toFiniteNumber((ticket as any).early_bird_sold_count);
  const sold = earlyBirdSold ?? toFiniteNumber(ticket.quantity_sold) ?? 0;
  return Math.max(earlyBirdUnits - sold, 0);
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
  has_early_bird?: boolean;
  early_bird_units?: number;
  early_bird_discount_percentage?: number;
  early_bird_discount_percent?: number | null;
  early_bird_max_count?: number | null;
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
