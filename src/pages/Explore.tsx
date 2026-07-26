import { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, List, Calendar, MapPin, ChevronDown, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { listEvents, StandaloneEvent } from '@/lib/api/events';
import { listCommunities, type Community } from '@/lib/api/communities';
import { getVenue } from '@/lib/api/venues';
import { getProfileByUserId } from '@/lib/api/profiles';
import { getTicketsForEvent } from '@/lib/api/tickets';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    lagos: { lat: 6.5244, lng: 3.3792 },
    lekki: { lat: 6.4698, lng: 3.5852 },
    ikeja: { lat: 6.6018, lng: 3.3515 },
    'victoria island': { lat: 6.4281, lng: 3.4219 },
    vi: { lat: 6.4281, lng: 3.4219 },
    ikoyi: { lat: 6.4549, lng: 3.4316 },
    yaba: { lat: 6.5095, lng: 3.3711 },
    surulere: { lat: 6.4974, lng: 3.3567 },
    abuja: { lat: 9.0765, lng: 7.3986 },
    'port harcourt': { lat: 4.8156, lng: 7.0498 },
    ibadan: { lat: 7.3775, lng: 3.9470 },
    kano: { lat: 12.0022, lng: 8.5920 },
    enugu: { lat: 6.4584, lng: 7.5464 },
    benin: { lat: 6.3350, lng: 5.6037 },
    london: { lat: 51.5074, lng: -0.1278 },
    'new york': { lat: 40.7128, lng: -74.0060 },
    'united states': { lat: 37.0902, lng: -95.7129 },
    usa: { lat: 37.0902, lng: -95.7129 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    california: { lat: 36.7783, lng: -119.4179 },
    miami: { lat: 25.7617, lng: -80.1918 },
    chicago: { lat: 41.8781, lng: -87.6298 },
    houston: { lat: 29.7604, lng: -95.3698 },
    texas: { lat: 31.9686, lng: -99.9018 },
    paris: { lat: 48.8566, lng: 2.3522 },
    france: { lat: 46.2276, lng: 2.2137 }
};

function getEventCoords(event: StandaloneEvent, index: number): { lat: number; lng: number } | null {
    // 1. Direct explicit latitude/longitude check across various potential property names
    const lat = Number(
        event.location?.latitude ?? 
        event.venue?.latitude ?? 
        (event as any).latitude ?? 
        (event as any).lat ?? 
        (event as any).location_latitude
    );
    const lng = Number(
        event.location?.longitude ?? 
        event.venue?.longitude ?? 
        (event as any).longitude ?? 
        (event as any).lng ?? 
        (event as any).location_longitude
    );

    if (lat && lng && !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        return { lat, lng };
    }

    // 2. Virtual events do not need physical map pins
    if (event.venue?.venue_type === 'virtual' || event.location?.type === 'online') {
        return null;
    }

    // 3. Check city/venue name substring match against known city coordinates
    const locationText = [
        event.location?.city,
        event.venue?.city,
        event.location?.venue,
        event.venue?.name,
        event.venue?.address_line1,
        event.venue?.state
    ].filter(Boolean).join(' ').toLowerCase();

    for (const [cityName, coords] of Object.entries(CITY_COORDS)) {
        if (locationText.includes(cityName)) {
            // Apply slight deterministic spread offset so pins in the same city don't stack directly on top of each other
            const angle = (index * 137.5) * (Math.PI / 180);
            const radius = 0.008 * Math.sqrt(index + 1);
            return {
                lat: coords.lat + Math.cos(angle) * radius,
                lng: coords.lng + Math.sin(angle) * radius
            };
        }
    }

    // 4. Fallback for any physical event: place on default Lagos region with a slight offset based on index
    const angle = (index * 137.5) * (Math.PI / 180);
    const radius = 0.01 * Math.sqrt(index + 1);
    return {
        lat: 6.5244 + Math.cos(angle) * radius,
        lng: 3.3792 + Math.sin(angle) * radius
    };
}

const LOCATION_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
    'united states': { lat: 37.0902, lng: -95.7129, zoom: 4 },
    'us': { lat: 37.0902, lng: -95.7129, zoom: 4 },
    'usa': { lat: 37.0902, lng: -95.7129, zoom: 4 },
    'france': { lat: 46.2276, lng: 2.2137, zoom: 6 },
    'nigeria': { lat: 9.0820, lng: 8.6753, zoom: 6 },
    'near me': { lat: 6.5244, lng: 3.3792, zoom: 11 },
    'amptive app': { lat: 6.5244, lng: 3.3792, zoom: 11 }
};

