import { useState, useEffect, useCallback } from 'react';
import { MapPin, Globe, Plus, Edit2, Loader2, ChevronDown } from 'lucide-react';
import { listVenues, createVenue, updateVenue } from '@/lib/api/venues';
import type { Venue, VenueCreateRequest } from '@/lib/api/venues';
import { toastSuccess, toastError } from '@/lib/ui/toast';
import VenueForm from './VenueForm';

interface VenueSelectorProps {
  selectedVenueId?: string | null;
  onVenueSelect: (venueId: string | null, venueType?: 'physical' | 'virtual' | null) => void;
  deferVenueCreation?: boolean;
  onDraftVenue?: (draft: VenueCreateRequest | null) => void;
}

export default function VenueSelector({ selectedVenueId, onVenueSelect, deferVenueCreation, onDraftVenue }: VenueSelectorProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [draftPayload, setDraftPayload] = useState<VenueCreateRequest | null>(null);

  const selectedVenue = venues.find((v) => v.venue_id === selectedVenueId) ||
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

  const handleSaveVenue = useCallback(async (payload: VenueCreateRequest) => {
    try {
      if (editingVenue) {
        if (deferVenueCreation && editingVenue.venue_id.startsWith('draft-')) {
          setDraftPayload(payload);
          onDraftVenue?.(payload);
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
      setShowForm(false);
      setEditingVenue(null);
      await fetchVenues();
    } catch (e) {
      toastError((e as Error).message || 'Something went wrong');
    }
  }, [editingVenue, deferVenueCreation, onDraftVenue, onVenueSelect]);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-2xl px-5 py-4 text-left bg-black/5 hover:bg-black/10 transition-colors"
      >
        {loading ? (
          <span className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading venues...
          </span>
        ) : selectedVenue ? (
          <div className="flex items-center gap-3 min-w-0">
            {selectedVenue.venue_type === 'physical' ? (
              <MapPin className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <Globe className="h-5 w-5 text-blue-500 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{selectedVenue.name}</div>
              <div className="text-xs text-gray-500 truncate">
                {selectedVenue.venue_type === 'physical'
                  ? [selectedVenue.city, selectedVenue.state].filter(Boolean).join(', ') || selectedVenue.address_line1
                  : 'On the App'}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-gray-500">Select a venue</span>
        )}
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 w-full mt-2 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden max-h-72 overflow-y-auto">
          {venues.length === 0 && !loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              No venues yet. Create one below.
            </div>
          ) : (
            venues.map((venue) => (
              <button
                key={venue.venue_id}
                type="button"
                onClick={() => {
                  onVenueSelect(venue.venue_id, venue.venue_type);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  selectedVenueId === venue.venue_id ? 'bg-blue-50/50' : ''
                }`}
              >
                {venue.venue_type === 'physical' ? (
                  <MapPin className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <Globe className="h-5 w-5 text-blue-500 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">{venue.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {venue.venue_type === 'physical'
                      ? [venue.city, venue.state].filter(Boolean).join(', ') || venue.address_line1
                      : 'On the App'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingVenue(venue);
                    setShowForm(true);
                    setOpen(false);
                  }}
                  className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </button>
            ))
          )}

          <div className="border-t border-gray-100 p-2">
            <button
              type="button"
              onClick={() => {
                setEditingVenue(null);
                setShowForm(true);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add New Venue
            </button>
          </div>

          {selectedVenueId && (
            <div className="border-t border-gray-100 p-2">
              <button
                type="button"
                onClick={() => {
                  onVenueSelect(null);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                No venue
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <VenueForm
          initialVenue={editingVenue}
          onSave={handleSaveVenue}
          onCancel={() => {
            setShowForm(false);
            setEditingVenue(null);
          }}
        />
      )}
    </div>
  );
}
