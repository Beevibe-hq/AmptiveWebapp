import { useEffect, useState } from 'react';
import { Plus, MapPin, Globe, Trash2 } from 'lucide-react';
import { listVenues, deleteVenue, createVenue, updateVenue } from '@/lib/api/venues';
import type { Venue, VenueCreateRequest } from '@/lib/api/venues';
import { toastSuccess, toastError } from '@/lib/ui/toast';
import VenueForm from '@/components/VenueForm';

const getVenueLocation = (venue: Venue) => {
  if (venue.venue_type === 'virtual') {
    return venue.platform_note || 'Amptive app';
  }

  return [venue.address_line1, venue.city, venue.state, venue.country].filter(Boolean).join(', ') || 'Location not set';
};

const getGoogleMapsEmbedUrl = (venue: Venue) => {
  if (typeof venue.latitude === 'number' && typeof venue.longitude === 'number') {
    return `https://www.google.com/maps?q=${venue.latitude},${venue.longitude}&z=16&output=embed`;
  }

  const query = getVenueLocation(venue);
  if (!query || query === 'Location not set') return null;

  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
};

function VenueCardSkeleton({ index }: { index: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
      <div className="relative aspect-square bg-white px-2 pt-2">
        <div className="skeleton-shimmer h-full w-full rounded-lg" />
        <div className="absolute right-4 top-4">
          <div className="skeleton-shimmer h-5 w-12 rounded-full" />
        </div>
      </div>
      <div className="space-y-2 p-3">
        <div className="skeleton-shimmer h-3 w-1/2 rounded-full" />
        <div className="skeleton-shimmer h-4 w-3/4 rounded-full" />
        <div className="space-y-1">
          <div className="skeleton-shimmer h-2 w-1/4 rounded-full" />
          <div className="skeleton-shimmer h-3 w-2/3 rounded-full" />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 pt-1">
          <div className="skeleton-shimmer h-8 rounded-lg" />
          <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
        </div>
      </div>
      <span className="sr-only">Loading venue {index}</span>
    </div>
  );
}

