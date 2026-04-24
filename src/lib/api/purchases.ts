import { $purchases } from './services';

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

export async function createPurchase(purchases: PurchaseInput[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await $purchases.create(purchases);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getPurchasesByUser(userId: string): Promise<TicketPurchase[]> {
  const data: TicketPurchase[] = []
  const error = 'error'

  if (error) {
    console.error('Error fetching purchases:', error);
    return [];
  }

  return data
}

export async function getPurchasesByEvent(eventId: string): Promise<Purchase[]> {
  return [] as Purchase[];
}

export async function getPurchase(purchaseId: string): Promise<Purchase | null> {
  try {
    return await $purchases.getById(purchaseId) as Purchase;
  } catch {
    return null;
  }
}