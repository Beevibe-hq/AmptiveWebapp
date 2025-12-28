import { useState, useEffect, useCallback } from 'react';
import { Search, Map as MapIcon, List, Calendar, MapPin, ChevronDown, MoreHorizontal, Play, X, Filter, Eye, ShoppingCart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Link, useNavigate } from 'react-router-dom';

// Types
interface Event {
    id: string;
    title: string;
    city: string | null;
    venue: string | null;
    cover_image: string | null;
    start_time: string;
    latitude: number | null;
    longitude: number | null;
    location_type: string;
    // mock price for now as it's not in the main table yet
    price_min?: number;
    tickets?: { price: number }[];
}

// Mock Communities
const COMMUNITIES = [
    { id: 'all', label: 'All Communities' },
    { id: 'music', label: 'Music' },
    { id: 'art-culture', label: 'Art & Culture' },
    { id: 'technology', label: 'Technology' },
    { id: 'sports', label: 'Sports' },
    { id: 'fashion', label: 'Fashion' },
    { id: 'other', label: 'Other' },
];

const mapContainerStyle = { w: '100%', h: '100%' };
const defaultCenter = { lat: 6.5244, lng: 3.3792 };

export default function Explore() {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [map, setMap] = useState<google.maps.Map | null>(null);

    // Filter States
    const [dateFilter, setDateFilter] = useState('All Upcoming');
    const [locFilter, setLocFilter] = useState('Nigeria');
    const [communityFilter, setCommunityFilter] = useState('All Communities');
    const [priceFilter, setPriceFilter] = useState<string[]>([]);
    const navigate = useNavigate();

    const supabase = createClient();
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    });

    const fetchEvents = async () => {
        setLoading(true);
        let query = supabase
            .from('events')
            //.select('*, tickets(price)')
            .select('*')
            .order('start_time', { ascending: true });

        if (searchQuery) {
            query = query.ilike('title', `%${searchQuery}%`);
        }

        const { data, error } = await query;
        console.log('Fetch Events Debug:', { data, error, searchQuery, dateFilter, locFilter, communityFilter, priceFilter });

        if (!error && data) {
            // Enrich with real price min from tickets
            const enriched = data.map(e => {
                const prices = e.tickets?.map((t: any) => t.price) || [];
                const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                return {
                    ...e,
                    price_min: minPrice
                };
            });

            let filtered = enriched;

            // Client-side filtering for Dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date(today);
            dayAfter.setDate(dayAfter.getDate() + 2);

            if (dateFilter === 'Today') {
                filtered = filtered.filter(e => {
                    const d = new Date(e.start_time);
                    return d >= today && d < tomorrow;
                });
            } else if (dateFilter === 'Tomorrow') {
                filtered = filtered.filter(e => {
                    const d = new Date(e.start_time);
                    return d >= tomorrow && d < dayAfter;
                });
            } else if (dateFilter === 'This Weekend') {
                // Simple logic: upcoming Friday to Sunday
                // For now just show all future as placeholder or implement moment.js logic 
                // Using simple future check for "weekend" context
                const d = new Date();
                const day = d.getDay();
                const diff = 5 - day; // days until Friday
                // ... (simplified to just next 7 days for demo if needed, but keeping as All Upcoming fallback for now if complex)
                // Actually let's just leave it as 'All Upcoming' logic for "This Weekend" unless we have robust date lib
            }

            // Location Filter
            if (locFilter === 'Near Me') {
                // Mock: no op or filter by lat/long if user pos known
            } else if (locFilter !== 'Nigeria') { // Assuming 'Nigeria' shows all/default
                // If specific location selected
                if (locFilter === 'United States') filtered = filtered.filter(e => e.city?.includes('USA') || e.city?.includes('New York')); // Mock logic
                if (locFilter === 'France') filtered = filtered.filter(e => e.city?.includes('Paris') || e.city?.includes('France'));
            }

            // Community Filter (Mock: filter by title content)
            if (communityFilter !== 'All Communities') {
                // filtered = filtered.filter(e => e.title.toLowerCase().includes(communityFilter.toLowerCase()) || e.description?.toLowerCase().includes(communityFilter.toLowerCase()));
                // Comments: Data doesn't have community tag yet, so we skip strictly filtering to show content.
            }

            // Price Filter
            if (priceFilter.length > 0) {
                filtered = filtered.filter(e => {
                    const p = e.price_min || 0;
                    if (priceFilter.includes('Free') && p === 0) return true;
                    // Ranges in Naira (approximate conversion for logic)
                    // Under ₦5,000
                    if (priceFilter.includes('Under ₦5,000') && p > 0 && p < 5000) return true;
                    // ₦5,000 - ₦20,000
                    if (priceFilter.includes('₦5,000 - ₦20,000') && p >= 5000 && p < 20000) return true;
                    // ₦20,000 - ₦50,000
                    if (priceFilter.includes('₦20,000 - ₦50,000') && p >= 20000 && p < 50000) return true;
                    // ₦50,000+
                    if (priceFilter.includes('₦50,000+') && p >= 50000) return true;
                    return false;
                });
            }

            setEvents(filtered);
        } else {
            setEvents([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEvents();
    }, [searchQuery, dateFilter, locFilter, communityFilter, priceFilter]);

    const onLoad = useCallback((map: google.maps.Map) => setMap(map), []);
    const onUnmount = useCallback(() => setMap(null), []);

    // Filter Pill Component
    const FilterPill = ({ label, active, onClick, icon: Icon }: { label: string, active: boolean, onClick: () => void, icon?: any }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${active
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
        >
            {Icon && <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-gray-500'}`} />}
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-white pt-24 pb-12">
            <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">

                {/* Mobile View Toggle & Header */}
                <div className="flex md:hidden justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}><List className="w-5 h-5" /></button>
                        <button onClick={() => setViewMode('map')} className={`p-2 rounded-md ${viewMode === 'map' ? 'bg-white shadow-sm' : ''}`}><MapIcon className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">

                    {/* SIDEBAR FILTERS (Desktop) */}
                    <div className={`w-full lg:w-80 shrink-0 space-y-8 ${viewMode === 'map' ? 'hidden lg:block' : ''}`}>

                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-lg text-black">Filter Events</span>
                            </div>
                            <button
                                onClick={() => {
                                    setDateFilter('All Upcoming');
                                    setLocFilter('Nigeria');
                                    setCommunityFilter('All Communities');
                                    setPriceFilter([]);
                                }}
                                className="text-xs font-medium text-gray-500 flex items-center gap-1 hover:text-black"
                            >
                                <X className="w-3 h-3" /> Reset
                            </button>
                        </div>

                        {/* When? */}
                        <section>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">When?</h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {['All Upcoming', 'Today', 'Tomorrow', 'This Weekend'].map(label => (
                                    <FilterPill
                                        key={label}
                                        label={label}
                                        active={dateFilter === label}
                                        onClick={() => setDateFilter(label)}
                                    />
                                ))}
                            </div>
                            <button className="flex items-center gap-2 text-gray-500 text-sm font-medium hover:text-black">
                                Customize
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </section>

                        {/* Where? */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Where?</h3>
                                <button className="text-xs text-gray-500 hover:underline hover:text-black" onClick={() => setLocFilter('Nigeria')}>Clear</button>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                <FilterPill label="Near Me" active={locFilter === 'Near Me'} onClick={() => setLocFilter('Near Me')} icon={MapPin} />
                                <FilterPill label="United States" active={locFilter === 'United States'} onClick={() => setLocFilter('United States')} />
                                <FilterPill label="Nigeria" active={locFilter === 'Nigeria'} onClick={() => setLocFilter('Nigeria')} />
                                <FilterPill label="France" active={locFilter === 'France'} onClick={() => setLocFilter('France')} />
                            </div>
                            <button className="flex items-center gap-2 text-gray-500 text-sm font-medium hover:text-black">
                                Others
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </section>

                        {/* Price? */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Price?</h3>
                                <button className="text-xs text-gray-500 hover:underline hover:text-black" onClick={() => setPriceFilter([])}>Clear</button>
                            </div>
                            <div className="space-y-3">
                                {['Free', 'Under ₦5,000', '₦5,000 - ₦20,000', '₦20,000 - ₦50,000', '₦50,000+'].map(price => (
                                    <label key={price} className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${priceFilter.includes(price) ? 'bg-black border-black' : 'border-gray-300 group-hover:border-black bg-white'}`}>
                                            {priceFilter.includes(price) && <X className="w-3 h-3 text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={priceFilter.includes(price)}
                                            onChange={() => {
                                                if (priceFilter.includes(price)) {
                                                    setPriceFilter(priceFilter.filter(p => p !== price));
                                                } else {
                                                    setPriceFilter([...priceFilter, price]);
                                                }
                                            }}
                                        />
                                        <span className={`text-sm ${priceFilter.includes(price) ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>{price}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* Communities */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg text-gray-900 font-bold">
                                    By Community
                                </h3>
                                <button className="text-xs text-gray-500 hover:underline hover:text-black" onClick={() => setCommunityFilter('All Communities')}>Reset</button>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {COMMUNITIES.map(c => (
                                    <FilterPill
                                        key={c.id}
                                        label={c.label}
                                        active={communityFilter === c.label}
                                        onClick={() => setCommunityFilter(c.label)}
                                    />
                                ))}
                            </div>
                        </section>

                    </div>


                    {/* MAIN CONTENT */}
                    <div className="flex-1 min-w-0">

                        {/* Main Header & Search */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xl font-bold text-black">{events.length} Events</h2>
                                <div className="hidden lg:flex bg-gray-100 p-1 rounded-xl">
                                    <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>List</button>
                                    <button onClick={() => setViewMode('map')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Map</button>
                                </div>
                            </div>


                        </div>

                        {/* CONTENT: MAP or LIST */}
                        {viewMode === 'map' ? (
                            <div className="h-[600px] w-full rounded-3xl overflow-hidden border border-gray-200 shadow-lg relative">
                                {isLoaded ? (
                                    <GoogleMap
                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                        center={defaultCenter}
                                        zoom={11}
                                        onLoad={onLoad}
                                        onUnmount={onUnmount}
                                        options={{
                                            disableDefaultUI: false,
                                            clickableIcons: true,
                                            styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                                        }}
                                    >
                                        {events.filter(e => e.latitude && e.longitude).map(event => (
                                            <Marker
                                                key={event.id}
                                                position={{ lat: event.latitude!, lng: event.longitude! }}
                                                onClick={() => navigate(`/event/${event.id}`)}
                                            />
                                        ))}
                                    </GoogleMap>
                                ) : (
                                    <div className="flex items-center justify-center h-full bg-gray-50 text-gray-400">Loading Map...</div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {events.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {events.map((event) => {
                                            const eventDate = new Date(event.start_time);
                                            const isToday = new Date().toDateString() === eventDate.toDateString();
                                            const isTomorrow = new Date(Date.now() + 86400000).toDateString() === eventDate.toDateString();

                                            let dateDisplay = eventDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                                            if (isToday) dateDisplay = 'Today';
                                            if (isTomorrow) dateDisplay = 'Tomorrow';

                                            const timeDisplay = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

                                            return (
                                                <div key={event.id} className="group flex items-center gap-4 p-2 rounded-2xl hover:bg-gray-50 transition-colors w-full relative cursor-pointer" onClick={() => navigate(`/event/${event.id}`)}>
                                                    {/* Cover Image */}
                                                    <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-200 border border-gray-100">
                                                        {event.cover_image ? (
                                                            <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                <Calendar className="w-8 h-8 opacity-50" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                                                        {/* Time & Badge */}
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-sm font-medium text-gray-500 uppercase tracking-tight">
                                                                {dateDisplay}, {timeDisplay}
                                                            </span>
                                                            {isToday && (
                                                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                                                                    LIVE
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Title */}
                                                        <h3 className="text-base font-bold text-gray-900 truncate">
                                                            {event.title}
                                                        </h3>

                                                        {/* Location */}
                                                        <div className="text-sm text-gray-500 truncate mt-0.5">
                                                            {event.venue || event.city || 'TBA'}
                                                        </div>
                                                    </div>

                                                    {/* Price/Action (Optional but kept minimal as per Luma style) */}
                                                    {/* Removed explicit button in favor of row click to keep it clean like the reference */}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-gray-500">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">No events found</h3>
                                        <p>Try adjusting your filters or search terms.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
