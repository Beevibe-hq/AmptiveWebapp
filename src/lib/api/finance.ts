import { $finance } from './services/finance';

export interface PurchaseRecord {
  id: string;
  buyer_id: string;
  ticket_id: string;
  event_id: string;
  status: string;
  total_amount?: number;
  created_at: string;
  buyer_name?: string;
  buyer_email?: string;
  ticket_label?: string;
  ticket_price?: number;
  color_theme?: string;
  [key: string]: unknown;
}

export interface BuyerProfile {
  user_id: string;
  avatar_url?: string;
  full_name?: string;
  email?: string;
  [key: string]: unknown;
}

export async function getEventOwnerPurchases(): Promise<PurchaseRecord[]> {
  try {
    const response = await $finance.getEventOwnerPurchases();
    return (response.purchases || []) as PurchaseRecord[];
  } catch {
    return [];
  }
}

export async function getBuyerProfiles(userIds: string[]): Promise<BuyerProfile[]> {
  if (userIds.length === 0) return [];
  try {
    const response = await $finance.getBuyerProfiles(userIds);
    return (response.profiles || []) as BuyerProfile[];
  } catch {
    return [];
  }
}
