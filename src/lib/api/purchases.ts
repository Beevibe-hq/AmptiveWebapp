import { $tickets } from './services';

export interface Purchase {
  id: string;
  user_id: string;
  ticket_id: string;
  ticket_label: string;
  event_id: string;
  event_title: string;
  quantity: number;
  total_price: number;
  currency: string;
  purchased_at?: string;
}

export interface TicketPurchase {
  id: string;
  ticket_id: string;
  event_id: string;
  ticket_type_id: string;
  status: string;
  purchase_date: string;
  qr_code_data: string;
  purchase_id?: string;
  ticket_code?: string;
  color_theme?: string;
  attendee_name?: string;
  attendee_email?: string;
  events?: {
    title: string;
    cover_image: string;
    start_time: string;
    venue: string;
    city: string;
    location_type: string;
  };
  metadata?: {
    price_paid: number;
    base_price?: number;
    early_bird_applied?: boolean;
    currency: string;
    physical_delivery: boolean;
  };
}

export interface PurchaseInput {
  user_id: string;
  ticket_id: string;
  ticket_label: string;
  event_id: string;
  event_title: string;
  quantity: number;
  total_price: number;
  currency: string;
}

export async function getPurchasesByUser(): Promise<TicketPurchase[]> {
  try {
    const response = await $tickets.getMine();
    const tickets = response?.tickets || [];

    const mapped: TicketPurchase[] = tickets.map((ticket: any) => {
      const rawEvent = ticket.events || ticket.event || ticket.event_details || {};
      const rawMetadata = ticket.metadata || ticket.purchase?.metadata || {};
      const ticketPricing = Array.isArray(rawMetadata.ticket_pricing)
        ? rawMetadata.ticket_pricing.find((item: any) => (
            item.ticket_type_id === ticket.ticket_type_id ||
            item.ticket_type_id === ticket.event_ticket_id ||
            item.ticket_id === ticket.ticket_type_id
          ))
        : null;
      const pricePaid = Number(ticket.price_paid ?? ticket.amount_paid ?? ticket.unit_price_paid ?? ticketPricing?.unit_price ?? 0) || 0;
      const basePrice = ticket.base_price ??
        ticket.original_price ??
        ticket.regular_price ??
        ticket.ticket_price ??
        ticket.price ??
        ticket.event_tickets?.price ??
        ticket.ticket_type?.price ??
        ticketPricing?.base_price;
      const earlyBirdDiscount = ticket.early_bird_discount_percent ??
        ticket.early_bird_discount_percentage ??
        ticket.event_tickets?.early_bird_discount_percent ??
        ticket.event_tickets?.early_bird_discount_percentage ??
        ticket.ticket_type?.early_bird_discount_percent;
      const earlyBirdApplied = Boolean(
        ticket.early_bird_applied ??
        rawMetadata.early_bird_applied ??
        ticket.was_early_bird ??
        ticket.is_early_bird ??
        ticketPricing?.early_bird_applied ??
        (earlyBirdDiscount && Number(earlyBirdDiscount) > 0 && basePrice && pricePaid < Number(basePrice))
      );

      return {
        id: ticket.id || '',
        ticket_id: ticket.id || '',
        event_id: ticket.event_id || '',
        ticket_type_id: ticket.ticket_type_id || '',
        status: ticket.status || 'valid',
        purchase_date: ticket.created_at || ticket.purchase_date || '',
        qr_code_data: ticket.qr_code_data || '',
        ticket_code: ticket.ticket_code || '',
        purchase_id: ticket.purchase_id,
        color_theme: ticket.color_theme || 'silver',
        attendee_name: ticket.attendee_name || '',
        attendee_email: ticket.attendee_email || '',
        events: {
          title: ticket.event_title || rawEvent.title || 'Unknown Event',
          cover_image: ticket.event_thumbnail_url || rawEvent.cover_image || rawEvent.thumbnail_url || '',
          start_time: ticket.scheduled_for || rawEvent.start_time || rawEvent.scheduled_for || '',
          venue: ticket.event_venue || ticket.venue || rawEvent.venue || rawEvent.location?.venue || '',
          city: ticket.event_city || ticket.city || rawEvent.city || rawEvent.location?.city || '',
          location_type: ticket.event_location_type || ticket.location_type || rawEvent.location_type || rawEvent.location?.type || 'physical',
        },
        metadata: {
          price_paid: pricePaid,
          base_price: basePrice,
          early_bird_applied: earlyBirdApplied,
          currency: ticket.currency || 'NGN',
          physical_delivery: ticket.is_physical || false,
        },
      };
    });

    return mapped;
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }
}

export async function transferTicket(ticketCode: string, targetEmail: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await $tickets.transfer(ticketCode, targetEmail);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function getPurchasesByEvent(eventId: string): Promise<Purchase[]> {
  return [] as Purchase[];
}
