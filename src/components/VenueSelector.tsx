import { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Globe, Plus, Edit2, ChevronDown, Loader2, X } from "lucide-react";
import { listVenues, createVenue, updateVenue, deleteVenue } from '@/lib/api/venues';
import type { Venue, VenueCreateRequest } from '@/lib/api/venues';
import { toastSuccess, toastError } from '@/lib/ui/toast';
import VenueForm from './VenueForm';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';
import L from 'leaflet';

const AMPTIVE_APP_VENUE_ID = 'virtual-amptive-app';
const AMPTIVE_APP_VENUE: Venue = {
  venue_id: AMPTIVE_APP_VENUE_ID,
  name: 'Amptive App',
  venue_type: 'virtual',
  platform_note: 'Audience will join the live event inside the Amptive mobile app.',
};

/* ── Compact Leaflet preview matching EventDetail's VenueMap ── */
function MiniVenueMap({
  latitude,
  longitude,
  addressQuery,
  hostAvatarUrl,
  mapboxToken,
  onClick,
}: {
  latitude?: number | null;
  longitude?: number | null;
  addressQuery?: string;
  hostAvatarUrl?: string;
  mapboxToken?: string;
  onClick?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    const lat = latitude || 6.5244;
    const lng = longitude || 3.3792;
    const hasCoords = !!(latitude && longitude);

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    if (mapboxToken) {
      L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
        { tileSize: 512, zoomOffset: -1, minZoom: 3, maxZoom: 20 }
      ).addTo(map);
    } else {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd', minZoom: 3, maxZoom: 20,
      }).addTo(map);
    }

    // Circular avatar pin marker matching EventDetail: the organiser's own picture, and
    // a plain white circle when there isn't one. It used to fall back to a hardcoded
    // portrait of one particular person, which showed on every create-event map.
    // Escaped: this string is injected as HTML, so a quote in the URL would break out.
    const safeAvatar = hostAvatarUrl ? String(hostAvatarUrl).replace(/"/g, '&quot;') : '';
    const avatarImg = safeAvatar
      ? `<img src="${safeAvatar}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.remove();" />`
      : '';
    const iconHtml = `
      <div style="position:relative;display:inline-flex;flex-direction:column;align-items:center;">
        <div style="position:relative;width:48px;height:48px;border-radius:50%;background:#ffffff;border:4px solid #ffffff;box-sizing:border-box;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.18);">
          ${avatarImg}
        </div>
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #ffffff;margin-top:-2px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.12));"></div>
      </div>
    `;

    const pinIcon = L.divIcon({
      className: '',
      html: iconHtml,
      iconSize: [48, 58],
      iconAnchor: [24, 58],
    });

    const marker = L.marker([lat, lng], { icon: pinIcon, interactive: false }).addTo(map);
    mapRef.current = map;

    // Geocode if no explicit coords
    if (!hasCoords && addressQuery) {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addressQuery)}`)
        .then(r => r.json())
        .then(results => {
          if (!cancelled && results?.[0]) {
            const gLat = parseFloat(results[0].lat);
            const gLng = parseFloat(results[0].lon);
            if (!isNaN(gLat) && !isNaN(gLng)) {
              map.setView([gLat, gLng], 15);
              marker.setLatLng([gLat, gLng]);
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, addressQuery, mapboxToken]);

  return (
    <button type="button" onClick={onClick} className="relative block w-full h-36 focus:outline-none overflow-hidden isolate z-0">
      <style>{`.leaflet-tile-pane { filter: saturate(1.04) brightness(1.01); }`}</style>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
    </button>
  );
}

interface VenueSelectorProps {
  selectedVenueId?: string | null;
  onVenueSelect: (venueId: string | null, venueType?: 'physical' | 'virtual' | null) => void;
  deferVenueCreation?: boolean;
  onDraftVenue?: (draft: VenueCreateRequest | null) => void;
  hostAvatarUrl?: string;
}

export default function VenueSelector({ selectedVenueId, onVenueSelect, deferVenueCreation, onDraftVenue, hostAvatarUrl }: VenueSelectorProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [draftPayload, setDraftPayload] = useState<VenueCreateRequest | null>(null);
  const physicalVenues = venues.filter((venue) => venue.venue_type === 'physical');

  const selectedVenue = selectedVenueId === AMPTIVE_APP_VENUE_ID
    ? AMPTIVE_APP_VENUE
    : venues.find((v) => v.venue_id === selectedVenueId) ||
    (draftPayload && selectedVenueId?.startsWith('draft-')
      ? { venue_id: selectedVenueId, name: draftPayload.name, venue_type: draftPayload.venue_type, city: draftPayload.city, state: draftPayload.state, address_line1: draftPayload.address_line1 } as Venue
      : undefined);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const data = await listVenues();
      setVenues(data);
    } catch {
      console.error('Failed to fetch venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleOpen = () => {
    if (selectedVenueId) {
      if (selectedVenueId === AMPTIVE_APP_VENUE_ID) {
        setEditingVenue(AMPTIVE_APP_VENUE);
        setShowForm(true);
        setOpen(true);
        return;
      }
      const venueToEdit = venues.find((v) => v.venue_id === selectedVenueId) ||
        (draftPayload && selectedVenueId.startsWith('draft-')
          ? {
              venue_id: selectedVenueId,
              name: draftPayload.name,
              venue_type: draftPayload.venue_type,
              city: draftPayload.city,
              state: draftPayload.state,
              address_line1: draftPayload.address_line1,
              country: draftPayload.country,
              postal_code: draftPayload.postal_code,
              latitude: draftPayload.latitude,
              longitude: draftPayload.longitude,
              place_id: draftPayload.place_id,
              place_provider: draftPayload.place_provider,
              platform_note: draftPayload.platform_note,
              description: draftPayload.description,
            } as Venue
          : null);
      setEditingVenue(venueToEdit);
      setShowForm(true); // Open directly in Edit mode
    } else {
      setEditingVenue(null);
      setShowForm(false); // Open in Select list mode
    }
    setOpen(true);
  };

  const handleSaveVenue = useCallback(async (payload: VenueCreateRequest) => {
    try {
      if (payload.venue_type === 'virtual') {
        setDraftPayload(null);
        onDraftVenue?.(null);
        onVenueSelect(AMPTIVE_APP_VENUE_ID, 'virtual');
        setOpen(false);
        setShowForm(false);
        setEditingVenue(null);
        return;
      }

      if (editingVenue) {
        if (deferVenueCreation && editingVenue.venue_id.startsWith('draft-')) {
          setDraftPayload(payload);
          onDraftVenue?.(payload);
          setOpen(false);
          setShowForm(false);
          setEditingVenue(null);
          return;
        }
        const result = await updateVenue(editingVenue.venue_id, payload);
        if (!result.ok) {
          toastError(result.error || 'Failed to update venue');
          return;
        }
        toastSuccess('Venue updated');
      } else {
        if (deferVenueCreation) {
          const tempId = `draft-${Date.now()}`;
          setDraftPayload(payload);
          onDraftVenue?.(payload);
          onVenueSelect(tempId, payload.venue_type);
          setOpen(false);
          setShowForm(false);
          setEditingVenue(null);
          return;
        }
        const result = await createVenue(payload);
        if (!result.id) {
          toastError('Failed to create venue');
          return;
        }
        toastSuccess('Venue created');
        onVenueSelect(result.id, result.venue_type as 'physical' | 'virtual');
      }
      setOpen(false);
      setShowForm(false);
      setEditingVenue(null);
      await fetchVenues();
    } catch (e) {
      toastError((e as Error).message || 'Something went wrong');
    }
  }, [editingVenue, deferVenueCreation, onDraftVenue, onVenueSelect]);

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  // Has meaningful location data for map?
  const hasMapLocation = selectedVenue && (
    (selectedVenue.latitude && selectedVenue.longitude) ||
    selectedVenue.address_line1 || selectedVenue.city
  );

  const venueFullAddress = selectedVenue
    ? [
        selectedVenue.address_line1,
        selectedVenue.city,
        selectedVenue.postal_code,
        selectedVenue.state,
        selectedVenue.country,
      ].filter(Boolean).join(', ')
    : '';

  return (
    <div className="relative">
      <label className="block text-[13px] font-medium text-gray-500 mb-1.5">Venue</label>

      {/* ── Unselected / Loading state ── */}
      {!selectedVenue ? (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full flex items-center gap-2.5 rounded-2xl bg-black/5 hover:bg-black/[0.07] px-4 py-3.5 text-left focus:outline-none focus:ring-4 focus:ring-blue-500/10 active:scale-[0.99] transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-gray-400">Loading venues…</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-sm font-medium text-gray-400">Select or add a venue</span>
            </>
          )}
        </button>
      ) : (
        /* ── Selected state: Google Maps result card style ── */
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          {/* Dark header */}
          <button
            type="button"
            onClick={handleOpen}
            className="w-full flex items-start gap-3 px-4 py-3.5 bg-[#f2f2f2] hover:bg-[#ebebeb] text-left transition-colors duration-150 focus:outline-none"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-gray-500 mt-0.5">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">{selectedVenue.name}</p>
              {venueFullAddress && (
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{venueFullAddress}</p>
              )}
            </div>
            {/* Clear button */}
            <div onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  onVenueSelect(null);
                  onDraftVenue?.(null);
                  setDraftPayload(null);
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-black/10 transition-colors mt-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </button>

          {/* Static map thumbnail */}
          {/* Leaflet mini-map */}
          {hasMapLocation ? (
            <MiniVenueMap
              latitude={selectedVenue.latitude}
              longitude={selectedVenue.longitude}
              addressQuery={[selectedVenue.address_line1, selectedVenue.city, selectedVenue.state, selectedVenue.country].filter(Boolean).join(', ')}
              hostAvatarUrl={hostAvatarUrl}
              mapboxToken={mapboxToken}
              onClick={handleOpen}
            />
          ) : (
            <button
              type="button"
              onClick={handleOpen}
              className="w-full flex items-center justify-center h-16 bg-gray-50 text-gray-400 text-xs gap-1.5 hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <MapPin className="h-3.5 w-3.5" />
              No address to show map
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <VenueForm
              initialVenue={editingVenue}
              onSave={handleSaveVenue}
              onCancel={() => {
                setOpen(false);
                setEditingVenue(null);
              }}
              onClear={selectedVenueId ? () => {
                onVenueSelect(null);
                onDraftVenue?.(null);
                setDraftPayload(null);
                setOpen(false);
                setEditingVenue(null);
              } : undefined}
              existingVenues={physicalVenues}
              selectedVenueId={selectedVenueId}
              onSelectVenue={(venueId) => {
                const venue = venues.find(v => v.venue_id === venueId);
                onVenueSelect(venueId, venue?.venue_type);
              }}
              onDeleteVenue={async (venue) => {
                if (!confirm(`Delete "${venue.name}"? This cannot be undone.`)) return;
                const result = await deleteVenue(venue.venue_id);
                if (result.ok) {
                  toastSuccess('Venue deleted');
                  await fetchVenues();
                } else {
                  toastError(result.error || 'Failed to delete venue');
                }
              }}
              isInline={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
