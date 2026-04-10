import { api } from './client';

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
    return await api.post<{ ok: boolean; error?: string }>('/purchases', purchases);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getPurchasesByUser(userId: string): Promise<Purchase[]> {
  return api.get<Purchase[]>(`/purchases?userId=${userId}`);
}

export async function getPurchasesByEvent(eventId: string): Promise<Purchase[]> {
  return api.get<Purchase[]>(`/purchases?eventId=${eventId}`);
}

export async function getPurchase(purchaseId: string): Promise<Purchase | null> {
  try {
    return await api.get<Purchase>(`/purchases/${purchaseId}`);
  } catch {
    return null;
  }
}