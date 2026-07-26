import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Map as MapIcon, List, Calendar, MapPin, ChevronDown, X, Sliders, RotateCcw } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Adds bearing support to Leaflet (core Leaflet cannot rotate), so the compass can behave
// like Apple Maps: rotate the map and the needle follows; tap the needle to snap north.
import 'leaflet-rotate';
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

    // 2. Virtual & Amptive App events get pinned directly on Amptive Island in the ocean!
    const isVirtual = !event.venue || 
                      event.venue?.venue_type === 'virtual' || 
                      event.location?.type === 'online' || 
                      (event as any).is_online || 
                      (event as any).is_virtual;
    const venueStr = (event.location?.venue || event.venue?.name || (event as any).venue_name || '').toLowerCase();
    const isAmptiveApp = venueStr.includes('amptive') || venueStr.includes('app') || venueStr.includes('virtual') || venueStr.includes('online');

    if (isVirtual || isAmptiveApp || (!event.venue?.city && !event.location?.city && !event.venue?.address_line1)) {
        const angle = (index * 137.5) * (Math.PI / 180);
        const radius = 0.025 * Math.sqrt(index + 1);
        return {
            lat: -59.5000 + Math.cos(angle) * radius,
            lng: -42.0000 + Math.sin(angle) * radius
        };
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

// How far out "Near Me" reaches — wide enough to cover a metro area and its outskirts.
const NEAR_ME_RADIUS_KM = 75;

// Great-circle distance between two points, in kilometres.
function distanceInKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const EARTH_RADIUS_KM = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// A sensible starting region for a first-time visitor, read from the browser's timezone.
// This needs no permission prompt — unlike geolocation, which we only request when the
// visitor explicitly asks for "Near Me".
const TIMEZONE_DEFAULTS: { pattern: RegExp; filter: string; country: string }[] = [
    { pattern: /^Africa\/(Lagos|Abuja|Kano)/i, filter: 'Nigeria', country: 'Nigeria' },
    { pattern: /^Africa\/(Accra)/i, filter: 'Ghana', country: 'Ghana' },
    { pattern: /^Africa\/(Johannesburg|Cape_Town|Durban)/i, filter: 'South Africa', country: 'South Africa' },
    { pattern: /^Africa\/(Nairobi)/i, filter: 'Kenya', country: 'Kenya' },
    { pattern: /^(America|US|Canada|Mexico)\//i, filter: 'United States', country: 'United States' },
    { pattern: /^Europe\/(Paris|Marseille|Lyon|Monaco|Brussels)/i, filter: 'France', country: 'France' },
    { pattern: /^Europe\/(London|Belfast|Dublin)/i, filter: 'United Kingdom', country: 'United Kingdom' },
    { pattern: /^Europe\/(Berlin|Munich|Hamburg|Frankfurt)/i, filter: 'Germany', country: 'Germany' },
];

// City pills per country — the user's detected country shows its cities first
const COUNTRY_CITIES: Record<string, string[]> = {
    'Nigeria': ['Lagos', 'Abuja', 'Lekki', 'Ikeja', 'Yaba', 'Port Harcourt', 'Ibadan', 'Enugu', 'Benin'],
    'United States': ['New York', 'Los Angeles', 'Miami', 'Chicago', 'Houston', 'San Francisco', 'Atlanta'],
    'France': ['Paris', 'Marseille', 'Lyon', 'Nice', 'Toulouse'],
    'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Liverpool'],
    'Ghana': ['Accra', 'Kumasi', 'Tamale', 'Cape Coast'],
    'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
    'Kenya': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
    'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
};

function detectCountry(): string {
    try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const match = TIMEZONE_DEFAULTS.find(entry => entry.pattern.test(timeZone));
        if (match) return match.country;
    } catch { /* fallback */ }
    return 'Nigeria';
}

function defaultLocationFilter(): string {
    try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const match = TIMEZONE_DEFAULTS.find(entry => entry.pattern.test(timeZone));
        if (match) return match.filter;
    } catch {
        // Intl unavailable — fall through to the home market.
    }
    return 'Nigeria';
}

const LOCATION_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
    'united states': { lat: 37.0902, lng: -95.7129, zoom: 4 },
    'us': { lat: 37.0902, lng: -95.7129, zoom: 4 },
    'usa': { lat: 37.0902, lng: -95.7129, zoom: 4 },
    'france': { lat: 46.2276, lng: 2.2137, zoom: 6 },
    'nigeria': { lat: 6.5244, lng: 3.3792, zoom: 8 },
    'near me': { lat: 6.5244, lng: 3.3792, zoom: 8 },
    'amptive app': { lat: -59.5000, lng: -42.0000, zoom: 10 },
    'united kingdom': { lat: 51.5074, lng: -0.1278, zoom: 6 },
    'ghana': { lat: 5.6037, lng: -0.1870, zoom: 7 },
    'south africa': { lat: -30.5595, lng: 22.9375, zoom: 5 },
    'kenya': { lat: -1.2921, lng: 36.8219, zoom: 7 },
    'germany': { lat: 51.1657, lng: 10.4515, zoom: 6 },
    // Major cities
    'lagos': { lat: 6.5244, lng: 3.3792, zoom: 12 },
    'abuja': { lat: 9.0765, lng: 7.3986, zoom: 12 },
    'lekki': { lat: 6.4698, lng: 3.5852, zoom: 13 },
    'ikeja': { lat: 6.6018, lng: 3.3515, zoom: 13 },
    'yaba': { lat: 6.5095, lng: 3.3711, zoom: 14 },
    'port harcourt': { lat: 4.8156, lng: 7.0498, zoom: 12 },
    'ibadan': { lat: 7.3775, lng: 3.9470, zoom: 12 },
    'enugu': { lat: 6.4584, lng: 7.5464, zoom: 12 },
    'benin': { lat: 6.3350, lng: 5.6037, zoom: 12 },
    'new york': { lat: 40.7128, lng: -74.0060, zoom: 12 },
    'los angeles': { lat: 34.0522, lng: -118.2437, zoom: 11 },
    'miami': { lat: 25.7617, lng: -80.1918, zoom: 12 },
    'chicago': { lat: 41.8781, lng: -87.6298, zoom: 12 },
    'houston': { lat: 29.7604, lng: -95.3698, zoom: 11 },
    'san francisco': { lat: 37.7749, lng: -122.4194, zoom: 12 },
    'atlanta': { lat: 33.7490, lng: -84.3880, zoom: 12 },
    'paris': { lat: 48.8566, lng: 2.3522, zoom: 12 },
    'marseille': { lat: 43.2965, lng: 5.3698, zoom: 12 },
    'lyon': { lat: 45.7640, lng: 4.8357, zoom: 12 },
    'nice': { lat: 43.7102, lng: 7.2620, zoom: 12 },
    'toulouse': { lat: 43.6047, lng: 1.4442, zoom: 12 },
    'london': { lat: 51.5074, lng: -0.1278, zoom: 12 },
    'manchester': { lat: 53.4808, lng: -2.2426, zoom: 12 },
    'birmingham': { lat: 52.4862, lng: -1.8904, zoom: 12 },
    'edinburgh': { lat: 55.9533, lng: -3.1883, zoom: 12 },
    'liverpool': { lat: 53.4084, lng: -2.9916, zoom: 12 },
    'accra': { lat: 5.6037, lng: -0.1870, zoom: 12 },
    'kumasi': { lat: 6.6885, lng: -1.6244, zoom: 12 },
    'johannesburg': { lat: -26.2041, lng: 28.0473, zoom: 12 },
    'cape town': { lat: -33.9249, lng: 18.4241, zoom: 12 },
    'durban': { lat: -29.8587, lng: 31.0218, zoom: 12 },
    'pretoria': { lat: -25.7479, lng: 28.2293, zoom: 12 },
    'nairobi': { lat: -1.2921, lng: 36.8219, zoom: 12 },
    'mombasa': { lat: -4.0435, lng: 39.6682, zoom: 12 },
    'berlin': { lat: 52.5200, lng: 13.4050, zoom: 12 },
    'munich': { lat: 48.1351, lng: 11.5820, zoom: 12 },
    'hamburg': { lat: 53.5511, lng: 9.9937, zoom: 12 },
    'frankfurt': { lat: 50.1109, lng: 8.6821, zoom: 12 },
    'cologne': { lat: 50.9375, lng: 6.9603, zoom: 12 },
};