function ExploreLeafletMap({ events, locFilter, onSelectEvent }: { events: StandaloneEvent[]; locFilter?: string; onSelectEvent: (eventId: string) => void }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const [rotationDeg, setRotationDeg] = useState(0);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        if (mapRef.current) {
            const mapPane = mapRef.current.querySelector('.leaflet-map-pane') as HTMLElement;
            if (mapPane) {
                const scaleVal = rotationDeg === 0 ? 1 : 1.45;
                mapPane.style.transform = `rotate(${rotationDeg}deg) scale(${scaleVal})`;
                mapPane.style.transformOrigin = 'center center';
                mapPane.style.transition = isDraggingRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
            }
        }
    }, [rotationDeg]);

    useEffect(() => {
        if (!mapRef.current) return;

        if (!mapInstance.current) {
            const map = L.map(mapRef.current, {
                center: [6.5244, 3.3792],
                zoom: 11,
                zoomControl: false,
                attributionControl: false,
            });

            L.control.zoom({ position: 'bottomright' }).addTo(map);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; Esri &copy; OpenStreetMap',
                maxZoom: 19
            }).addTo(map);

            mapInstance.current = map;
        }

        const map = mapInstance.current;

        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 150);

        // Clear previous markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        const bounds = L.latLngBounds([]);
        let hasCoords = false;

        events.forEach((event, idx) => {
            const coords = getEventCoords(event, idx);

            if (coords) {
                hasCoords = true;
                bounds.extend([coords.lat, coords.lng]);

                const hostAvatar = event.host?.profile_picture || (event.host as any)?.avatar_url || (event.host as any)?.profile_image_url || (event as any).host_avatar_url || (event as any).user_avatar;
                const avatarSrc = hostAvatar || '/images/IMG_6053 2.JPG';
                const hostName = event.host?.name || event.host?.username || 'Host';

                const iconHtml = `
                    <div class="custom-pin-wrapper" style="position: relative; display: inline-flex; flex-direction: column; align-items: center; cursor: pointer;">
                        <div class="custom-pin-circle" style="width: 48px; height: 48px; border-radius: 50%; background: #ffffff; border: 4px solid #ffffff; box-sizing: border-box; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                            <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/images/IMG_6053 2.JPG';" />
                        </div>
                        <div class="custom-pin-tail" style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #ffffff; margin-top: -2px;"></div>
                    </div>
                `;

                const eventIcon = L.divIcon({
                    className: 'custom-explore-pin',
                    html: iconHtml,
                    iconSize: [48, 56],
                    iconAnchor: [24, 56],
                    popupAnchor: [0, -56]
                });

                const dateStr = event.scheduled_for 
                    ? new Date(event.scheduled_for).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                    : 'Upcoming';

                const venueTitle = event.venue?.name || event.location?.venue || event.location?.city || 'Venue Location';
                const venueSub = 'Location';
                const locationSubStr = [event.venue?.name || event.location?.venue, event.venue?.city || event.location?.city].filter(Boolean).join(', ') || 'Venue';
                
                // Format price exactly as on homepage
                let priceDisplay = 'Free';
                const tickets = event.ticket_types || (event as any).event_tickets;
                const rawPrice = Number((event as any).min_price ?? (event as any).price ?? (event as any).price_min);

                if (Array.isArray(tickets) && tickets.length > 0) {
                    const validPrices = tickets.map((t: any) => Number(t.price)).filter(p => !isNaN(p));
                    if (validPrices.length > 0) {
                        const minP = Math.min(...validPrices);
                        priceDisplay = minP === 0 ? 'Free' : `₦${minP.toLocaleString()}`;
                    }
                } else if (!isNaN(rawPrice) && rawPrice > 0) {
                    priceDisplay = `₦${rawPrice.toLocaleString()}`;
                } else if (event.show_type === 'free') {
                    priceDisplay = 'Free';
                }

                const popupContent = `
                    <div id="btn-explore-${event.event_id}" style="width: 310px; background-color: #f4f4eb; border-radius: 24px; padding: 14px; box-shadow: 0 16px 36px rgba(0,0,0,0.16); font-family: system-ui, -apple-system, sans-serif; cursor: pointer; border: 1px solid rgba(0,0,0,0.05); user-select: none;">
                        <!-- Header -->
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 0 4px;">
                            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                                <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(59,130,246,0.3);">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                </div>
                                <div style="min-width: 0;">
                                    <div style="font-size: 14px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                                        ${venueTitle}
                                    </div>
                                    <div style="font-size: 12px; color: #6b7280; font-weight: 500;">
                                        ${venueSub}
                                    </div>
                                </div>
                            </div>
                            <div style="color: #6b7280; display: flex; align-items: center;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </div>
                        </div>

                        <!-- Inner Card -->
                        <div style="background-color: #ffffff; border-radius: 18px; padding: 12px; display: flex; gap: 12px; border: 1px solid rgba(0,0,0,0.04); box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                            <!-- Image Thumbnail -->
                            <div style="position: relative; width: 84px; height: 84px; border-radius: 14px; overflow: hidden; background-color: #e5e7eb; flex-shrink: 0;">
                                <img src="${event.thumbnail_url || avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/images/IMG_6053 2.JPG';" />
                            </div>

                            <!-- Details -->
                            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                                <div style="font-size: 11px; font-weight: 600; color: #4b5563; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
                                    <span style="color: #ef4444; font-size: 12px;">📅</span> ${dateStr}
                                </div>
                                <div style="font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${event.title}
                                </div>
                                <div style="font-size: 12px; color: #4b5563; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${locationSubStr}
                                </div>
                                <div style="display: inline-flex; align-self: flex-start; border: 1px solid #d1d5db; border-radius: 8px; padding: 2px 10px; font-size: 11px; font-weight: 700; color: #111827; background: #ffffff;">
                                    ${priceDisplay}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                const marker = L.marker([coords.lat, coords.lng], { icon: eventIcon }).addTo(map);
                marker.bindPopup(popupContent, {
                    closeButton: false,
                    className: 'custom-leaflet-popup'
                });

                marker.on('popupopen', () => {
                    const btn = document.getElementById(`btn-explore-${event.event_id}`);
                    if (btn) {
                        btn.onclick = () => onSelectEvent(event.event_id);
                    }
                });
            }
        });

        if (hasCoords && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        } else {
            const key = (locFilter || '').toLowerCase();
            const center = LOCATION_CENTERS[key] || { lat: 6.5244, lng: 3.3792, zoom: 11 };
            map.setView([center.lat, center.lng], center.zoom);
        }

        return () => {
            clearTimeout(timer);
        };
    }, [events, locFilter, onSelectEvent]);

    return (
        <div className="relative h-[600px] w-full rounded-3xl overflow-hidden border border-gray-200 shadow-lg bg-gray-50">
            <style>{`
                .leaflet-tile-pane {
                    filter: saturate(1.18) contrast(1.03) brightness(1.01) hue-rotate(-2deg);
                }
                .leaflet-control-zoom {
                    border: none !important;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
                    border-radius: 14px !important;
                    overflow: hidden !important;
                    background: rgba(255, 255, 255, 0.85) !important;
                    backdrop-filter: blur(16px) !important;
                    -webkit-backdrop-filter: blur(16px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.6) !important;
                }
                .leaflet-control-zoom-in, .leaflet-control-zoom-out {
                    background: transparent !important;
                    color: #1c1c1e !important;
                    border: none !important;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif !important;
                    font-weight: 600 !important;
                    font-size: 16px !important;
                    width: 36px !important;
                    height: 36px !important;
                    line-height: 36px !important;
                    transition: background 0.2s ease !important;
                }
                .leaflet-control-zoom-in:hover, .leaflet-control-zoom-out:hover {
                    background: rgba(0, 0, 0, 0.06) !important;
                }
                .leaflet-control-zoom-in {
                    border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
                }
                .custom-explore-pin {
                    background: transparent !important;
                    border: none !important;
                    overflow: visible !important;
                }
                .custom-explore-pin:hover {
                    z-index: 999999 !important;
                }
                .custom-pin-wrapper {
                    transform-origin: 50% 100%;
                    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: transform;
                }
                .custom-pin-circle {
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
                    transition: box-shadow 0.25s ease;
                }
                .custom-pin-tail {
                    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.12));
                }
                .custom-explore-pin:hover .custom-pin-wrapper,
                .custom-pin-wrapper:hover {
                    transform: scale(1.15) translateY(-3px);
                }
                .custom-explore-pin:hover .custom-pin-circle,
                .custom-pin-wrapper:hover .custom-pin-circle {
                    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.26);
                }
                .custom-leaflet-popup .leaflet-popup-content-wrapper {
                    background: transparent !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    border-radius: 24px !important;
                }
                .custom-leaflet-popup .leaflet-popup-content {
                    margin: 0 !important;
                    width: auto !important;
                }
                .custom-leaflet-popup .leaflet-popup-tip-container {
                    display: none !important;
                }
                .mk-rotation-control {
                    position: absolute;
                    top: 14px;
                    right: 14px;
                    z-index: 30;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.92);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    user-select: none;
                    transition: transform 0.2s ease, background 0.2s ease;
                }
                .mk-rotation-control:hover {
                    background: #ffffff;
                    transform: scale(1.06);
                }
                .mk-rotation-slider {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    cursor: pointer;
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    z-index: 2;
                }
            `}</style>
            <div ref={mapRef} className="absolute inset-0 h-full w-full z-10" />
            <div 
                title="Rotate the map (Drag slider to rotate, Click to reset North)" 
                aria-label="Rotate the map" 
                className="mk-control mk-rotation-control mk-with-zoom-control"
            >
                <input 
                    className="mk-rotation-slider" 
                    type="range" 
                    min="0" 
                    max="360" 
                    value={rotationDeg} 
                    onChange={(e) => {
                        isDraggingRef.current = true;
                        setRotationDeg(Number(e.target.value));
                    }}
                    onMouseUp={() => { isDraggingRef.current = false; }}
                    onTouchEnd={() => { isDraggingRef.current = false; }}
                    onDoubleClick={() => {
                        isDraggingRef.current = false;
                        setRotationDeg(0);
                    }}
                    aria-label={`${rotationDeg} degrees`} 
                />
                <div 
                    className="pointer-events-none" 
                    style={{ 
                        transform: `rotate(-${rotationDeg}deg)`, 
                        transition: isDraggingRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        isDraggingRef.current = false;
                        setRotationDeg(0);
                    }}
                >
                    <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="20" cy="20" r="17.5" stroke="#e5e7eb" strokeWidth="1.5" />
                        <line x1="20" y1="3" x2="20" y2="6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                        <line x1="20" y1="34" x2="20" y2="37" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="3" y1="20" x2="6" y2="20" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="34" y1="20" x2="37" y2="20" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                        
                        <line x1="8" y1="8" x2="10.5" y2="10.5" stroke="#d1d5db" strokeWidth="1" strokeLinecap="round" />
                        <line x1="29.5" y1="29.5" x2="32" y2="32" stroke="#d1d5db" strokeWidth="1" strokeLinecap="round" />
                        <line x1="8" y1="32" x2="10.5" y2="29.5" stroke="#d1d5db" strokeWidth="1" strokeLinecap="round" />
                        <line x1="29.5" y1="10.5" x2="32" y2="8" stroke="#d1d5db" strokeWidth="1" strokeLinecap="round" />

                        <polygon points="20,7 23.5,19 20,16.5 16.5,19" fill="#ef4444" />
                        <polygon points="20,33 23.5,21 20,23.5 16.5,21" fill="#9ca3af" />
                        
                        <text x="20" y="11" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif" fontSize="7.5" fontWeight="900" fill="#ef4444" textAnchor="middle" dominantBaseline="central">N</text>
                    </svg>
                </div>
            </div>
        </div>
    );
}

export default function Explore() {
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const urlQuery = urlParams.get('q') || urlParams.get('search') || '';
    const urlCommunity = urlParams.get('community') || '';

    const [viewMode, setViewMode] = useState<'list' | 'map'>(() => sessionStorage.getItem('explore_viewMode') as 'list' | 'map' || 'list');
    const [searchQuery, setSearchQuery] = useState(() => urlQuery || sessionStorage.getItem('explore_searchQuery') || '');
    const [rawEvents, setRawEvents] = useState<StandaloneEvent[]>([]);
    const [events, setEvents] = useState<StandaloneEvent[]>([]);
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (urlQuery !== null && urlQuery !== undefined) {
            setSearchQuery(urlQuery);
        }
    }, [urlQuery]);

    const [dateFilter, setDateFilter] = useState(() => sessionStorage.getItem('explore_dateFilter') || 'All Upcoming');
    const [locFilter, setLocFilter] = useState(() => sessionStorage.getItem('explore_locFilter') || 'Nigeria');
    const [communityFilter, setCommunityFilter] = useState(() => urlCommunity || sessionStorage.getItem('explore_communityFilter') || 'all');
    const [priceFilter, setPriceFilter] = useState<string[]>(() => {
        const stored = sessionStorage.getItem('explore_priceFilter');
        return stored ? JSON.parse(stored) : [];
    });

    const [customStartDate, setCustomStartDate] = useState(() => sessionStorage.getItem('explore_customStartDate') || '');
    const [customEndDate, setCustomEndDate] = useState(() => sessionStorage.getItem('explore_customEndDate') || '');
    const [showCustomDate, setShowCustomDate] = useState(false);

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

    useEffect(() => {
        let cancelled = false;
        const fetchCommunities = async () => {
            const data = await listCommunities({ page_size: 100 }).catch(() => []);
            if (!cancelled) setCommunities(data || []);
        };

        fetchCommunities();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (urlCommunity) {
            setCommunityFilter(urlCommunity);
        }
    }, [urlCommunity]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const eventsData = await listEvents({
                page_size: 100,
                communityId: communityFilter !== 'all' ? communityFilter : undefined,
            });

            let enriched: any[] = [];
            if (eventsData && eventsData.length > 0) {
                enriched = await Promise.all(
                    eventsData.map(async (e) => {
                        let updated = { ...e };
                        
                        // 1. Fetch missing venue details
                        if (!updated.venue && updated.venue_id) {
                            try {
                                const venue = await getVenue(updated.venue_id);
                                if (venue) {
                                    updated.venue = venue;
                                }
                            } catch (err) {
                                // ignore
                            }
                        }

                        // 2. Fetch missing host profile avatar
                        const hostId = updated.host?.user_id || (updated.host as any)?.id || (updated as any).host_id || (updated as any).user_id || (updated as any).created_by;
                        let avatar = updated.host?.profile_picture || (updated.host as any)?.avatar_url || (updated.host as any)?.profile_image_url || (updated as any).host_avatar_url || (updated.host as any)?.user_avatar;

                        if (hostId && !avatar) {
                            try {
                                const profile = await getProfileByUserId(hostId);
                                if (profile && (profile.profile_picture || profile.avatar_url)) {
                                    const pic = profile.profile_picture || profile.avatar_url;
                                    updated.host = {
                                        ...updated.host,
                                        user_id: hostId,
                                        username: profile.username || updated.host?.username || '',
                                        name: profile.name || updated.host?.name || '',
                                        profile_picture: pic,
                                        avatar_url: pic,
                                    };
                                }
                            } catch (err) {
                                // ignore
                            }
                        }

                        // 3. Fetch ticket options and calculate actual minimum price
                        let minPrice = 0;
                        try {
                            const tickets = await getTicketsForEvent(e.event_id);
                            if (tickets && tickets.length > 0) {
                                updated.ticket_types = tickets;
                                const validPrices = tickets
                                    .filter(t => t.is_active !== false && t.active !== false && !t.sold_out)
                                    .map(t => Number(t.price))
                                    .filter(p => !isNaN(p));
                                
                                if (validPrices.length > 0) {
                                    minPrice = Math.min(...validPrices);
                                } else {
                                    const allPrices = tickets.map(t => Number(t.price)).filter(p => !isNaN(p));
                                    if (allPrices.length > 0) minPrice = Math.min(...allPrices);
                                }
                            } else {
                                const rawPrice = Number((e as any).price ?? (e as any).min_price ?? (e as any).unit_price);
                                if (!isNaN(rawPrice) && rawPrice > 0) minPrice = rawPrice;
                            }
                        } catch (err) {
                            const rawPrice = Number((e as any).price ?? (e as any).min_price ?? (e as any).unit_price);
                            if (!isNaN(rawPrice) && rawPrice > 0) minPrice = rawPrice;
                        }

                        updated.price_min = minPrice;
                        updated.min_price = minPrice;
                        updated.price = minPrice;

                        return updated;
                    })
                );
            }
            setRawEvents(enriched);
        } catch (error) {
            console.error('Error fetching events:', error);
            setRawEvents([]);
        } finally {
            setLoading(false);
        }
    };

    // Load raw events from network ONLY when community filter changes
    useEffect(() => {
        fetchEvents();
    }, [communityFilter]);

    // Client-side synchronous filtering for INSTANT 0ms response time
    useEffect(() => {
        let filtered = [...rawEvents];

        if (dateFilter === 'All Upcoming') {
            const now = new Date();
            filtered = filtered.filter(e => {
                if (!e.scheduled_for) return true;
                const eventDate = new Date(e.scheduled_for);
                return eventDate >= now;
            });
        } else if (dateFilter === 'Today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            filtered = filtered.filter(e => {
                if (!e.scheduled_for) return false;
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
            filtered = filtered.filter(e => {
                if (!e.scheduled_for) return false;
                const eventDate = new Date(e.scheduled_for);
                return eventDate >= tomorrow && eventDate < dayAfter;
            });
        } else if (dateFilter && dateFilter !== 'Custom') {
            filtered = filtered.filter(e => {
                if (!e.scheduled_for) return false;
                const eventDate = new Date(e.scheduled_for);
                const eventMonth = eventDate.toLocaleString('default', { month: 'long' });
                return eventMonth === dateFilter;
            });
        }

        if (searchQuery && searchQuery.length > 0) {
            const searchLower = searchQuery.toLowerCase();
            filtered = filtered.filter(e => {
                const venueStr = e.location?.venue || e.venue?.name || '';
                const cityStr = e.location?.city || e.venue?.city || '';
                return e.title.toLowerCase().includes(searchLower) ||
                    venueStr.toLowerCase().includes(searchLower) ||
                    cityStr.toLowerCase().includes(searchLower);
            });
        }

        if (locFilter === 'Amptive App') {
            filtered = filtered.filter(e => {
                const venueStr = (e.location?.venue || e.venue?.name || '').toLowerCase();
                const cityStr = (e.location?.city || e.venue?.city || '').toLowerCase();
                const addressStr = (e.location?.address || e.venue?.address || '').toLowerCase();
                const isOnline = (e as any).is_online || (e as any).is_virtual;
                return (
                    isOnline ||
                    venueStr.includes('amptive') ||
                    venueStr.includes('app') ||
                    venueStr.includes('virtual') ||
                    venueStr.includes('online') ||
                    cityStr.includes('amptive') ||
                    cityStr.includes('app') ||
                    addressStr.includes('amptive')
                );
            });
        } else if (locFilter === 'United States') {
            filtered = filtered.filter(e => {
                const str = `${e.location?.city} ${e.location?.venue} ${e.venue?.city} ${e.venue?.name}`.toLowerCase();
                return str.includes('united states') || str.includes('usa') || str.includes('us') || str.includes('new york') || str.includes('california') || str.includes('miami');
            });
        } else if (locFilter === 'Nigeria') {
            filtered = filtered.filter(e => {
                const str = `${e.location?.city} ${e.location?.venue} ${e.venue?.city} ${e.venue?.name}`.toLowerCase();
                return str.includes('nigeria') || str.includes('lagos') || str.includes('lekki') || str.includes('ikeja') || str.includes('abuja') || str.includes('port harcourt') || str.includes('ibadan');
            });
        } else if (locFilter === 'France') {
            filtered = filtered.filter(e => {
                const str = `${e.location?.city} ${e.location?.venue} ${e.venue?.city} ${e.venue?.name}`.toLowerCase();
                return str.includes('france') || str.includes('paris');
            });
        }

        if (priceFilter.includes('Free')) {
            filtered = filtered.filter(e => e.price_min === 0);
        } else if (priceFilter.includes('Paid')) {
            filtered = filtered.filter(e => e.price_min > 0);
        }

        setEvents(filtered);
    }, [rawEvents, searchQuery, dateFilter, locFilter, priceFilter, customStartDate, customEndDate]);

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
                                    setCommunityFilter('all');
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
                                    <div
                                        className="fixed inset-0 bg-black/20 z-40"
                                        onClick={() => setShowCustomDate(false)}
                                    />

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
                                <FilterPill label="Amptive App" active={locFilter === 'Amptive App'} onClick={() => setLocFilter('Amptive App')} />
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
                                <button className="text-xs text-gray-500 hover:underline hover:text-black" onClick={() => setCommunityFilter('all')}>Reset</button>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                <FilterPill
                                    label="All Communities"
                                    active={communityFilter === 'all'}
                                    onClick={() => setCommunityFilter('all')}
                                />
                                {communities.map(c => (
                                    <FilterPill
                                        key={c.community_id}
                                        label={c.name}
                                        active={communityFilter === c.community_id}
                                        onClick={() => setCommunityFilter(c.community_id)}
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
                            <ExploreLeafletMap events={events} locFilter={locFilter} onSelectEvent={(eventId) => navigate(`/events/${eventId}`)} />
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
                                            const eventDate = event.scheduled_for ? new Date(event.scheduled_for) : null;
                                            const isToday = eventDate ? new Date().toDateString() === eventDate.toDateString() : false;
                                            const isTomorrow = eventDate ? new Date(Date.now() + 86400000).toDateString() === eventDate.toDateString() : false;

                                            let dateDisplay = eventDate ? eventDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : 'TBA';
                                            if (isToday) dateDisplay = 'Today';
                                            if (isTomorrow) dateDisplay = 'Tomorrow';

                                            const timeDisplay = eventDate ? eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

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
                                                                {dateDisplay}{timeDisplay ? `, ${timeDisplay}` : ''}
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
                                                            {event.location?.type === 'online' || event.venue?.venue_type === 'virtual' ? 'Online' : (
                                                                [event.location?.venue || event.venue?.name, event.location?.city || event.venue?.city].filter(Boolean).join(', ') || 'TBA'
                                                            )}
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
