import { useState, useEffect, useRef } from 'react';
import {  MapPin, Globe, X , Loader2 } from "lucide-react";
import type { Venue, VenueCreateRequest } from '@/lib/api/venues';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';

interface VenueFormProps {
  initialVenue?: Venue | null;
  onSave: (venue: VenueCreateRequest) => void;
  onCancel: () => void;
  isInline?: boolean;
  onClear?: () => void;
  existingVenues?: Venue[];
  selectedVenueId?: string | null;
  onSelectVenue?: (venueId: string) => void;
  onDeleteVenue?: (venue: Venue) => void;
}

interface TomTomResult {
  id: string;
  poi?: { name: string };
  address: {
    freeformAddress: string;
    municipality?: string;
    countrySubdivision?: string;
    country?: string;
    postalCode?: string;
    streetNumber?: string;
    streetName?: string;
  };
  position: { lat: number; lon: number };
}

export default function VenueForm({
  initialVenue,
  onSave,
  onCancel,
  isInline = false,
  onClear,
  existingVenues,
  selectedVenueId,
  onSelectVenue,
  onDeleteVenue,
}: VenueFormProps) {
  const [venueType, setVenueType] = useState<'physical' | 'virtual'>(
    initialVenue?.venue_type || 'physical'
  );
  const [name, setName] = useState(
    initialVenue?.name || (initialVenue?.venue_type === 'virtual' ? 'Amptive App' : '')
  );
  const [description, setDescription] = useState(initialVenue?.description || '');
  const [addressLine1, setAddressLine1] = useState(initialVenue?.address_line1 || '');
  const [city, setCity] = useState(initialVenue?.city || '');
  const [state, setState] = useState(initialVenue?.state || '');
  const [country, setCountry] = useState(initialVenue?.country || '');
  const [postalCode, setPostalCode] = useState(initialVenue?.postal_code || '');
  const [latitude, setLatitude] = useState<number | null>(initialVenue?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialVenue?.longitude ?? null);
  const [placeId, setPlaceId] = useState(initialVenue?.place_id || '');
  const [placeProvider, setPlaceProvider] = useState(initialVenue?.place_provider || '');
  const [platformNote, setPlatformNote] = useState(initialVenue?.platform_note || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TomTomResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const apiKey = import.meta.env.VITE_TOMTOM_API_KEY;

  const isPhysicalAdded = venueType === 'physical' && !!addressLine1;
  const isVirtualAdded = venueType === 'virtual' && !!name && (!!platformNote || initialVenue?.venue_type === 'virtual');
  const isVenueAdded = isPhysicalAdded || isVirtualAdded;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlaces = async (query: string) => {
    if (!query.trim() || !apiKey) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${apiKey}&limit=5&language=en-US`
      );
      const data = await response.json();
      if (data.results) {
        setSuggestions(data.results);
        setShowSuggestions(true);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchPlaces(value), 300);
  };

  const handleSuggestionClick = (result: TomTomResult) => {
    const name = result.poi?.name || result.address.freeformAddress.split(',')[0];
    setName(name);
    setAddressLine1(result.address.freeformAddress);
    setCity(result.address.municipality || result.address.countrySubdivision || '');
    setState(result.address.countrySubdivision || '');
    setCountry(result.address.country || '');
    setPostalCode(result.address.postalCode || '');
    setLatitude(result.position.lat);
    setLongitude(result.position.lon);
    setPlaceId(result.id);
    setPlaceProvider('tomtom');
    setSearchQuery(name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const payload: VenueCreateRequest = {
      name: name.trim(),
      venue_type: venueType,
      description: description.trim() || null,
      address_line1: venueType === 'physical' ? addressLine1.trim() || null : null,
      city: venueType === 'physical' ? city.trim() || null : null,
      state: venueType === 'physical' ? state.trim() || null : null,
      country: venueType === 'physical' ? country.trim() || null : null,
      postal_code: venueType === 'physical' ? postalCode.trim() || null : null,
      latitude: venueType === 'physical' ? latitude : null,
      longitude: venueType === 'physical' ? longitude : null,
      place_id: venueType === 'physical' ? placeId || null : null,
      place_provider: venueType === 'physical' ? (placeProvider || null) : null,
      platform_note: venueType === 'virtual' ? platformNote.trim() || null : null,
    };
    onSave(payload);
  };

  const formContent = (
    <>
      <div className="flex items-center justify-between mb-4 lg:mb-6 flex-shrink-0">
        <h4 className="text-lg font-bold text-gray-900">
          {initialVenue ? 'Edit Venue' : 'Add Venue'}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 mb-6 px-1.5">
        {isVenueAdded && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Selected Location</label>
            <div className={`flex items-start gap-4 p-4.5 rounded-2xl border shadow-sm transition-all duration-200 ${
              venueType === 'physical'
                ? 'border-emerald-100 bg-emerald-50/30 text-gray-900'
                : 'border-blue-100 bg-blue-50/30 text-gray-900'
            }`}>
              <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                venueType === 'physical' ? 'bg-emerald-100/50 text-emerald-600' : 'bg-blue-100/50 text-blue-600'
              }`}>
                {venueType === 'physical' ? (
                  <MapPin className="h-5 w-5" />
                ) : (
                  <Globe className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm leading-snug text-gray-900 truncate">
                  {name || (venueType === 'virtual' ? 'Virtual Event' : 'Physical Venue')}
                </div>
                {venueType === 'physical' ? (
                  <>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {addressLine1}
                    </div>
                    {(city || state || country) && (
                      <div className="text-[11px] text-gray-400 mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                        {city && <span>{city}</span>}
                        {state && <span>• {state}</span>}
                        {country && <span>• {country}</span>}
                        {postalCode && <span>• {postalCode}</span>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {platformNote || 'Virtual link/details will be provided'}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddressLine1('');
                  setCity('');
                  setState('');
                  setCountry('');
                  setPostalCode('');
                  setLatitude(null);
                  setLongitude(null);
                  setPlaceId('');
                  setPlaceProvider('');
                  setSearchQuery('');
                  setName(venueType === 'virtual' ? 'Amptive App' : '');
                  setPlatformNote('');
                }}
                className={`p-1.5 rounded-full transition-colors shrink-0 ${
                  venueType === 'physical'
                    ? 'hover:bg-emerald-100 text-gray-400 hover:text-rose-500 hover:bg-rose-50'
                    : 'hover:bg-blue-100 text-gray-400 hover:text-rose-500 hover:bg-rose-50'
                }`}
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        )}

        {!isVenueAdded && (
          <>
            {existingVenues && existingVenues.length > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Already Added Venues</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {existingVenues.map((venue) => {
                    const isSelected = selectedVenueId === venue.venue_id;
                    return (
                      <div
                        key={venue.venue_id}
                        onClick={() => onSelectVenue?.(venue.venue_id)}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 relative group ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/20 shadow-sm'
                            : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          venue.venue_type === 'physical' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {venue.venue_type === 'physical' ? (
                            <MapPin className="h-4.5 w-4.5" />
                          ) : (
                            <Globe className="h-4.5 w-4.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <div className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700 font-bold' : 'text-gray-900'}`}>
                            {venue.name}
                          </div>
                          <div className="text-[11px] font-medium text-gray-400 truncate mt-0.5">
                            {venue.venue_type === 'physical'
                              ? [venue.city, venue.state].filter(Boolean).join(', ') || venue.address_line1
                              : venue.platform_note || 'On the App'}
                          </div>
                        </div>
                        {onDeleteVenue && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteVenue(venue);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Royal Hall"
                disabled={venueType === 'virtual'}
                className={`block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm ${venueType === 'virtual' ? 'bg-gray-100 cursor-not-allowed' : 'bg-black/5'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Venue Type</label>
              <div className="flex p-1.5 bg-gray-100/80 rounded-full relative isolate">
                <div
                  className={`absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] bg-white rounded-full shadow-sm transition-all duration-300 ease-out -z-10 ${
                    venueType === 'virtual' ? 'translate-x-[calc(100%+3px)]' : 'translate-x-0'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setVenueType('physical');
                    setName('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold transition-colors duration-300 ${
                    venueType === 'physical' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <MapPin className={`h-4 w-4 ${venueType === 'physical' ? 'text-emerald-500' : 'text-gray-400'}`} />
                  Physical
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVenueType('virtual');
                    setName('Amptive App');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold transition-colors duration-300 ${
                    venueType === 'virtual' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Globe className={`h-4 w-4 ${venueType === 'virtual' ? 'text-blue-500' : 'text-gray-400'}`} />
                  Virtual
                </button>
              </div>
            </div>

            {venueType === 'physical' ? (
              <div className="space-y-4">
                <div className="relative" ref={wrapperRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Address</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
                    {isSearching && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => (suggestions.length > 0 || searchQuery) && setShowSuggestions(true)}
                      placeholder="Search for an address..."
                      className="block w-full rounded-2xl pl-12 pr-12 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none transition-all duration-300 shadow-sm bg-black/5 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                  {showSuggestions && (
                    <div className="absolute z-20 w-full mt-2 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden max-h-60 overflow-y-auto">
                      {suggestions.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => handleSuggestionClick(result)}
                          className="w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900 truncate">
                            {result.poi?.name || result.address.freeformAddress.split(',')[0]}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5 truncate">
                            {result.address.freeformAddress}
                          </div>
                        </button>
                      ))}
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setName(searchQuery);
                            setAddressLine1(searchQuery);
                            setSearchQuery(searchQuery);
                            setShowSuggestions(false);
                            setSuggestions([]);
                          }}
                          className="w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors text-blue-600 font-medium flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4" />
                          Use "{searchQuery}"
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="42 Awolowo Road"
                      className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Lagos"
                      className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Lagos"
                      className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Nigeria"
                      className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="100001"
                      className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform Note</label>
                <textarea
                  value={platformNote}
                  onChange={(e) => setPlatformNote(e.target.value)}
                  placeholder="e.g. Link will be sent before event"
                  rows={3}
                  className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5 resize-none"
                />
                <p className="mt-2 text-xs text-gray-500">
                  This note will be displayed to attendees (e.g., how to access the virtual event).
                </p>
              </div>
            )}
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the venue"
            rows={2}
            className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="flex-1 px-6 py-3.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {initialVenue ? 'Update Venue' : 'Save Venue'}
        </button>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="px-6 py-3.5 rounded-full bg-rose-50 text-rose-600 text-sm font-semibold hover:bg-rose-100 transition-colors"
          >
            Clear Selection
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3.5 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </>
  );

  if (isInline) {
    return formContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {formContent}
      </div>
    </div>
  );
}
