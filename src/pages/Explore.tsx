import { useState, useEffect, useCallback } from 'react';
import { Search, Map as MapIcon, List, Calendar, MapPin, ChevronDown, X } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { listEvents, StandaloneEvent } from '@/lib/api/events';
import { Link, useNavigate } from 'react-router-dom';
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';


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

const defaultCenter = { lat: 6.5244, lng: 3.3792 };

export default function Explore() {
    const [viewMode, setViewMode] = useState<'list' | 'map'>(() => sessionStorage.getItem('explore_viewMode') as 'list' | 'map' || 'list');
    const [searchQuery, _setSearchQuery] = useState(() => sessionStorage.getItem('explore_searchQuery') || '');
    const [events, setEvents] = useState<StandaloneEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [map, setMap] = useState<google.maps.Map | null>(null);

    // Filter States - Persisted
    const [dateFilter, setDateFilter] = useState(() => sessionStorage.getItem('explore_dateFilter') || 'All Upcoming');
    const [locFilter, setLocFilter] = useState(() => sessionStorage.getItem('explore_locFilter') || 'Nigeria');
    const [communityFilter, setCommunityFilter] = useState(() => sessionStorage.getItem('explore_communityFilter') || 'All Communities');
    const [priceFilter, setPriceFilter] = useState<string[]>(() => {
        const stored = sessionStorage.getItem('explore_priceFilter');
        return stored ? JSON.parse(stored) : [];
    });
    // Custom Date Range State
    const [customStartDate, setCustomStartDate] = useState(() => sessionStorage.getItem('explore_customStartDate') || '');
    const [customEndDate, setCustomEndDate] = useState(() => sessionStorage.getItem('explore_customEndDate') || '');
    const [showCustomDate, setShowCustomDate] = useState(false);

    // Persist effect
    useEffect(() => {
        sessionStorage.setItem('explore_viewMode', viewMode);
        sessionStorage.setItem('explore_searchQuery', searchQuery);
        sessionStorage.setItem('explore_dateFilter', dateFilter);
        sessionStorage.setItem('explore_locFilter', locFilter);
        sessionStorage.setItem('explore_communityFilter', communityFilter);
        sessionStorage.setItem('explore_priceFilter', JSON.stringify(priceFilter));
        sessionStorage.setItem('explore_customStartDate', customStartDate);
        sessionStorage.setItem('explore_customEndDate', customEndDate);
    }, [viewMode, searchQuery, dateFilter, locFilter, communityFilter, priceFilter, customStartDate, customEndDate]);

    const navigate = useNavigate();
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    });

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const eventsData = await listEvents({ page_size: 100 });

            let enriched: any[] = [];
            if (eventsData && eventsData.length > 0) {
                enriched = eventsData.map(e => ({
                    ...e,
                    price_min: 0
                }));
            }

            let filtered = enriched;

            if (dateFilter === 'All Upcoming') {
                const now = new Date();
                filtered = enriched.filter(e => {
                    const eventDate = new Date(e.scheduled_for);
                    return eventDate >= now;
                });
            } else if (dateFilter === 'Today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                filtered = enriched.filter(e => {
                    const eventDate = new Date(e.scheduled_for);
                    return eventDate >= today && eventDate < tomorrow;
                });
            } else if (dateFilter === 'Tomorrow') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dayAfter = new Date(today);
                dayAfter.setDate(dayAfter.getDate() + 2);
                filtered = enriched.filter(e => {
                    const eventDate = new Date(e.scheduled_for);
                    return eventDate >= tomorrow && eventDate < dayAfter;
                });
            } else if (dateFilter) {
                filtered = enriched.filter(e => {
                    const eventDate = new Date(e.scheduled_for);
                    const eventMonth = eventDate.toLocaleString('default', { month: 'long' });
                    return eventMonth === dateFilter;
                });
            }

            if (searchQuery && searchQuery.length > 0) {
                filtered = filtered.filter(e => {
                    const searchLower = searchQuery.toLowerCase();
                    const venueStr = e.location?.venue || e.venue?.name || '';
                    const cityStr = e.location?.city || e.venue?.city || '';
                    return e.title.toLowerCase().includes(searchLower) ||
                        venueStr.toLowerCase().includes(searchLower) ||
                        cityStr.toLowerCase().includes(searchLower);
                });
            }

            // todo: add location type in response of events
            // if (locFilter !== 'All Locations') {
            //     filtered = filtered.filter(e => e.location_type === locFilter);
            // }

            if (priceFilter.includes('Free')) {
                filtered = filtered.filter(e => e.price_min === 0);
            } else if (priceFilter.includes('Paid')) {
                filtered = filtered.filter(e => e.price_min > 0);
            }

            setEvents(filtered);
        } catch (error) {
            console.error('Error fetching events:', error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
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
                                        onClick={() => {
                                            setDateFilter(label);
                                            setShowCustomDate(false);
                                        }}
                                    />
                                ))}
                            </div>


                            {showCustomDate && (
                                <>
                                    {/* Backdrop */}
                                    <div
                                        className="fixed inset-0 bg-black/20 z-40"
                                        onClick={() => setShowCustomDate(false)}
                                    />

                                    {/* Calendar Popup */}
                                    <div className="fixed left-4 top-32 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-bold text-gray-900">Select Date Range</h4>
                                            <button
                                                onClick={() => setShowCustomDate(false)}
                                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <ReactCalendar
                                            selectRange={true}
                                            onChange={(value: any) => {
                                                if (Array.isArray(value) && value.length === 2) {
                                                    const [start, end] = value;
                                                    setCustomStartDate(start.toISOString().split('T')[0]);
                                                    setCustomEndDate(end.toISOString().split('T')[0]);
                                                    setDateFilter('Custom');
                                                }
                                            }}
                                            value={
                                                customStartDate && customEndDate
                                                    ? [new Date(customStartDate), new Date(customEndDate)]
                                                    : null
                                            }
                                            className="border-0 w-full"
                                        />

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                            <div className="text-sm text-gray-600">
                                                {customStartDate && customEndDate ? (
                                                    <span>
                                                        {new Date(customStartDate).toLocaleDateString()} - {new Date(customEndDate).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">Select a date range</span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setShowCustomDate(false)}
                                                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            <button
                                onClick={() => setShowCustomDate(!showCustomDate)}
                                className={`flex items-center gap-2 text-sm font-medium hover:text-black ${dateFilter === 'Custom' ? 'text-black' : 'text-gray-500'}`}
                            >
                                Customize
                                <ChevronDown className={`w-4 h-4 transition-transform ${showCustomDate ? 'rotate-180' : ''}`} />
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
                                        {events.filter(e => e.location?.latitude && e.location?.longitude).map(event => (
                                            <Marker
                                                key={event.event_id}
                                                position={{ lat: event.location?.latitude!, lng: event.location?.longitude! }}
                                                onClick={() => navigate(`/events/${event.event_id}`)}
                                            />
                                        ))}
                                    </GoogleMap>
                                ) : (
                                    <div className="flex items-center justify-center h-full bg-gray-50 text-gray-400">Loading Map...</div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {loading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[...Array(8)].map((_, i) => (
                                            <div key={i} className="flex items-center gap-4 p-2 rounded-2xl w-full">
                                                <div className="w-20 h-20 shrink-0 rounded-xl bg-gray-100 animate-pulse" />
                                                <div className="flex-1 space-y-3 py-1">
                                                    <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
                                                    <div className="h-5 bg-gray-100 rounded w-3/4 animate-pulse" />
                                                    <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : events.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
                                        {events.map((event, index) => {
                                            const eventDate = new Date(event.scheduled_for!);
                                            const isToday = new Date().toDateString() === eventDate.toDateString();
                                            const isTomorrow = new Date(Date.now() + 86400000).toDateString() === eventDate.toDateString();

                                            let dateDisplay = eventDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                                            if (isToday) dateDisplay = 'Today';
                                            if (isTomorrow) dateDisplay = 'Tomorrow';

                                            const timeDisplay = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

                                            return (
                                                <Link
                                                    key={event.event_id}
                                                    to={`/events/${event.event_id}`}
                                                    className="group flex items-center gap-4 p-2 rounded-2xl hover:bg-gray-50 transition-colors w-full relative cursor-pointer block"
                                                    style={{ animationDelay: `${index * 50}ms` }}
                                                >
                                                    {/* Cover Image */}
                                                    <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-200 border border-gray-100 group-hover:scale-[1.02] transition-transform duration-500">
                                                        {event.thumbnail_url ? (
                                                            <img src={event.thumbnail_url} alt={event.title} className="w-full h-full object-cover" />
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
                                                        <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-black transition-colors">
                                                            {event.title}
                                                        </h3>

                                                        {/* Location */}
                                                        <div className="text-sm text-gray-500 truncate mt-0.5">
                                                            {event.location?.venue || event.location?.city || 'TBA'}
                                                        </div>
                                                    </div>
                                                </Link>
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
