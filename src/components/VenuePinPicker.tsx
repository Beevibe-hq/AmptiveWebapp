import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin } from 'lucide-react';

interface VenuePinPickerProps {
  latitude: number | null;
  longitude: number | null;
  /** Falls back to this when nothing is pinned yet, so the map opens somewhere sensible. */
  fallbackCity?: string | null;
  /** True when the saved venue already had coordinates, rather than a guess from the address. */
  initiallyConfirmed?: boolean;
  onChange: (lat: number, lng: number) => void;
}

// Rough city centres used only to open the map somewhere recognisable before a pin exists.
const CITY_FALLBACKS: Record<string, { lat: number; lng: number }> = {
  lagos: { lat: 6.5244, lng: 3.3792 },
  abuja: { lat: 9.0765, lng: 7.3986 },
  'port harcourt': { lat: 4.8156, lng: 7.0498 },
  ibadan: { lat: 7.3775, lng: 3.947 },
  accra: { lat: 5.6037, lng: -0.187 },
  nairobi: { lat: -1.2921, lng: 36.8219 },
};

const DEFAULT_CENTRE = { lat: 6.5244, lng: 3.3792 };

/**
 * Confirms where a venue actually is.
 *
 * Deliberately not a tool the organiser has to learn: the pin is placed for them from the
 * address they picked, and the only thing asked of them is to drag it if it looks wrong —
 * the same gesture as setting a pickup point in a ride-hailing app. Everything here is
 * optional; skipping it just leaves the venue as accurate as the typed address.
 */
export default function VenuePinPicker({ latitude, longitude, fallbackCity, initiallyConfirmed = false, onChange }: VenuePinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  // A pin derived from the typed address is only a guess until the organiser places it,
  // so we don't claim the location is confirmed until they actually touch it.
  const [confirmed, setConfirmed] = useState(initiallyConfirmed);

  useEffect(() => { onChangeRef.current = onChange; });

  const hasPin = latitude != null && longitude != null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const cityKey = String(fallbackCity || '').trim().toLowerCase();
    const start = hasPin
      ? { lat: latitude as number, lng: longitude as number }
      : CITY_FALLBACKS[cityKey] || DEFAULT_CENTRE;

    const map = L.map(containerRef.current, {
      center: [start.lat, start.lng],
      zoom: hasPin ? 16 : 12,
      zoomControl: true,
      attributionControl: false,
    });

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    L.tileLayer(
      token
        ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      token ? { tileSize: 512, zoomOffset: -1, maxZoom: 20 } : { subdomains: 'abcd', maxZoom: 20 }
    ).addTo(map);

    const icon = L.divIcon({
      className: 'venue-pin-marker',
      html: `<div style="width:32px;height:40px;display:flex;align-items:flex-start;justify-content:center;">
               <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 24 16 24s16-13 16-24c0-8.8-7.2-16-16-16z" fill="#111111"/>
                 <circle cx="16" cy="15.5" r="5.5" fill="#ffffff"/>
               </svg>
             </div>`,
      iconSize: [32, 40],
      iconAnchor: [16, 40],
    });

    const marker = L.marker([start.lat, start.lng], { icon, draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setConfirmed(true);
      onChangeRef.current(pos.lat, pos.lng);
    });
    // Tapping the map is a second, easier way to place the pin.
    map.on('click', (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng);
      setConfirmed(true);
      onChangeRef.current(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // The map is often rendered inside a panel that sizes after mount.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(containerRef.current);
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Created once; later coordinate changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow coordinates chosen elsewhere — picking an address suggestion moves the pin.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !hasPin) return;
    const next = L.latLng(latitude as number, longitude as number);
    markerRef.current.setLatLng(next);
    // Always recentre, even when the marker was already there: the map may still have been
    // sizing when the coordinates arrived, which left the pin outside the visible area.
    mapRef.current.invalidateSize();
    mapRef.current.setView(next, Math.max(mapRef.current.getZoom(), 16), { animate: false });
  }, [latitude, longitude, hasPin]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocateError("Your browser can't share a location.");
      return;
    }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setConfirmed(true);
        onChangeRef.current(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocating(false);
        setLocateError("Couldn't get your location. You can drag the pin instead.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-700">
            {!hasPin ? 'Where exactly is it?' : confirmed ? 'Is this the right spot?' : 'We guessed from the address'}
          </p>
          <p className="text-xs text-gray-500">
            {!hasPin
              ? 'Pick an address above, or tap the map to place the pin.'
              : confirmed
                ? 'Drag the pin if it needs moving. This is what guests see on the map.'
                : 'Drag the pin onto the venue so guests find the right place.'}
          </p>
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <Crosshair className="h-3.5 w-3.5" />
          {locating ? 'Locating…' : "I'm at the venue"}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-gray-200">
        <div ref={containerRef} className="h-56 w-full" />
        {!confirmed && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            {hasPin
              ? 'Approximate — drag the pin to set the exact spot.'
              : 'No exact location set — the map will show an approximate area.'}
          </div>
        )}
      </div>

      {locateError && <p className="text-xs text-amber-600">{locateError}</p>}
    </div>
  );
}
