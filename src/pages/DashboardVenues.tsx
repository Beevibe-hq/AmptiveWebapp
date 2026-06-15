import { useEffect, useState } from 'react';
import { Plus, MapPin, Globe, Edit2, Trash2 } from 'lucide-react';
import { listVenues, deleteVenue, createVenue, updateVenue } from '@/lib/api/venues';
import type { Venue, VenueCreateRequest } from '@/lib/api/venues';
import { toastSuccess, toastError } from '@/lib/ui/toast';
import VenueForm from '@/components/VenueForm';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';

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
        <div className="flex items-center justify-center py-20">
          <AmptiveSpinner className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : venues.length === 0 ? (
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
        <div className="grid gap-4 max-w-3xl">
          {venues.map((venue) => (
            <div
              key={venue.venue_id}
              className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
            >
              <div className={`p-3 rounded-xl shrink-0 ${
                venue.venue_type === 'physical' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {venue.venue_type === 'physical' ? (
                  <MapPin className="h-5 w-5" />
                ) : (
                  <Globe className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{venue.name}</h3>
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    venue.venue_type === 'physical'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {venue.venue_type}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {venue.venue_type === 'physical'
                    ? [venue.address_line1, venue.city, venue.state, venue.country].filter(Boolean).join(', ')
                    : venue.platform_note || 'On the App'}
                </p>
                {venue.venue_type === 'physical' && venue.latitude && venue.longitude && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {venue.latitude.toFixed(4)}, {venue.longitude.toFixed(4)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditingVenue(venue);
                    setShowForm(true);
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(venue)}
                  className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
