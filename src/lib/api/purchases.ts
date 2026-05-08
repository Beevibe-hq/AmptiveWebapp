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

    const mapped: TicketPurchase[] = tickets.map((ticket: any) => ({
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
        title: ticket.event_title || 'Unknown Event',
        cover_image: ticket.event_thumbnail_url || '',
        start_time: ticket.scheduled_for || '',
        venue: '',
        city: '',
        location_type: 'physical',
      },
      metadata: {
        price_paid: ticket.price_paid || 0,
        currency: ticket.currency || 'NGN',
        physical_delivery: ticket.is_physical || false,
      },
    }));

    return mapped;
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }
}

export async function getPurchasesByEvent(eventId: string): Promise<Purchase[]> {
  return [] as Purchase[];
}
