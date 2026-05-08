import { $venues } from './services';

export interface Venue {
  venue_id: string;
  name: string;
  venue_type: 'physical' | 'virtual';
  description?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  place_provider?: string | null;
  platform_note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VenueCreateRequest {
  name: string;
  venue_type: 'physical' | 'virtual';
  description?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  place_provider?: string | null;
  platform_note?: string | null;
}

export type VenueUpdateRequest = Partial<VenueCreateRequest>;

export async function listVenues(): Promise<Venue[]> {
  const response = await $venues.list();
  return (response?.venues || []) as Venue[];
}

export async function getVenue(venueId: string): Promise<Venue | null> {
  try {
    const response = await $venues.getById(venueId) as Venue;
    return response || null;
  } catch {
    return null;
  }
}

export async function createVenue(venue: VenueCreateRequest): Promise<{ id: string; venue_id?: string; venue_type?: string }> {
  const response = await $venues.create(venue) as { venue_id?: string };
  if (response && response.venue_id) {
    return { id: response.venue_id, venue_id: response.venue_id, venue_type: venue.venue_type };
  }
  return { id: '' };
}

export async function updateVenue(venueId: string, venue: VenueUpdateRequest): Promise<{ ok: boolean; error?: string }> {
  try {
    await $venues.update(venueId, venue);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteVenue(venueId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await $venues.delete(venueId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
