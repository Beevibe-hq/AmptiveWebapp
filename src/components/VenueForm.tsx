import { useState, useEffect, useRef } from 'react';
import {  MapPin, Globe, X , Loader2 } from "lucide-react";
import type { Venue, VenueCreateRequest } from '@/lib/api/venues';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';
import VenuePinPicker from '@/components/VenuePinPicker';
import { geocodeAddressQuery, tryDecodePlusCode, getPlusCodeFromCoords } from '@/lib/geocoding';

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
  /** Google place id; present on suggestions whose coordinates are resolved on selection. */
  googlePlaceId?: string;
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
  // True once the organiser picks a suggestion or places the pin themselves — their
  // coordinates must not be replaced by a guess from the text they typed.
  const hasExplicitLocationRef = useRef(false);
  const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY;
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const isPhysicalAdded = false;
  const isVenueAdded = false;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mapboxToResult = (feature: any): TomTomResult => {
    const ctx = (type: string) => feature.context?.find((c: any) => c.id?.startsWith(type))?.text || '';
    return {
      id: feature.id || feature.properties?.mapbox_id || '',
      poi: feature.text ? { name: feature.text } : undefined,
      address: {
        freeformAddress: feature.place_name || '',
        municipality: ctx('place') || ctx('locality'),
        countrySubdivision: ctx('region'),
        country: ctx('country'),
        postalCode: ctx('postcode'),
      },
      position: {
        lat: feature.center?.[1] ?? feature.geometry?.coordinates?.[1] ?? 0,
        lon: feature.center?.[0] ?? feature.geometry?.coordinates?.[0] ?? 0,
      },
    };
  };

  const searchPlaces = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const allResults: TomTomResult[] = [];

      // Google first: it's the only source that indexes venue/business names organisers
      // actually type. Coordinates are resolved when a suggestion is picked, so typing
      // costs one autocomplete call rather than a lookup per prediction.
      if (googleKey) {
        try {
          const gRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': googleKey },
            body: JSON.stringify({ input: trimmed, includedRegionCodes: ['ng'] }),
          });
          const gData = await gRes.json();
          for (const suggestion of (gData?.suggestions || []).slice(0, 5)) {
            const prediction = suggestion.placePrediction;
            if (!prediction?.placeId) continue;
            allResults.push({
              id: `google_${prediction.placeId}`,
              googlePlaceId: prediction.placeId,
              poi: { name: prediction.structuredFormat?.mainText?.text || prediction.text?.text || trimmed },
              address: { freeformAddress: prediction.text?.text || '' },
              position: { lat: 0, lon: 0 },   // resolved on selection
            });
          }
        } catch { /* fall through to the other providers */ }
      }

      // Tier 0: Direct Geocoding Resolution (Landmarks, Plus Codes, Google URLs)
      const geoResult = await geocodeAddressQuery(trimmed);
      if (geoResult && geoResult.lat && geoResult.lng) {
        allResults.push({
          id: `geo_${Date.now()}`,
          poi: { name: trimmed },
          address: { freeformAddress: `${trimmed}, ${geoResult.city}` },
          position: { lat: geoResult.lat, lon: geoResult.lng }
        });
      }

      // Query variants (e.g. "MADhouse by Tikera Africa" -> "MADhouse Tikera Africa")
      const queryVariants = [
        trimmed,
        trimmed.replace(/\bby\b/gi, ' ').replace(/\s+/g, ' ').trim()
      ].filter(Boolean);

      for (const qVar of queryVariants) {
        if (mapboxToken) {
          try {
            const mbRes = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(qVar)}.json?access_token=${mapboxToken}&limit=5&proximity=3.3792,6.5244&country=ng&language=en`
            );
            const mbData = await mbRes.json();
            if (mbData.features && mbData.features.length > 0) {
              allResults.push(...mbData.features.map(mapboxToResult));
            }
          } catch { /* proceed */ }
        }

        if (tomtomKey) {
          try {
            const ttRes = await fetch(
              `https://api.tomtom.com/search/2/search/${encodeURIComponent(qVar)}.json?key=${tomtomKey}&limit=5&language=en-US&countrySet=NG&lat=6.5244&lon=3.3792`
            );
            const ttData = await ttRes.json();
            if (ttData.results) {
              allResults.push(...ttData.results);
            }
          } catch { /* proceed */ }
        }
      }

      // Deduplicate by rough coordinate proximity (within ~200m). Google suggestions have
      // no coordinates yet, so they're de-duplicated by their text instead — comparing
      // their placeholder 0,0 positions would collapse them all into one.
      const deduped: TomTomResult[] = [];
      for (const r of allResults) {
        const isDup = r.googlePlaceId
          ? deduped.some(d => d.address.freeformAddress === r.address.freeformAddress)
          : deduped.some(d =>
              !d.googlePlaceId &&
              Math.abs(d.position.lat - r.position.lat) < 0.002 &&
              Math.abs(d.position.lon - r.position.lon) < 0.002
            );
        if (!isDup) deduped.push(r);
      }

      setSuggestions(deduped.slice(0, 8));
      setShowSuggestions(deduped.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    hasExplicitLocationRef.current = false;
    setSearchQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchPlaces(value), 300);
  };

  // Auto-geocode live as user types in venue name or address if coordinates are not set yet
  useEffect(() => {
    const targetText = [name, addressLine1, searchQuery].filter(Boolean).join(' ').trim();
    if (!targetText || (latitude != null && longitude != null)) return;

    const autoTimer = setTimeout(async () => {
      const { lat, lng, city: extractedCity } = await geocodeAddressQuery(targetText);
      // A picked suggestion (or a dragged pin) is authoritative. Without this check the
      // guess from the half-typed query lands after the exact coordinates and overwrites
      // them — which is how a chosen venue ended up back at the city centre.
      if (hasExplicitLocationRef.current) return;
      if (lat && lng) {
        setLatitude(lat);
        setLongitude(lng);
        if (extractedCity && !city) setCity(extractedCity);
      }
    }, 500);

    return () => clearTimeout(autoTimer);
  }, [name, addressLine1, searchQuery, latitude, longitude, city]);

  const handleSuggestionClick = async (result: TomTomResult) => {
    hasExplicitLocationRef.current = true;
    const venueName = (result.poi?.name || result.address.freeformAddress.split(',')[0]).trim();
    setName(venueName);
    setAddressLine1(result.address.freeformAddress || '');
    setCity(result.address.municipality || result.address.countrySubdivision || '');
    setState(result.address.countrySubdivision || '');
    setCountry(result.address.country || '');
    setPostalCode(result.address.postalCode || '');
    setSearchQuery(venueName);
    setShowSuggestions(false);
    setSuggestions([]);

    if (result.googlePlaceId) {
      // Google suggestions carry no coordinates; fetch the exact point for the chosen place.
      setPlaceId(result.googlePlaceId);
      setPlaceProvider('google');
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://places.googleapis.com/v1/places/${result.googlePlaceId}?fields=location,addressComponents`,
          { headers: { 'X-Goog-Api-Key': googleKey } }
        );
        const place = await res.json();
        const loc = place?.location;
        if (loc?.latitude != null && loc?.longitude != null) {
          setLatitude(Number(loc.latitude));
          setLongitude(Number(loc.longitude));
        }
        const component = (type: string) =>
          place?.addressComponents?.find((c: any) => c.types?.includes(type))?.longText || '';
        const locality = component('locality') || component('administrative_area_level_2');
        if (locality) setCity(locality);
        const region = component('administrative_area_level_1');
        if (region) setState(region);
        const nation = component('country');
        if (nation) setCountry(nation);
        const postal = component('postal_code');
        if (postal) setPostalCode(postal);
      } catch {
        // Fall back to geocoding the text if the details lookup fails.
        const geo = await geocodeAddressQuery(result.address.freeformAddress || venueName);
        if (geo?.lat && geo?.lng) {
          setLatitude(geo.lat);
          setLongitude(geo.lng);
        }
      } finally {
        setIsSearching(false);
      }
      return;
    }

    setLatitude(result.position.lat);
    setLongitude(result.position.lon);
    setPlaceId(result.id);
    setPlaceProvider('mapbox');
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    let finalLat = latitude;
    let finalLng = longitude;

    if (venueType === 'physical' && (!finalLat || !finalLng)) {
      const queryParts = [name, addressLine1, city, state, country].filter(Boolean);
      if (queryParts.length > 0) {
        const geoResult = await geocodeAddressQuery(queryParts.join(', '));
        finalLat = geoResult.lat;
        finalLng = geoResult.lng;
      }
    }

    const payload: VenueCreateRequest = {
      name: name.trim(),
      venue_type: venueType,
      description: description.trim() || null,
      address_line1: venueType === 'physical' ? addressLine1.trim() || null : null,
      city: venueType === 'physical' ? city.trim() || null : null,
      state: venueType === 'physical' ? state.trim() || null : null,
      country: venueType === 'physical' ? country.trim() || null : null,
      postal_code: venueType === 'physical' ? postalCode.trim() || null : null,
      latitude: venueType === 'physical' ? finalLat : null,
      longitude: venueType === 'physical' ? finalLng : null,
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
          {venueType === 'virtual' ? 'Select Venue' : (initialVenue ? 'Edit Venue' : 'Add Venue')}
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
              {venueType === 'virtual' && (
                <p className="mt-2.5 text-xs text-blue-600 font-semibold leading-relaxed px-1">
                  Note: You will have to download the Amptive mobile app to be able to go live in your event.
                </p>
              )}
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
                          onClick={async () => {
                            const trimmed = searchQuery.trim();
                            setName(trimmed);
                            setAddressLine1(trimmed);
                            setShowSuggestions(false);
                            setSuggestions([]);

                            const { lat, lng, city: extractedCity } = await geocodeAddressQuery(trimmed);
                            setLatitude(lat);
                            setLongitude(lng);
                            if (extractedCity && !city) setCity(extractedCity);
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

                {/* Confirming the pin is what gives the Explore map an exact position.
                    It is pre-filled from the chosen address, and entirely optional. */}
                <VenuePinPicker
                  latitude={latitude}
                  longitude={longitude}
                  fallbackCity={city}
                  initiallyConfirmed={initialVenue?.latitude != null && initialVenue?.longitude != null}
                  onChange={(lat, lng) => {
                    hasExplicitLocationRef.current = true;
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />

                {latitude != null && longitude != null && (
                  <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200/80 rounded-2xl p-3.5 mt-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0 font-bold text-[10px]">
                        PLUS CODE
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-gray-900 truncate block">
                          {getPlusCodeFromCoords(latitude, longitude)}
                        </span>
                        <span className="text-[11px] text-gray-500 truncate block">
                          Exact 3m × 3m location generated automatically
                        </span>
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-blue-600 font-semibold hover:underline"
                    >
                      View on Google Maps ↗
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform Note</label>
                  <textarea
                    value={platformNote}
                    onChange={(e) => setPlatformNote(e.target.value)}
                    placeholder="e.g. Link will be sent before event. This note will be displayed to attendees."
                    rows={2}
                    className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5 resize-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    This note will be displayed to attendees (e.g., how to access the virtual event).
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {venueType === 'physical' && (
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
        )}
      </div>

      <div className="flex gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="flex-1 px-6 py-3.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {venueType === 'virtual' ? 'Select' : (initialVenue ? 'Update Venue' : 'Save Venue')}
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
