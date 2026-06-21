import { useState, useEffect, useCallback } from 'react';
import { MapPin, Globe, Plus, Edit2, ChevronDown, Loader2, X } from "lucide-react";
import { listVenues, createVenue, updateVenue, deleteVenue } from '@/lib/api/venues';
import type { Venue, VenueCreateRequest } from '@/lib/api/venues';
import { toastSuccess, toastError } from '@/lib/ui/toast';
import VenueForm from './VenueForm';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';

const AMPTIVE_APP_VENUE_ID = 'virtual-amptive-app';
const AMPTIVE_APP_VENUE: Venue = {
  venue_id: AMPTIVE_APP_VENUE_ID,
  name: 'Amptive App',
  venue_type: 'virtual',
  platform_note: 'Audience will join the live event inside the Amptive mobile app.',
};

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

  return (
    <div className="relative">
      <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Venue</label>

      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between rounded-2xl border border-gray-100/50 px-5 py-3.5 text-left bg-black/5 hover:bg-black/10 focus:outline-none focus:ring-4 focus:ring-blue-500/10 active:scale-[0.99] transition-all duration-200"
      >
        {loading ? (
          <span className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm font-medium">Loading venues...</span>
          </span>
        ) : selectedVenue ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${
              selectedVenue.venue_type === 'physical' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {selectedVenue.venue_type === 'physical' ? (
                <MapPin className="h-4 w-4" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate">{selectedVenue.name}</div>
              <div className="text-[11px] font-medium text-gray-500 truncate mt-0.5">
                {selectedVenue.venue_type === 'physical'
                  ? [selectedVenue.city, selectedVenue.state].filter(Boolean).join(', ') || selectedVenue.address_line1
                  : 'On the App'}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-500 font-medium">Select a venue</span>
        )}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {selectedVenue && (
            <button
              type="button"
              onClick={() => {
                onVenueSelect(null);
                onDraftVenue?.(null);
                setDraftPayload(null);
              }}
              className="p-1 rounded-full hover:bg-black/10 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className={`h-4.5 w-4.5 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180 text-blue-500' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                setOpen(false);
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
