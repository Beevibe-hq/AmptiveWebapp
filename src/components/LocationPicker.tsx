import { useState, useEffect, useRef } from 'react';
import {  MapPin , Loader2 } from "lucide-react";
import { AmptiveSpinner } from '@/components/AmptiveSpinner';
import { geocodeAddressQuery, tryDecodePlusCode } from '@/lib/geocoding';

interface LocationPickerProps {
    onLocationSelect: (venue: string, city: string, lat?: number, lng?: number) => void;
    initialVenue?: string;
    initialCity?: string;
}

interface TomTomResult {
    id: string;
    poi?: {
        name: string;
    };
    address: {
        freeformAddress: string;
        municipality?: string;
        countrySubdivision?: string;
        country?: string;
    };
    position: {
        lat: number;
        lon: number;
    };
}

export default function LocationPicker({
    onLocationSelect,
    initialVenue = '',
    initialCity = ''
}: LocationPickerProps) {
    const [venue, setVenue] = useState(initialVenue);
    const [city, setCity] = useState(initialCity);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<TomTomResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout>();
    const wrapperRef = useRef<HTMLDivElement>(null);

    const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY;
    const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Convert a Mapbox feature to the TomTomResult shape used throughout this component
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

            // Deduplicate by rough coordinate proximity (within ~200m)
            const deduped: TomTomResult[] = [];
            for (const r of allResults) {
                const isDup = deduped.some(d =>
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
        setSearchQuery(value);

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            searchPlaces(value);
        }, 300);
    };

    const handleSuggestionClick = (result: TomTomResult) => {
        const venueName = result.poi?.name || result.address.freeformAddress.split(',')[0];
        const cityName = result.address.municipality || result.address.countrySubdivision || '';

        const { lat, lon } = result.position;

        setVenue(venueName);
        setCity(cityName);
        setSearchQuery(venueName);
        setShowSuggestions(false);
        setSuggestions([]);

        onLocationSelect(venueName, cityName, lat, lon);
    };

    const handleVenueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setVenue(value);
        onLocationSelect(value, city);
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCity(value);
        onLocationSelect(venue, value);
    };

    // If no API keys at all, show manual inputs only
    if (!tomtomKey && !mapboxToken) {
        return (
            <div className="grid gap-6 sm:grid-cols-2">
                <div>
                    <input
                        type="text"
                        value={venue}
                        onChange={handleVenueChange}
                        className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                        placeholder="Venue Name"
                    />
                </div>
                <div>
                    <input
                        type="text"
                        value={city}
                        onChange={handleCityChange}
                        className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                        placeholder="City"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search Box with Autocomplete */}
            <div className="relative" ref={wrapperRef}>
                <div className="relative group">
                    <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-300 ${isSearching ? 'text-blue-500' : 'text-gray-400'} pointer-events-none z-10`} />

                    {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center">
                            <span className="relative flex h-5 w-5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <Loader2 className="relative inline-flex h-5 w-5 text-blue-500 animate-spin" />
                            </span>
                        </div>
                    )}

                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => (suggestions.length > 0 || searchQuery) && setShowSuggestions(true)}
                        placeholder="Search for a venue or location..."
                        className={`block w-full rounded-2xl pl-12 pr-12 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none transition-all duration-300 shadow-sm bg-black/5 ${isSearching
                                ? 'ring-2 ring-blue-500/20 bg-blue-50/30'
                                : 'focus:ring-4 focus:ring-blue-500/10'
                            }`}
                    />
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && (
                    <div className="absolute z-20 w-full mt-2 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden max-h-60 overflow-y-auto">
                        {suggestions.map((result) => (
                            <button
                                key={result.id}
                                type="button"
                                onClick={() => handleSuggestionClick(result)}
                                className="w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50"
                            >
                                <div className="font-medium text-gray-900 truncate">
                                    {result.poi?.name || result.address.freeformAddress.split(',')[0]}
                                </div>
                                <div className="text-sm text-gray-500 mt-0.5 truncate">
                                    {result.address.freeformAddress}
                                </div>
                            </button>
                        ))}

                        {/* "Use as is" Option */}
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={async () => {
                                    const { lat, lng, city: extractedCity } = await geocodeAddressQuery(searchQuery);
                                    const finalCity = extractedCity || city || searchQuery.split(',')[1]?.trim() || '';
                                    setVenue(searchQuery);
                                    if (finalCity) setCity(finalCity);
                                    setShowSuggestions(false);
                                    setSuggestions([]);
                                    onLocationSelect(searchQuery, finalCity, lat, lng);
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

            {/* Manual Input Fields */}
            <div className="grid gap-6 sm:grid-cols-2">
                <div>
                    <input
                        type="text"
                        value={venue}
                        onChange={handleVenueChange}
                        className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                        placeholder="Venue Name"
                    />
                </div>
                <div>
                    <input
                        type="text"
                        value={city}
                        onChange={handleCityChange}
                        className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                        placeholder="City"
                    />
                </div>
            </div>
        </div>
    );
}