function VenueMapVisual({ venue }: { venue: Venue }) {
  const isPhysical = venue.venue_type === 'physical';
  const mapUrl = isPhysical ? getGoogleMapsEmbedUrl(venue) : null;

  return (
    <div className="relative aspect-square overflow-hidden rounded-t-xl bg-white px-2 pt-2">
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#edf2f6]">
        {mapUrl ? (
          <iframe
            src={mapUrl}
            title={`${venue.name} map preview`}
            className="h-full w-full border-0 grayscale-[0.15]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#e9eff4_0%,#f7fafc_45%,#dde8ef_100%)]">
            <div className="absolute -left-10 top-8 h-12 w-[140%] rotate-[-13deg] rounded-full bg-white/80" />
            <div className="absolute -right-10 top-28 h-10 w-[130%] rotate-[17deg] rounded-full bg-white/70" />
            <div className="absolute left-16 -top-12 h-[125%] w-9 rotate-[31deg] rounded-full bg-white/55" />
            <div className="absolute bottom-12 left-0 h-px w-full bg-black/[0.04]" />
            <div className="absolute left-10 top-0 h-full w-px bg-black/[0.04]" />
            <div className="absolute right-12 top-0 h-full w-px bg-black/[0.035]" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <span className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/70 shadow-[0_14px_34px_rgba(15,23,42,0.20)] ${
            isPhysical ? 'bg-[#0C61D9] text-white' : 'bg-black text-white'
          }`}>
            {isPhysical ? <MapPin className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
          </span>
          {isPhysical && <span className="mt-[-2px] h-3 w-3 rotate-45 rounded-sm bg-[#0C61D9]" />}
        </div>

        <div className="absolute right-3 top-3">
          <div className="rounded-full border border-black/5 bg-white/90 px-2 py-1 text-[10px] font-bold text-black/70 shadow-sm backdrop-blur-sm">
            {isPhysical ? 'Map' : 'Virtual'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const data = await listVenues();
      setVenues(data);
    } catch {
      toastError('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleSave = async (payload: VenueCreateRequest) => {
    try {
      if (editingVenue) {
        const result = await updateVenue(editingVenue.venue_id, payload);
        if (!result.ok) {
          toastError(result.error || 'Failed to update venue');
          return;
        }
        toastSuccess('Venue updated');
      } else {
        const result = await createVenue(payload);
        if (!result.id) {
          toastError('Failed to create venue');
          return;
        }
        toastSuccess('Venue created');
      }
      setShowForm(false);
      setEditingVenue(null);
      await fetchVenues();
    } catch (e) {
      toastError((e as Error).message || 'Something went wrong');
    }
  };

  const handleDelete = async (venue: Venue) => {
    if (!confirm(`Delete "${venue.name}"? This cannot be undone.`)) return;
    const result = await deleteVenue(venue.venue_id);
    if (result.ok) {
      toastSuccess('Venue deleted');
      await fetchVenues();
    } else {
      toastError(result.error || 'Failed to delete venue');
    }
  };

  const manageableVenues = venues.filter((venue) => venue.venue_type === 'physical');

  return (
    <div className="px-4 md:px-8 py-8 w-full">
      <header className="mb-6 md:mb-8 w-full flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">Venues</h1>
          <p className="hidden sm:block text-[15px] text-black/40 mt-1">Manage your venues for events.</p>
        </div>
        <button
          onClick={() => {
            setEditingVenue(null);
            setShowForm(true);
          }}
          className="bg-black text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2 rounded-xl hover:bg-gray-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Venue</span>
        </button>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 mb-8 max-w-6xl">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <VenueCardSkeleton key={index} index={index} />
          ))}
        </div>
      ) : manageableVenues.length === 0 ? (
        <div className="text-center border border-dashed border-gray-200 rounded-xl py-20 bg-white shadow-sm">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No venues yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first venue to use in events.</p>
          <button
            onClick={() => {
              setEditingVenue(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-black rounded-full hover:bg-gray-900 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Venue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 mb-8 max-w-6xl">
          {manageableVenues.map((venue) => (
            <div
              key={venue.venue_id}
              className="group block overflow-hidden rounded-lg border border-gray-200 bg-white text-sm shadow-sm transition-colors hover:border-gray-300"
            >
              <VenueMapVisual venue={venue} />

              <div className="p-3">
                <div className="mb-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                  {venue.venue_type === 'physical' ? (
                    <MapPin className="h-[1.2em] w-[1.2em] text-red-500" />
                  ) : (
                    <Globe className="h-[1.2em] w-[1.2em] text-blue-500" />
                  )}
                  <span>{venue.venue_type === 'physical' ? 'Physical venue' : 'Virtual venue'}</span>
                </div>
                <h3 className="mt-0.5 truncate text-[13px] font-semibold text-gray-900">{venue.name}</h3>
                <div className="mb-2 mt-1 flex flex-col">
                  <span className="text-xs text-gray-500">Location</span>
                  <span className="line-clamp-1 text-sm font-medium text-gray-600">{getVenueLocation(venue)}</span>
                </div>
                {venue.venue_type === 'physical' && typeof venue.latitude === 'number' && typeof venue.longitude === 'number' && (
                  <p className="mb-2 text-[11px] font-medium text-gray-400">
                    {venue.latitude.toFixed(4)}, {venue.longitude.toFixed(4)}
                  </p>
                )}

                <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-2">
                  <button
                    onClick={() => {
                      setEditingVenue(venue);
                      setShowForm(true);
                    }}
                    className="w-full rounded-lg bg-[#F1F7FE] px-3 py-1.5 text-center text-[13px] font-medium text-[#0C61D9] transition-colors group-hover:bg-blue-100"
                  >
                    Edit Venue
                  </button>
                  <button
                    onClick={() => handleDelete(venue)}
                    aria-label={`Delete ${venue.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <VenueForm
          initialVenue={editingVenue}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingVenue(null);
          }}
        />
      )}
    </div>
  );
}