function ExploreLeafletMap({ events, locFilter, isLoading, userCoords, viewMode, onSelectEvent, onMapMoved }: { events: StandaloneEvent[]; locFilter?: string; isLoading?: boolean; userCoords?: { lat: number; lng: number } | null; viewMode?: 'map' | 'list'; onSelectEvent: (eventId: string) => void; onMapMoved?: (moved: boolean) => void }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    // Map heading in degrees; drives the compass needle.
    const [bearing, setBearing] = useState(0);
    // True when the dial was just spun, so the trailing click is ignored.
    const dialDraggedRef = useRef(false);

    // The callbacks are read through refs so their identity never lands in the effect's
    // dependencies. Previously an inline arrow from the parent changed on every render,
    // which tore down and rebuilt every marker (and re-ran fitBounds) each time any
    // unrelated state changed — the source of the multi-second filter lag on mobile.
    const onSelectEventRef = useRef(onSelectEvent);
    const onMapMovedRef = useRef(onMapMoved);
    useEffect(() => {
        onSelectEventRef.current = onSelectEvent;
        onMapMovedRef.current = onMapMoved;
    });

    useEffect(() => {
        if (!mapRef.current) return;

        if (!mapInstance.current) {
            const map = L.map(mapRef.current, {
                center: [6.5244, 3.3792],
                zoom: 11,
                minZoom: 3,
                maxZoom: 19,
                zoomControl: false,
                attributionControl: false,
                // Rotation, as on Apple Maps: two-finger twist on trackpad/touch, or
                // shift-drag with a mouse.
                rotate: true,
                touchRotate: true,
                shiftKeyRotate: true,
                rotateControl: false,
            } as L.MapOptions);

            // Mapbox vector-rendered raster tiles: green land, tan drylands and saturated
            // blue water read much closer to Apple Maps than the flat CARTO basemap.
            // Served at 512px @2x for retina crispness (zoomOffset keeps the zoom levels
            // aligned with Leaflet's 256px grid). Falls back to CARTO without a token.
            const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

            if (mapboxToken) {
                L.tileLayer(
                    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
                    {
                        attribution: '&copy; Mapbox &copy; OpenStreetMap',
                        tileSize: 512,
                        zoomOffset: -1,
                        minZoom: 3,
                        maxZoom: 20,
                    }
                ).addTo(map);
            } else {
                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; CARTO &copy; OpenStreetMap',
                    subdomains: 'abcd',
                    minZoom: 3,
                    maxZoom: 20
                }).addTo(map);
            }

            map.on('dragstart', () => onMapMovedRef.current?.(true));
            map.on('zoomstart', () => onMapMovedRef.current?.(true));
            map.on('rotate', () => setBearing((map as any).getBearing?.() ?? 0));

            // leaflet-rotate rotates on shift+wheel but reads only deltaY. macOS turns
            // shift+scroll into horizontal scrolling (deltaY === 0), so rotation never
            // fired on a Mac. Handle whichever axis carries the delta.
            (map as any).shiftKeyRotate?.disable();
            mapRef.current.addEventListener(
                'wheel',
                (event: WheelEvent) => {
                    if (!event.shiftKey) return;
                    event.preventDefault();
                    const delta = event.deltaY || event.deltaX;
                    if (!delta) return;
                    const current = (map as any).getBearing?.() ?? 0;
                    (map as any).setBearing(current + Math.sign(delta) * 5);
                },
                { passive: false }
            );

            mapInstance.current = map;
        }

        const map = mapInstance.current;

        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 150);

        // Leaflet caches the container size, so a resize (window, sidebar, device
        // rotation) leaves tiles not covering the box until it is told to re-measure.
        const resizeObserver = new ResizeObserver(() => map.invalidateSize());
        resizeObserver.observe(mapRef.current);

        // Clear previous markers & overlays
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.SVGOverlay || layer instanceof L.Polygon || layer instanceof L.Circle) {
                map.removeLayer(layer);
            }
        });

        // 1. Highly Detailed Organic Island SVG Overlay (Natural coastline, inlets, coves & satellite islets)
        const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgElement.setAttribute('viewBox', '0 0 800 500');
        svgElement.innerHTML = `
            <defs>
                <filter id="coast-shadow" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="#1e293b" flood-opacity="0.12"/>
                </filter>
            </defs>
            
            <!-- Shallow Coral / Lagoon Water Halo -->
            <path d="M 120,240 Q 140,110 260,80 Q 380,50 510,75 Q 640,100 710,180 Q 770,260 720,350 Q 660,430 490,435 Q 330,440 210,390 Q 90,340 120,240 Z" fill="#b2e2f8" opacity="0.45" />

            <!-- Organic Sandy Beach with realistic inlets & bays -->
            <path d="
                M 140,240 
                C 145,210 152,185 170,165 
                C 185,150 178,135 195,120 
                C 215,105 240,115 265,95 
                C 290,75 325,85 355,75 
                C 385,65 415,80 445,72 
                C 475,65 505,82 535,90 
                C 565,98 585,88 610,110 
                C 635,132 660,125 680,150 
                C 700,175 688,198 715,220 
                C 735,240 720,268 705,290 
                C 690,312 708,335 685,360 
                C 662,385 630,375 600,395 
                C 570,415 538,402 505,420 
                C 472,438 440,425 405,428 
                C 370,431 340,418 305,410 
                C 270,402 245,415 215,395 
                C 185,375 192,352 170,335 
                C 148,318 160,295 145,275 
                C 130,255 135,245 140,240 Z" 
                fill="#eae1bf" stroke="#dcd0a2" stroke-width="3" filter="url(#coast-shadow)" />

            <!-- Organic Solid Land Mass with jagged headlands, coves & peninsulas -->
            <path d="
                M 152,240 
                C 157,213 162,190 178,172 
                C 192,158 186,143 202,128 
                C 220,114 243,122 268,104 
                C 292,86 324,94 353,85 
                C 382,76 411,89 440,81 
                C 468,74 497,90 526,97 
                C 554,104 573,95 597,116 
                C 621,137 645,131 664,154 
                C 682,177 671,199 696,220 
                C 715,238 701,264 688,284 
                C 674,304 690,326 669,349 
                C 648,372 618,363 590,381 
                C 562,399 532,388 501,404 
                C 470,420 439,409 406,411 
                C 373,413 345,401 313,394 
                C 281,387 258,398 230,380 
                C 202,362 208,341 188,326 
                C 168,311 178,290 164,272 
                C 150,254 147,244 152,240 Z" 
                fill="#e4ead8" stroke="#a6bd90" stroke-width="2.5" />

            <!-- Satellite Islets off the coast -->
            <circle cx="120" cy="180" r="10" fill="#eae1bf" stroke="#dcd0a2" stroke-width="1.5" />
            <circle cx="120" cy="180" r="7" fill="#e4ead8" stroke="#a6bd90" stroke-width="1.5" />

            <circle cx="730" cy="160" r="14" fill="#eae1bf" stroke="#dcd0a2" stroke-width="1.5" />
            <circle cx="730" cy="160" r="10" fill="#e4ead8" stroke="#a6bd90" stroke-width="1.5" />

            <circle cx="640" cy="420" r="12" fill="#eae1bf" stroke="#dcd0a2" stroke-width="1.5" />
            <circle cx="640" cy="420" r="8" fill="#e4ead8" stroke="#a6bd90" stroke-width="1.5" />

            <!-- Natural Interior Topography / Elevation Contour lines -->
            <path d="
                M 220,230 
                C 230,170 300,120 420,130 
                C 540,140 600,180 580,240 
                C 560,300 480,350 360,340 
                C 260,330 210,290 220,230 Z" 
                fill="#d6e2c3" opacity="0.6" />
            
            <path d="
                M 280,225 
                C 290,185 340,150 430,160 
                C 510,170 540,200 525,235 
                C 510,270 450,305 370,300 
                C 300,295 272,260 280,225 Z" 
                fill="#c6d8ae" opacity="0.5" />
        `;

        const islandBounds: L.LatLngBoundsExpression = [
            [-60.2000, -43.4000],
            [-58.8000, -40.6000]
        ];

        L.svgOverlay(svgElement, islandBounds, { opacity: 1, interactive: false }).addTo(map);

        // Native map place label for Amptive Island
        const islandLabelIcon = L.divIcon({
            className: 'custom-native-map-label',
            html: `
                <div style="
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    font-size: 16px;
                    font-weight: 600;
                    color: #2d3748;
                    text-align: center;
                    white-space: nowrap;
                    user-select: none;
                    pointer-events: none;
                    text-shadow: 
                        -1.5px -1.5px 0 #ffffff,
                         1.5px -1.5px 0 #ffffff,
                        -1.5px  1.5px 0 #ffffff,
                         1.5px  1.5px 0 #ffffff,
                         0px    0px 5px #ffffff,
                         0px    0px 8px #ffffff;
                    letter-spacing: -0.3px;
                    line-height: 1.2;
                ">
                    Amptive Island
                </div>
            `,
            iconSize: [160, 24],
            iconAnchor: [80, 12]
        });

        L.marker([-59.5000, -42.0000], { icon: islandLabelIcon }).addTo(map);

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
                    ? new Date(event.scheduled_for).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Upcoming';

                const isEventVirtual = event.venue?.venue_type === 'virtual' || 
                                       event.location?.type === 'online' || 
                                       (event as any).is_online || 
                                       (event as any).is_virtual;
                const rawLocName = event.venue?.name || event.location?.venue || event.location?.city || '';
                const venueTitle = isEventVirtual || !rawLocName || rawLocName === 'TBD' || rawLocName === 'TBA'
                    ? 'Amptive App'
                    : rawLocName;
                const venueSub = 'Location';
                const locationSubStr = isEventVirtual || !rawLocName || rawLocName === 'TBD' || rawLocName === 'TBA'
                    ? 'Amptive App'
                    : ([event.venue?.name || event.location?.venue, event.venue?.city || event.location?.city].filter(Boolean).join(', ') || 'Amptive App');
                
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
                                <div style="font-size: 11px; font-weight: 600; color: #4b5563; margin-bottom: 2px; display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    <span style="color: #ef4444; font-size: 12px; flex-shrink: 0;">📅</span> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${dateStr}</span>
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
                    className: 'custom-leaflet-popup',
                    autoPan: false
                });

                marker.on('popupopen', () => {
                    const btn = document.getElementById(`btn-explore-${event.event_id}`);
                    if (btn) {
                        btn.onclick = () => onSelectEventRef.current(event.event_id);
                    }
                });
            }
        });

        const key = (locFilter || '').toLowerCase();
        if (key === 'amptive app') {
            map.setView([-59.5000, -42.0000], 10);
        } else if (key === 'near me' && userCoords) {
            map.setView([userCoords.lat, userCoords.lng], 9);
        } else if (LOCATION_CENTERS[key]) {
            const center = LOCATION_CENTERS[key];
            map.setView([center.lat, center.lng], center.zoom);
        } else if (hasCoords && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 9, minZoom: 3 });
        } else if (!isLoading && key) {
            // Geocode unknown locations via Nominatim (free, no API key)
            fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locFilter || '')}`)
                .then(res => res.json())
                .then(results => {
                    if (results && results[0]) {
                        const { lat, lon } = results[0];
                        map.setView([parseFloat(lat), parseFloat(lon)], 12);
                    }
                })
                .catch(() => { /* geocode failed — keep current view */ });
        } else if (!isLoading) {
            map.setView([6.5244, 3.3792], 8);
        }

        return () => {
            clearTimeout(timer);
            resizeObserver.disconnect();
        };
    }, [events, locFilter, isLoading, userCoords]);

    return (
        <div className="relative h-full w-full rounded-none overflow-hidden bg-gray-50">
            <style>{`
                /* The basemap ships with the palette we want — only a touch of warmth,
                   no hue rotation (that turned borders pink and roads neon). */
                .leaflet-tile-pane {
                    filter: saturate(1.04) brightness(1.01);
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
                    bottom: 20px;
                    left: 20px;
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
                @media (max-width: 639px) {
                    .mk-rotation-control {
                        display: none !important;
                    }
                }
            `}</style>
            <div ref={mapRef} onPointerDown={() => onMapMovedRef.current?.(true)} className="absolute inset-0 h-full w-full z-10" />
            <div
                role="button"
                tabIndex={0}
                title={bearing ? 'Point north' : 'Reset map view'}
                aria-label={bearing ? 'Point north' : 'Reset map view'}
                className="mk-control mk-rotation-control mk-with-zoom-control hidden sm:flex"
                // Drag the dial to spin the map, the way you'd twist a physical compass —
                // the discoverable desktop gesture, since a trackpad twist isn't something
                // browsers report. A drag suppresses the click so it doesn't snap to north.
                onPointerDown={(event) => {
                    const map = mapInstance.current as any;
                    if (!map) return;
                    const dial = event.currentTarget as HTMLDivElement;
                    const box = dial.getBoundingClientRect();
                    const cx = box.left + box.width / 2;
                    const cy = box.top + box.height / 2;
                    const angleOf = (x: number, y: number) => Math.atan2(y - cy, x - cx) * (180 / Math.PI);

                    let last = angleOf(event.clientX, event.clientY);
                    dialDraggedRef.current = false;
                    dial.setPointerCapture(event.pointerId);

                    const onMove = (moveEvent: PointerEvent) => {
                        const next = angleOf(moveEvent.clientX, moveEvent.clientY);
                        let step = next - last;
                        if (step > 180) step -= 360;
                        if (step < -180) step += 360;
                        if (Math.abs(step) < 0.01) return;
                        dialDraggedRef.current = true;
                        last = next;
                        map.setBearing(((map.getBearing?.() ?? 0) + step));
                    };
                    const onUp = () => {
                        dial.removeEventListener('pointermove', onMove);
                        dial.removeEventListener('pointerup', onUp);
                        dial.removeEventListener('pointercancel', onUp);
                    };
                    dial.addEventListener('pointermove', onMove);
                    dial.addEventListener('pointerup', onUp);
                    dial.addEventListener('pointercancel', onUp);
                }}
                onClick={() => {
                    const map = mapInstance.current as any;
                    if (!map) return;
                    // A click always follows the pointerup that ends a drag; ignore that one
                    // so spinning the dial doesn't immediately snap the map back to north.
                    if (dialDraggedRef.current) {
                        dialDraggedRef.current = false;
                        return;
                    }
                    // Apple's behaviour: when the map is turned, the compass returns it to
                    // north. Only when already north-up does it fall back to re-centring.
                    // Read the heading off the map, not React state, which may not have
                    // re-rendered yet after a rotation.
                    if (Math.round(map.getBearing?.() ?? 0) % 360 !== 0) {
                        map.setBearing(0);
                        setBearing(0);
                        return;
                    }
                    map.invalidateSize();
                    const key = (locFilter || '').toLowerCase();
                    const center = LOCATION_CENTERS[key] || { lat: 6.5244, lng: 3.3792, zoom: 11 };
                    map.setView([center.lat, center.lng], center.zoom);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        (event.currentTarget as HTMLDivElement).click();
                    }
                }}
            >
                {/* The dial turns opposite the map so the needle keeps pointing north.
                    The transform sits on this wrapper because a CSS transform on an <svg>
                    root is not applied reliably. */}
                <div
                    style={{
                        display: 'flex',
                        transform: `rotate(${-bearing}deg)`,
                        transition: 'transform 0.18s ease-out',
                    }}
                >
                <svg
                    width="28"
                    height="28"
                    viewBox="0 0 40 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
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

    const detectedCountry = detectCountry();

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
    const [locFilter, setLocFilter] = useState(() => sessionStorage.getItem('explore_locFilter') || defaultLocationFilter());
    // Set only after the visitor asks for "Near Me" and the browser grants permission.
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [communityFilter, setCommunityFilter] = useState(() => urlCommunity || sessionStorage.getItem('explore_communityFilter') || 'all');
    const [priceFilter, setPriceFilter] = useState<string[]>(() => {
        const stored = sessionStorage.getItem('explore_priceFilter');
        return stored ? JSON.parse(stored) : [];
    });

    // "Near Me" is the only place we ask for the device location, and only because the
    // visitor asked for it — the browser shows its own permission prompt. If it's denied
    // or unavailable we simply keep the current region rather than nagging.
    const requestNearMe = () => {
        setLocFilter('Near Me');
        if (userCoords || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (position) => setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
            () => { /* denied or unavailable — keep the existing view */ },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
        );
    };

    const [showFloatingFilters, setShowFloatingFilters] = useState(true);
    const [hasMovedMap, setHasMovedMap] = useState(false);
    const [maxPrice, setMaxPrice] = useState<number>(() => Number(sessionStorage.getItem('explore_maxPrice')) || 100000);
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
        sessionStorage.setItem('explore_maxPrice', String(maxPrice));
        sessionStorage.setItem('explore_customStartDate', customStartDate);
        sessionStorage.setItem('explore_customEndDate', customEndDate);
    }, [viewMode, searchQuery, dateFilter, locFilter, communityFilter, priceFilter, maxPrice, customStartDate, customEndDate]);

    const navigate = useNavigate();

    // Stable identities so the map isn't handed new props on every render — an inline
    // arrow here forced a full marker rebuild on every keystroke and filter click.
    const handleSelectEvent = useCallback((eventId: string) => navigate(`/events/${eventId}`), [navigate]);
    const handleMapMoved = useCallback((moved: boolean) => setHasMovedMap(moved), []);

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
        } else if (dateFilter === 'Custom' || customStartDate || customEndDate) {
            if (customStartDate) {
                const start = new Date(customStartDate);
                start.setHours(0, 0, 0, 0);
                filtered = filtered.filter(e => {
                    if (!e.scheduled_for) return false;
                    return new Date(e.scheduled_for) >= start;
                });
            }
            if (customEndDate) {
                const end = new Date(customEndDate);
                end.setHours(23, 59, 59, 999);
                filtered = filtered.filter(e => {
                    if (!e.scheduled_for) return false;
                    return new Date(e.scheduled_for) <= end;
                });
            }
        } else if (dateFilter) {
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

        if (locFilter === 'Near Me') {
            // Keep events within NEAR_ME_RADIUS_KM of the visitor. Without a granted
            // location we can't judge distance, so everything stays visible rather than
            // showing a misleading empty result.
            if (userCoords) {
                filtered = filtered.filter((event, idx) => {
                    const coords = getEventCoords(event, idx);
                    if (!coords) return false;
                    return distanceInKm(userCoords, coords) <= NEAR_ME_RADIUS_KM;
                });
            }
        } else if (locFilter === 'Amptive App' || locFilter === 'amptive app') {
            filtered = filtered.filter(e => {
                const isVirtual = !e.venue || 
                                  e.venue?.venue_type === 'virtual' || 
                                  e.location?.type === 'online' || 
                                  (e as any).is_online || 
                                  (e as any).is_virtual;
                const venueStr = (e.location?.venue || e.venue?.name || (e as any).venue_name || '').toLowerCase();
                const cityStr = (e.location?.city || e.venue?.city || '').toLowerCase();
                const addressStr = (e.location?.address || e.venue?.address || '').toLowerCase();
                return (
                    isVirtual ||
                    venueStr.includes('amptive') ||
                    venueStr.includes('app') ||
                    venueStr.includes('virtual') ||
                    venueStr.includes('online') ||
                    cityStr.includes('amptive') ||
                    cityStr.includes('app') ||
                    addressStr.includes('amptive') ||
                    (!e.venue?.city && !e.location?.city && !e.venue?.address_line1)
                );
            });
        } else if (locFilter === 'United States') {
            filtered = filtered.filter(e => {
                const str = `${e.location?.city} ${e.location?.venue} ${e.venue?.city} ${e.venue?.name} ${e.location?.address} ${e.venue?.address}`.toLowerCase();
                return str.includes('united states') || str.includes('usa') || str.includes('us') || str.includes('new york') || str.includes('california') || str.includes('miami');
            });
        } else if (locFilter === 'Nigeria') {
            filtered = filtered.filter(e => {
                const isVirtual = !e.venue || 
                                  e.venue?.venue_type === 'virtual' || 
                                  e.location?.type === 'online' || 
                                  (e as any).is_online || 
                                  (e as any).is_virtual;
                const str = `${e.location?.city} ${e.location?.venue} ${e.venue?.city} ${e.venue?.name} ${e.location?.address} ${e.venue?.address}`.toLowerCase();
                return isVirtual || str.includes('nigeria') || str.includes('lagos') || str.includes('lekki') || str.includes('ikeja') || str.includes('abuja') || str.includes('port harcourt') || str.includes('ibadan') || str.includes('yaba') || str.includes('surulere') || str.includes('ikoyi') || str.includes('victoria island');
            });
        } else if (locFilter === 'France') {
            filtered = filtered.filter(e => {
                const str = `${e.location?.city} ${e.location?.venue} ${e.venue?.city} ${e.venue?.name} ${e.location?.address} ${e.venue?.address}`.toLowerCase();
                return str.includes('france') || str.includes('paris');
            });
        } else if (locFilter) {
            // Generic text match for any custom typed location
            const locLower = locFilter.toLowerCase();
            filtered = filtered.filter(e => {
                const str = `${e.location?.city} ${e.location?.venue} ${e.venue?.city} ${e.venue?.name} ${e.location?.address} ${e.venue?.address} ${e.venue?.state} ${e.location?.state}`.toLowerCase();
                return str.includes(locLower);
            });
        }

        if (maxPrice === 0) {
            filtered = filtered.filter(e => e.price_min === 0);
        } else if (maxPrice < 100000) {
            filtered = filtered.filter(e => e.price_min <= maxPrice);
        }

        setEvents(filtered);
    }, [rawEvents, searchQuery, dateFilter, locFilter, userCoords, priceFilter, maxPrice, customStartDate, customEndDate]);

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
        <div className="min-h-screen bg-white pt-0 pb-0">
            <div className="w-full px-0">

                {/* FULL CANVAS CONTAINER: Edge-to-Edge Full-bleed Map with Floating Event List Overlay */}
                <div className="relative w-full overflow-hidden" style={{ height: '100vh' }}>
                    {/* Leaflet Map: Fills 100% of container underneath everything */}
                    <ExploreLeafletMap
                        events={events}
                        locFilter={locFilter}
                        isLoading={loading}
                        userCoords={userCoords}
                        viewMode={viewMode}
                        onSelectEvent={handleSelectEvent}
                        onMapMoved={handleMapMoved}
                    />

                    {/* Top-Left Floating Filter Events Button */}
                    <div className={`absolute top-24 left-4 z-30 items-center gap-2 ${
                        viewMode === 'list' ? 'hidden sm:flex' : 'flex'
                    }`}>
                        <button
                            onClick={() => setShowFloatingFilters(!showFloatingFilters)}
                            className="bg-white/95 hover:bg-white text-gray-900 border border-gray-200/80 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                            <Sliders className="w-4 h-4 text-gray-900" />
                            Filter Events
                        </button>
                    </div>

                    {/* Bottom-Left Circular Reset View Button (Only visible when user moves/pans map; disappears when reset) */}
                    <button
                        onClick={() => {
                            setDateFilter('All Upcoming');
                            setLocFilter('Nigeria');
                            setCommunityFilter('all');
                            setPriceFilter([]);
                            setHasMovedMap(false);
                        }}
                        title="Reset Map View"
                        aria-label="Reset Map View"
                        className={`absolute bottom-[20px] sm:bottom-[74px] left-[20px] z-30 bg-white/95 hover:bg-white text-gray-900 border border-white/80 backdrop-blur-md rounded-full w-[44px] h-[44px] items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
                            viewMode === 'list' ? 'hidden sm:flex' : 'flex'
                        } ${
                            hasMovedMap
                                ? 'opacity-100 scale-100 pointer-events-auto'
                                : 'opacity-0 scale-90 pointer-events-none'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M240,116H219.22A92.21,92.21,0,0,0,140,36.78V16a12,12,0,0,0-24,0V36.78A92.21,92.21,0,0,0,36.78,116H16a12,12,0,0,0,0,24H36.78A92.21,92.21,0,0,0,116,219.22V240a12,12,0,0,0,24,0V219.22A92.21,92.21,0,0,0,219.22,140H240a12,12,0,0,0,0-24ZM128,196a68,68,0,1,1,68-68A68.07,68.07,0,0,1,128,196Zm0-112a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,84Zm0,64a20,20,0,1,1,20-20A20,20,0,0,1,128,148Z"></path>
                        </svg>
                    </button>

                    {/* MOBILE BOTTOM SHEET FILTER MODAL BACKDROP (MOBILE ONLY) */}
                    <div
                        className={`fixed inset-0 z-[100] bg-black/50 transition-opacity duration-300 sm:hidden ${
                            showFloatingFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                        }`}
                        onClick={() => setShowFloatingFilters(false)}
                    />

                    {/* MOBILE BOTTOM SHEET FILTER MODAL CONTAINER (MOBILE ONLY) */}
                    <div
                        className={`fixed bottom-0 inset-x-0 z-[100] w-full max-h-[85vh] bg-[#f4f7f2] rounded-t-3xl p-6 overflow-y-auto space-y-5 text-gray-900 shadow-2xl transition-transform duration-300 ease-out will-change-transform sm:hidden ${
                            showFloatingFilters ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
                        }`}
                    >
                        {/* Drag Handle Indicator */}
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-1" />

                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-gray-200/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center">
                                    <Sliders className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className="font-bold text-base text-gray-900">Filter Events</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFloatingFilters(false)}
                                className="p-1.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* When? */}
                        <section>
                            <h3 className="text-sm font-extrabold text-gray-900 mb-2.5">When?</h3>
                            <div className="flex flex-wrap gap-2 mb-1.5">
                                {['All Upcoming', 'Today', 'Tomorrow', 'This Weekend'].map(label => (
                                    <button
                                        key={label}
                                        onClick={() => {
                                            setDateFilter(label);
                                            setCustomStartDate('');
                                            setCustomEndDate('');
                                            setShowCustomDate(false);
                                        }}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            dateFilter === label && !customStartDate && !customEndDate
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/60'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <button
                                    onClick={() => setShowCustomDate(!showCustomDate)}
                                    className="flex items-center gap-1 text-[11px] font-bold text-gray-900 hover:underline cursor-pointer"
                                >
                                    Custom Range
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustomDate ? 'rotate-180' : ''}`} />
                                </button>

                                {(customStartDate || customEndDate) && (
                                    <span className="flex items-center gap-1.5 bg-gray-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                                        <span>
                                            {customStartDate ? new Date(customStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '...'} - {customEndDate ? new Date(customEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '...'}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCustomStartDate('');
                                                setCustomEndDate('');
                                                setDateFilter('All Upcoming');
                                            }}
                                            className="hover:bg-gray-700 p-0.5 rounded-full cursor-pointer transition-colors"
                                            title="Clear custom date range"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </span>
                                )}
                            </div>

                            {showCustomDate && (
                                <div className="mt-3 p-4 bg-white rounded-2xl border border-gray-200/80 shadow-lg text-gray-900 z-50">
                                    <ReactCalendar
                                        selectRange={true}
                                        onChange={(value: any) => {
                                            if (Array.isArray(value) && value[0] && value[1]) {
                                                setCustomStartDate(value[0].toISOString().split('T')[0]);
                                                setCustomEndDate(value[1].toISOString().split('T')[0]);
                                                setDateFilter('Custom');
                                            }
                                        }}
                                        value={
                                            customStartDate && customEndDate
                                                ? [new Date(customStartDate), new Date(customEndDate)]
                                                : null
                                        }
                                        className="border-0 w-full rounded-xl"
                                    />

                                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                                        <div className="text-xs text-gray-600 font-medium">
                                            {customStartDate && customEndDate ? (
                                                <span className="font-bold text-gray-900">
                                                    {new Date(customStartDate).toLocaleDateString()} - {new Date(customEndDate).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">Select a date range</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(customStartDate || customEndDate) && (
                                                <button
                                                    onClick={() => {
                                                        setCustomStartDate('');
                                                        setCustomEndDate('');
                                                        setDateFilter('All Upcoming');
                                                    }}
                                                    className="text-xs font-bold text-red-600 hover:underline"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setShowCustomDate(false)}
                                                className="px-3.5 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Where? */}
                        <section className="pt-4 border-t border-gray-200/60">
                            <div className="flex items-center justify-between mb-2.5">
                                <h3 className="text-sm font-extrabold text-gray-900">Where?</h3>
                                <button
                                    onClick={() => setLocFilter(detectedCountry)}
                                    className="text-[11px] font-bold text-gray-900 hover:underline"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                                <button
                                    onClick={requestNearMe}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                        locFilter === 'Near Me'
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/60'
                                    }`}
                                >
                                    <MapPin className={`w-3.5 h-3.5 ${locFilter === 'Near Me' ? 'text-white' : 'text-gray-700'}`} />
                                    Near Me
                                </button>
                                {/* User's detected country + Amptive App */}
                                {[detectedCountry, 'Amptive App'].map(loc => (
                                    <button
                                        key={loc}
                                        onClick={() => setLocFilter(loc)}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            locFilter === loc
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/60'
                                        }`}
                                    >
                                        {loc}
                                    </button>
                                ))}
                                {/* Cities for user's detected country */}
                                {(COUNTRY_CITIES[detectedCountry] || []).map(city => (
                                    <button
                                        key={city}
                                        onClick={() => setLocFilter(city)}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            locFilter === city
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/60'
                                        }`}
                                    >
                                        {city}
                                    </button>
                                ))}
                                {/* Other countries (not the detected one) */}
                                {Object.keys(COUNTRY_CITIES).filter(c => c !== detectedCountry).map(country => (
                                    <button
                                        key={country}
                                        onClick={() => setLocFilter(country)}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            locFilter === country
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/60'
                                        }`}
                                    >
                                        {country}
                                    </button>
                                ))}
                            </div>
                            {/* Custom location search */}
                            <div className="relative mt-1">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Type a city or location..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                            setLocFilter((e.target as HTMLInputElement).value.trim());
                                        }
                                    }}
                                    className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200/60 focus:border-gray-300 rounded-full py-2 px-3.5 pl-9 text-xs font-medium text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                                />
                            </div>
                        </section>

                        {/* Price? (Simple Clean Range Slider) */}
                        <section className="pt-4 border-t border-gray-200/60">
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-extrabold text-gray-900">Price?</h3>
                                    <span className="bg-gray-900 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                                        {maxPrice === 100000
                                            ? 'Any Price'
                                            : maxPrice === 0
                                            ? 'Free Only'
                                            : `Up to ₦${maxPrice.toLocaleString()}`}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setMaxPrice(100000)}
                                    className="text-[11px] font-bold text-gray-900 hover:underline cursor-pointer"
                                >
                                    Clear
                                </button>
                            </div>

                            <input
                                type="range"
                                min="0"
                                max="100000"
                                step="5000"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(Number(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900 my-2"
                            />

                            {/* Quick Presets */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {[
                                    { label: 'Free', val: 0 },
                                    { label: 'Under ₦10k', val: 10000 },
                                    { label: 'Under ₦50k', val: 50000 },
                                    { label: 'Any', val: 100000 },
                                ].map((preset) => (
                                    <button
                                        key={preset.label}
                                        onClick={() => setMaxPrice(preset.val)}
                                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                            maxPrice === preset.val
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200/60'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* By Community */}
                        {communities.length > 0 && (
                            <section className="pt-4 border-t border-gray-200/60">
                                <div className="flex items-center justify-between mb-2.5">
                                    <h3 className="text-sm font-extrabold text-gray-900">By Community</h3>
                                    <button
                                        onClick={() => setCommunityFilter('all')}
                                        className="text-[11px] font-bold text-gray-900 hover:underline"
                                    >
                                        Reset
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        onClick={() => setCommunityFilter('all')}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            communityFilter === 'all'
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-800 border border-gray-200/60'
                                        }`}
                                    >
                                        All Communities
                                    </button>
                                    {communities.map(c => (
                                        <button
                                            key={c.community_id}
                                            onClick={() => setCommunityFilter(c.community_id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                                communityFilter === c.community_id
                                                    ? 'bg-gray-900 text-white'
                                                    : 'bg-white text-gray-800 border border-gray-200/60'
                                            }`}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Mobile Apply Button */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setShowFloatingFilters(false)}
                                className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-colors cursor-pointer shadow-md"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>

                    {/* DESKTOP TOP-LEFT FLOATING FILTER PANEL OVERLAY (DESKTOP ONLY) */}
                    <div
                        className={`hidden sm:block absolute top-[140px] left-4 z-40 w-96 bg-[#f4f7f2]/95 backdrop-blur-2xl border border-white/80 rounded-3xl p-5 max-h-[65vh] overflow-y-auto space-y-6 text-gray-900 transition-all duration-300 ease-out origin-top-left ${
                            showFloatingFilters
                                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto shadow-xl'
                                : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                        }`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-gray-200/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center">
                                    <Sliders className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className="font-bold text-sm text-gray-900">Filter Events</span>
                            </div>
                            <button
                                onClick={() => setShowFloatingFilters(false)}
                                className="text-xs font-bold text-gray-900 hover:underline cursor-pointer"
                            >
                                Hide
                            </button>
                        </div>

                        {/* When? */}
                        <section>
                            <h3 className="text-sm font-extrabold text-gray-900 mb-2.5">When?</h3>
                            <div className="flex flex-wrap gap-2 mb-1.5">
                                {['All Upcoming', 'Today', 'Tomorrow', 'This Weekend'].map(label => (
                                    <button
                                        key={label}
                                        onClick={() => {
                                            setDateFilter(label);
                                            setCustomStartDate('');
                                            setCustomEndDate('');
                                            setShowCustomDate(false);
                                        }}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            dateFilter === label && !customStartDate && !customEndDate
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/60'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <button
                                    onClick={() => setShowCustomDate(!showCustomDate)}
                                    className="flex items-center gap-1 text-[11px] font-bold text-gray-900 hover:underline cursor-pointer"
                                >
                                    Custom Range
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustomDate ? 'rotate-180' : ''}`} />
                                </button>

                                {(customStartDate || customEndDate) && (
                                    <span className="flex items-center gap-1.5 bg-gray-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                                        <span>
                                            {customStartDate ? new Date(customStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '...'} - {customEndDate ? new Date(customEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '...'}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCustomStartDate('');
                                                setCustomEndDate('');
                                                setDateFilter('All Upcoming');
                                            }}
                                            className="hover:bg-gray-700 p-0.5 rounded-full cursor-pointer transition-colors"
                                            title="Clear custom date range"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </span>
                                )}
                            </div>

                            {showCustomDate && (
                                <div className="mt-3 p-4 bg-white rounded-2xl border border-gray-200/80 shadow-lg text-gray-900 z-50">
                                    <ReactCalendar
                                        selectRange={true}
                                        onChange={(value: any) => {
                                            if (Array.isArray(value) && value[0] && value[1]) {
                                                setCustomStartDate(value[0].toISOString().split('T')[0]);
                                                setCustomEndDate(value[1].toISOString().split('T')[0]);
                                                setDateFilter('Custom');
                                            }
                                        }}
                                        value={
                                            customStartDate && customEndDate
                                                ? [new Date(customStartDate), new Date(customEndDate)]
                                                : null
                                        }
                                        className="border-0 w-full rounded-xl"
                                    />

                                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                                        <div className="text-xs text-gray-600 font-medium">
                                            {customStartDate && customEndDate ? (
                                                <span className="font-bold text-gray-900">
                                                    {new Date(customStartDate).toLocaleDateString()} - {new Date(customEndDate).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">Select a date range</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(customStartDate || customEndDate) && (
                                                <button
                                                    onClick={() => {
                                                        setCustomStartDate('');
                                                        setCustomEndDate('');
                                                        setDateFilter('All Upcoming');
                                                    }}
                                                    className="text-xs font-bold text-red-600 hover:underline"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setShowCustomDate(false)}
                                                className="px-3.5 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Where? */}
                        <section className="pt-4 border-t border-gray-200/60">
                            <div className="flex items-center justify-between mb-2.5">
                                <h3 className="text-sm font-extrabold text-gray-900">Where?</h3>
                                <button
                                    onClick={() => setLocFilter(detectedCountry)}
                                    className="text-[11px] font-bold text-gray-900 hover:underline"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                                <button
                                    onClick={requestNearMe}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                        locFilter === 'Near Me'
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/60'
                                    }`}
                                >
                                    <MapPin className={`w-3.5 h-3.5 ${locFilter === 'Near Me' ? 'text-white' : 'text-gray-700'}`} />
                                    Near Me
                                </button>
                                {/* User's detected country + Amptive App */}
                                {[detectedCountry, 'Amptive App'].map(loc => (
                                    <button
                                        key={loc}
                                        onClick={() => setLocFilter(loc)}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            locFilter === loc
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/60'
                                        }`}
                                    >
                                        {loc}
                                    </button>
                                ))}
                                {/* Cities for user's detected country */}
                                {(COUNTRY_CITIES[detectedCountry] || []).map(city => (
                                    <button
                                        key={city}
                                        onClick={() => setLocFilter(city)}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            locFilter === city
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/60'
                                        }`}
                                    >
                                        {city}
                                    </button>
                                ))}
                                {/* Other countries (not the detected one) */}
                                {Object.keys(COUNTRY_CITIES).filter(c => c !== detectedCountry).map(country => (
                                    <button
                                        key={country}
                                        onClick={() => setLocFilter(country)}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            locFilter === country
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/60'
                                        }`}
                                    >
                                        {country}
                                    </button>
                                ))}
                            </div>
                            {/* Custom location search */}
                            <div className="relative mt-1">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Type a city or location..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                            setLocFilter((e.target as HTMLInputElement).value.trim());
                                        }
                                    }}
                                    className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200/60 focus:border-gray-300 rounded-full py-2 px-3.5 pl-9 text-xs font-medium text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                                />
                            </div>
                        </section>

                        {/* Price? (Simple Clean Range Slider) */}
                        <section className="pt-4 border-t border-gray-200/60">
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-extrabold text-gray-900">Price?</h3>
                                    <span className="bg-gray-900 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                                        {maxPrice === 100000
                                            ? 'Any Price'
                                            : maxPrice === 0
                                            ? 'Free Only'
                                            : `Up to ₦${maxPrice.toLocaleString()}`}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setMaxPrice(100000)}
                                    className="text-[11px] font-bold text-gray-900 hover:underline cursor-pointer"
                                >
                                    Clear
                                </button>
                            </div>

                            <input
                                type="range"
                                min="0"
                                max="100000"
                                step="5000"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(Number(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900 my-2"
                            />

                            {/* Quick Presets */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {[
                                    { label: 'Free', val: 0 },
                                    { label: 'Under ₦10k', val: 10000 },
                                    { label: 'Under ₦50k', val: 50000 },
                                    { label: 'Any', val: 100000 },
                                ].map((preset) => (
                                    <button
                                        key={preset.label}
                                        onClick={() => setMaxPrice(preset.val)}
                                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                            maxPrice === preset.val
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200/60'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* By Community */}
                        {communities.length > 0 && (
                            <section className="pt-4 border-t border-gray-200/60">
                                <div className="flex items-center justify-between mb-2.5">
                                    <h3 className="text-sm font-extrabold text-gray-900">By Community</h3>
                                    <button
                                        onClick={() => setCommunityFilter('all')}
                                        className="text-[11px] font-bold text-gray-900 hover:underline"
                                    >
                                        Reset
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        onClick={() => setCommunityFilter('all')}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            communityFilter === 'all'
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-800 border border-gray-200/60'
                                        }`}
                                    >
                                        All Communities
                                    </button>
                                    {communities.map(c => (
                                        <button
                                            key={c.community_id}
                                            onClick={() => setCommunityFilter(c.community_id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                                communityFilter === c.community_id
                                                    ? 'bg-gray-900 text-white'
                                                    : 'bg-white text-gray-800 border border-gray-200/60'
                                            }`}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* FIXED RIGHT SIDEBAR EVENT LIST PANEL */}
                    <div className={`absolute top-0 right-0 bottom-0 z-20 bg-white/95 backdrop-blur-xl border-l border-gray-200/90 p-6 pt-28 overflow-y-auto space-y-4 flex-col text-gray-900 shadow-md sm:flex sm:w-[380px] lg:w-[420px] ${
                        viewMode === 'list' ? 'flex w-full' : 'hidden'
                    }`}>
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">
                                {locFilter === 'Near Me'
                                    ? 'Events Near You'
                                    : locFilter
                                    ? `Events in ${locFilter}`
                                    : 'Explore Events'}
                            </h2>
                            <p className="text-sm text-gray-500 font-medium leading-snug">
                                {locFilter === 'Near Me'
                                    ? 'Discover upcoming events, meetups, workshops, and community gatherings near you.'
                                    : `Discover upcoming events, meetups, workshops, and community gatherings in ${locFilter || 'Nigeria'}.`}
                            </p>
                        </div>

                        {/* Search bar & Mobile Filter Button */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search events, hosts, or locations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#f4f4f5] hover:bg-[#eaeaea] focus:bg-white border border-transparent focus:border-gray-300 rounded-full py-2.5 px-4 pl-10 text-sm font-normal placeholder:font-normal placeholder:text-gray-400 text-gray-900 transition-all outline-none"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFloatingFilters(!showFloatingFilters)}
                                title="Filter Events"
                                aria-label="Filter Events"
                                className="sm:hidden flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-gray-900 text-white hover:bg-black transition-colors shadow-sm cursor-pointer"
                            >
                                <Sliders className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Event List Items */}
                        <div className="space-y-1 pt-1 flex-1 overflow-y-auto pr-1">
                            {loading ? (
                                <div className="space-y-4">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-2xl w-full">
                                            <div className="w-20 h-20 shrink-0 rounded-2xl bg-gray-100 animate-pulse" />
                                            <div className="flex-1 space-y-2 py-1">
                                                <div className="h-3 bg-gray-100 rounded w-20 animate-pulse" />
                                                <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                                                <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                ) : events.length > 0 ? (
                                events.map((event, index) => {
                                    const eventDate = event.scheduled_for ? new Date(event.scheduled_for) : null;
                                    const dateStr = eventDate 
                                        ? eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                        : 'TBA';

                                    const isEvVirtual = event.venue?.venue_type === 'virtual' || 
                                                         event.location?.type === 'online' || 
                                                         (event as any).is_online || 
                                                         (event as any).is_virtual;
                                    const venueName = event.venue?.name || event.location?.venue || (event as any).venue_name || '';
                                    const venueAddress = event.location?.address || event.venue?.address || '';
                                    const cityName = event.venue?.city || event.location?.city || '';
                                    const rawFull = [venueName || venueAddress, cityName].filter(Boolean).join(', ');
                                    const fullLoc = isEvVirtual || !rawFull || rawFull === 'TBD' || rawFull === 'TBA'
                                        ? 'Amptive App'
                                        : rawFull;

                                    return (
                                        <div key={event.event_id}>
                                            <Link
                                                to={`/events/${event.event_id}`}
                                                className="group flex items-center gap-4 p-2 rounded-2xl hover:bg-gray-50 transition-colors w-full relative cursor-pointer block"
                                                style={{ animationDelay: `${index * 50}ms` }}
                                            >
                                                {/* Thumbnail Container */}
                                                <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-200 border border-gray-100 group-hover:scale-[1.02] transition-transform duration-500">
                                                    <img 
                                                        src={event.thumbnail_url || '/images/IMG_6053 2.JPG'} 
                                                        alt={event.title}
                                                        className="w-full h-full object-cover" 
                                                        onError={(e: any) => { e.target.src = '/images/IMG_6053 2.JPG'; }}
                                                    />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-tight">
                                                            {dateStr}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-black transition-colors">
                                                        {event.title}
                                                    </h3>

                                                    <div className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
                                                        {fullLoc}
                                                    </div>
                                                </div>
                                            </Link>
                                            {index < events.length - 1 && (
                                                <div className="my-1.5 mx-4 border-t border-gray-100/90" />
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-10 text-center text-gray-500">
                                    <p className="text-sm font-semibold">No events found in {locFilter === 'Near Me' ? 'your area' : (locFilter || 'this area')}.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MOBILE VIEW TOGGLE FLOATING PILL (MOBILE ONLY) */}
                    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 sm:hidden transition-all duration-300 ${
                        showFloatingFilters ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'
                    }`}>
                        <div className="bg-white/95 text-gray-900 backdrop-blur-2xl p-1 rounded-full shadow-2xl flex items-center border border-gray-200/80">
                            <button
                                type="button"
                                onClick={() => setViewMode('map')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                    viewMode === 'map'
                                        ? 'bg-gray-900 text-white shadow-md'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <MapIcon className="w-3.5 h-3.5" />
                                <span>Map</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                    viewMode === 'list'
                                        ? 'bg-gray-900 text-white shadow-md'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <List className="w-3.5 h-3.5" />
                                <span>List</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
