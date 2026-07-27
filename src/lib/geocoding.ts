import { OpenLocationCode } from 'open-location-code';

const olc = new OpenLocationCode();

/**
 * Checks if a query string contains a Google Plus Code (e.g. "6GCRH234+56" or "6GCR+99 Yaba, Lagos").
 * Returns exact decoded lat/lng coordinates offline if found.
 */
export function tryDecodePlusCode(query: string, refLat = 6.5244, refLng = 3.3792): { lat: number; lng: number } | null {
  if (!query) return null;
  const tokens = query.trim().toUpperCase().split(/[\s,]+/);
  const codeToken = tokens.find(t => t.includes('+') && t.length >= 4);

  if (!codeToken) return null;

  try {
    if (olc.isFull(codeToken)) {
      const area = olc.decode(codeToken);
      return { lat: area.latitudeCenter, lng: area.longitudeCenter };
    }
    if (olc.isShort(codeToken)) {
      const recovered = olc.recoverNearest(codeToken, refLat, refLng);
      const area = olc.decode(recovered);
      return { lat: area.latitudeCenter, lng: area.longitudeCenter };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Generates a Google Plus Code for a pair of latitude and longitude coordinates.
 * e.g., (6.5095, 3.3711) -> "6GCR6956+M9"
 */
export function getPlusCodeFromCoords(lat: number, lng: number): string {
  try {
    return olc.encode(lat, lng);
  } catch {
    return '';
  }
}

/**
 * Extracts lat/lng coordinates if the input string is a Google Maps URL or raw coordinates.
 */
export function extractCoordsFromUrlOrString(input: string): { lat: number; lng: number } | null {
  if (!input) return null;
  const clean = input.trim();

  // Pattern 1: @lat,lng e.g. @6.5179646,3.4015350
  const atMatch = clean.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // Pattern 2: query=lat,lng or q=lat,lng e.g. ?query=6.5179646,3.4015350
  const qMatch = clean.match(/[?&](?:query|q)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  // Pattern 3: direct lat,lng numbers in string e.g. "6.5179646, 3.4015350"
  const directMatch = clean.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (directMatch) {
    return { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) };
  }

  return null;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  madhouse: { lat: 6.5179646, lng: 3.4015350 },
  tikera: { lat: 6.5179646, lng: 3.4015350 },
  chillspot: { lat: 6.5095, lng: 3.3711 },
  yaba: { lat: 6.5095, lng: 3.3711 },
  lekki: { lat: 6.4698, lng: 3.5852 },
  ikeja: { lat: 6.6018, lng: 3.3515 },
  'victoria island': { lat: 6.4281, lng: 3.4219 },
  vi: { lat: 6.4281, lng: 3.4219 },
  ikoyi: { lat: 6.4549, lng: 3.4316 },
  surulere: { lat: 6.4974, lng: 3.3567 },
  lagos: { lat: 6.5244, lng: 3.3792 },
  abuja: { lat: 9.0765, lng: 7.3986 },
  'port harcourt': { lat: 4.8156, lng: 7.0498 },
  ibadan: { lat: 7.3775, lng: 3.9470 },
  kano: { lat: 12.0022, lng: 8.5920 },
  enugu: { lat: 6.4584, lng: 7.5464 },
  benin: { lat: 6.3350, lng: 5.6037 },
  accra: { lat: 5.6037, lng: -0.1870 },
  london: { lat: 51.5074, lng: -0.1278 },
  'new york': { lat: 40.7128, lng: -74.0060 }
};

export async function geocodeAddressQuery(query: string): Promise<{ lat: number; lng: number; city: string }> {
  const trimmed = query.trim();
  if (!trimmed) return { lat: 6.5244, lng: 3.3792, city: 'Lagos' };

  // Tier 0a: Check if query is a Google Maps URL or raw coordinates
  const urlCoords = extractCoordsFromUrlOrString(trimmed);
  if (urlCoords) {
    return { lat: urlCoords.lat, lng: urlCoords.lng, city: 'Lagos' };
  }

  // Tier 0b: Check for Google Plus Code (e.g. "6GCR+99 Yaba" or "6GCRH234+56")
  const plusCodeCoords = tryDecodePlusCode(trimmed);
  if (plusCodeCoords) {
    const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    const city = parts.find(p => !p.includes('+')) || 'Lagos';
    return { lat: plusCodeCoords.lat, lng: plusCodeCoords.lng, city };
  }

  // Tier 0c: Google — it indexes the business/venue names organisers actually type, which
  // Mapbox and TomTom miss entirely ("MADhouse by Tikera Africa" resolves here to rooftop
  // precision). This must run BEFORE the city-keyword fallback below: any address ending
  // in "…, Lagos" used to short-circuit straight to the city centre, which is why saved
  // venues were kilometres away from the real place.
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const params = new URLSearchParams({ address: trimmed, region: 'ng', key: googleKey });
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
      const data = await res.json();
      const best = data?.status === 'OK' ? data.results?.[0] : null;
      const loc = best?.geometry?.location;
      if (loc && !isNaN(Number(loc.lat)) && !isNaN(Number(loc.lng))) {
        const component = (type: string) =>
          best.address_components?.find((c: any) => c.types?.includes(type))?.long_name || '';
        const city =
          component('locality') ||
          component('administrative_area_level_2') ||
          component('administrative_area_level_1') ||
          'Lagos';
        return { lat: Number(loc.lat), lng: Number(loc.lng), city };
      }
    } catch {
      // fall through to the other providers
    }
  }

  // Tier 0d: Local landmark keyword match — a coarse, city-level last resort.
  const lowerQ = trimmed.toLowerCase();

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY;

  // Query variants (e.g. "MADhouse by Tikera Africa" -> also try "MADhouse Tikera Africa")
  const queryVariants = [
    trimmed,
    trimmed.replace(/\bby\b/gi, ' ').replace(/\s+/g, ' ').trim()
  ].filter(Boolean);

  const isValidCoord = (lat: number, lng: number) => !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  for (const qVariant of queryVariants) {
    // 1. Try TomTom with countrySet=NG & proximity bias to Lagos
    if (tomtomKey) {
      try {
        const ttRes = await fetch(
          `https://api.tomtom.com/search/2/search/${encodeURIComponent(qVariant)}.json?key=${tomtomKey}&limit=1&countrySet=NG&lat=6.5244&lon=3.3792`
        );
        const ttData = await ttRes.json();
        if (ttData.results?.[0]?.position) {
          const pos = ttData.results[0].position;
          if (isValidCoord(pos.lat, pos.lon)) {
            const city = ttData.results[0].address?.municipality || ttData.results[0].address?.freeformAddress?.split(',')[0] || '';
            return { lat: pos.lat, lng: pos.lon, city };
          }
        }
      } catch { /* proceed */ }
    }

    // 2. Try Mapbox with country=ng restriction & proximity bias
    if (mapboxToken) {
      try {
        const mbRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(qVariant)}.json?access_token=${mapboxToken}&limit=1&country=ng&proximity=3.3792,6.5244`
        );
        const mbData = await mbRes.json();
        if (mbData.features?.[0]?.center) {
          const [lng, lat] = mbData.features[0].center;
          if (isValidCoord(lat, lng)) {
            const ctx = (type: string) => mbData.features[0].context?.find((c: any) => c.id?.startsWith(type))?.text || '';
            const city = ctx('place') || ctx('locality') || mbData.features[0].text || '';
            return { lat, lng, city };
          }
        }
      } catch { /* proceed */ }
    }
  }

  // 3. Try Sub-query (strip custom venue prefix, e.g. "Chillspot, Yaba..." -> "Yaba...")
  const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    const subQuery = parts.slice(1).join(', ');
    if (tomtomKey) {
      try {
        const ttRes = await fetch(
          `https://api.tomtom.com/search/2/search/${encodeURIComponent(subQuery)}.json?key=${tomtomKey}&limit=1&countrySet=NG&lat=6.5244&lon=3.3792`
        );
        const ttData = await ttRes.json();
        if (ttData.results?.[0]?.position) {
          const pos = ttData.results[0].position;
          if (isValidCoord(pos.lat, pos.lon)) {
            return { lat: pos.lat, lng: pos.lon, city: parts[1] || 'Lagos' };
          }
        }
      } catch { /* proceed */ }
    }
  }

  // 4. Local City / Neighborhood Keyword Match
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (lowerQ.includes(key)) {
      return { lat: coords.lat, lng: coords.lng, city: key.toUpperCase() };
    }
  }

  // 5. Default Fallback (Lagos Center)
  return { lat: 6.5244, lng: 3.3792, city: 'Lagos' };
}
