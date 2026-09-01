import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Share2, Ticket, Check, Globe, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import amptiveLogo from '@/assets/amptivelogo.svg';
import { AmptiveSplash } from '@/components/AmptiveSpinner';
import { extractDominantColors } from '@/utils/colorExtractor';
import { QRCodeSVG } from 'qrcode.react';
import { toastSuccess, toastError } from '@/lib/ui/toast';
import { getCurrentUser } from '@/lib/api/auth';
import { getEvent, getRelatedEvents, publishEvent, StandaloneEvent } from '@/lib/api/events';
import { getProfileByUserId } from '@/lib/api/profiles';
import { getTicketEarlyBirdRemaining, getTicketUnitPrice, getTicketsForEvent, isTicketSoldOut } from '@/lib/api/tickets';
import { getVenue } from '@/lib/api/venues';
import { useSEO } from '@/hooks/useSEO';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'lagos': { lat: 6.5244, lng: 3.3792 },
  'abuja': { lat: 9.0765, lng: 7.3986 },
  'lekki': { lat: 6.4698, lng: 3.5852 },
  'ikeja': { lat: 6.6018, lng: 3.3515 },
  'yaba': { lat: 6.5095, lng: 3.3711 },
  'port harcourt': { lat: 4.8156, lng: 7.0498 },
  'ibadan': { lat: 7.3775, lng: 3.9470 },
  'enugu': { lat: 6.4584, lng: 7.5464 },
  'benin': { lat: 6.3350, lng: 5.6037 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'houston': { lat: 29.7604, lng: -95.3698 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'atlanta': { lat: 33.7490, lng: -84.3880 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'accra': { lat: 5.6037, lng: -0.1870 },
  'johannesburg': { lat: -26.2041, lng: 28.0473 },
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'nairobi': { lat: -1.2921, lng: 36.8219 },
  'berlin': { lat: 52.5200, lng: 10.4515 },
};

function VenueMap({
  latitude,
  longitude,
  locationQuery,
  venueName,
  hostAvatarUrl
}: {
  latitude?: number | null;
  longitude?: number | null;
  locationQuery?: string;
  venueName?: string;
  hostAvatarUrl?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let cancelled = false;

    // Determine initial center coordinates
    let initialLat = latitude;
    let initialLng = longitude;

    if ((initialLat == null || initialLng == null || (initialLat === 0 && initialLng === 0)) && locationQuery) {
      const q = locationQuery.toLowerCase();
      for (const [city, coords] of Object.entries(CITY_COORDS)) {
        if (q.includes(city)) {
          initialLat = coords.lat;
          initialLng = coords.lng;
          break;
        }
      }
    }

    if (initialLat == null || initialLng == null || (initialLat === 0 && initialLng === 0)) {
      initialLat = 6.5244;
      initialLng = 3.3792;
    }

    const map = L.map(mapRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    // Tile Layer: Mapbox Streets v12 → CARTO Voyager fallback
    const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN;
    if (mapboxToken) {
      L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
        { attribution: '© Mapbox © OpenStreetMap', tileSize: 512, zoomOffset: -1, minZoom: 3, maxZoom: 20 }
      ).addTo(map);
    } else {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© CARTO © OpenStreetMap',
        subdomains: 'abcd',
        minZoom: 3,
        maxZoom: 20,
      }).addTo(map);
    }

    // Host avatar pin marker
    const imgSrc = hostAvatarUrl || '/images/IMG_6053 2.JPG';
    const iconHtml = `
      <div style="position:relative;display:inline-flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="width:48px;height:48px;border-radius:50%;background:#ffffff;border:4px solid #ffffff;box-sizing:border-box;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.18);">
          <img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/images/IMG_6053 2.JPG';" />
        </div>
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #ffffff;margin-top:-2px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.12));"></div>
      </div>
    `;

    const eventIcon = L.divIcon({
      className: '',
      html: iconHtml,
      iconSize: [48, 58],
      iconAnchor: [24, 58],
    });

    const marker = L.marker([initialLat, initialLng], { icon: eventIcon }).addTo(map);
    mapInstance.current = map;

    // If explicit coordinates were missing, attempt async geocoding via Nominatim
    if ((latitude == null || longitude == null || (latitude === 0 && longitude === 0)) && locationQuery) {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationQuery)}`)
        .then((res) => res.json())
        .then((results) => {
          if (!cancelled && results && results[0]) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            if (!isNaN(lat) && !isNaN(lon)) {
              map.setView([lat, lon], 15);
              marker.setLatLng([lat, lon]);
            }
          }
        })
        .catch(() => { /* keep initial center */ });
    }

    return () => {
      cancelled = true;
      map.remove();
      mapInstance.current = null;
    };
  }, [latitude, longitude, locationQuery, hostAvatarUrl]);

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-3xl border border-gray-200 bg-gray-100 shadow-sm group">
      <style>{`
        .leaflet-tile-pane { filter: saturate(1.04) brightness(1.01); }
      `}</style>
      <div ref={mapRef} className="absolute inset-0 h-full w-full z-10" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/5 z-20" />
      {venueName && (
        <div className="absolute bottom-3 left-3 z-30 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 shadow-sm">
          {venueName}
        </div>
      )}
    </div>
  );
}


type EventTicket = {
  id: string;
  label: string;
  price: number;
  currency?: string | null;
  quantity?: number | null;
  quantity_total?: number | null;
  quantity_sold?: number | string | null;
  quantity_remaining?: number | null;
  is_active?: boolean;
  active?: boolean;
  status?: string | null;
  availability?: string | null;
  sold_out?: boolean;
  is_sold_out?: boolean;
  benefits?: string[];
  color_theme?: string | null;
  early_bird_discount_percent?: number | null;
  early_bird_discount_percentage?: number | null;
  early_bird_max_count?: number | null;
  early_bird_units?: number | null;
};


const TICKET_THEMES: Record<string, {
  name: string;
  gradient: string;
  border: string;
  text: string;
  badge: string;
  badgeText: string;
}> = {
  silver: {
    name: 'Silver',
    gradient: 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200',
    border: 'border-gray-200',
    text: 'text-gray-900',
    badge: 'bg-gray-100 border-gray-200',
    badgeText: 'text-gray-700'
  },
  bronze: {
    name: 'Bronze',
    gradient: 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200',
    border: 'border-orange-200',
    text: 'text-orange-900',
    badge: 'bg-orange-100 border-orange-200',
    badgeText: 'text-orange-800'
  },
  gold: {
    name: 'Gold',
    gradient: 'bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-200',
    border: 'border-yellow-200',
    text: 'text-yellow-900',
    badge: 'bg-yellow-100 border-yellow-200',
    badgeText: 'text-yellow-800'
  },
  platinum: {
    name: 'Platinum',
    gradient: 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200',
    border: 'border-slate-200',
    text: 'text-slate-900',
    badge: 'bg-slate-100 border-slate-200',
    badgeText: 'text-slate-700'
  },
  obsidian: {
    name: 'Obsidian',
    gradient: 'bg-gradient-to-br from-gray-800 via-gray-900 to-black',
    border: 'border-gray-700',
    text: 'text-white',
    badge: 'bg-gray-800 border-gray-700',
    badgeText: 'text-gray-300'
  }
};

// Helper Functions
const formatTicketPrice = (price: number, currency: string = 'NGN'): string => {
  if (price === 0) return 'Free';
  const symbol = currency === 'NGN' ? '₦' : `${currency} `;
  if (price >= 1000000000) return `${symbol}${(price / 1000000000).toFixed(1).replace(/\.0$/, '')}B`;
  if (price >= 1000000) return `${symbol}${(price / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (price >= 1000) return `${symbol}${(price / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
  });
  return formatter.format(price);
};

const deriveTicketBenefits = (ticket: EventTicket): string[] => {
  if (ticket.benefits && ticket.benefits.length > 0) return ticket.benefits;
  const label = ticket.label?.toLowerCase() ?? '';
  const benefits = new Set<string>();

  if (label.includes('vip') || label.includes('premium')) {
    benefits.add('Priority check-in lane');
    benefits.add('Complimentary welcome drink');
    benefits.add('Exclusive lounge seating');
  } else if (label.includes('table')) {
    benefits.add('Reserved table service');
    benefits.add('Dedicated host');
  } else {
    benefits.add('Guaranteed entry to event');
    benefits.add('Access to main areas');
  }
  return Array.from(benefits);
};

const toCoordinate = (value: unknown) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const getVenueAddress = (venue: NonNullable<StandaloneEvent['venue']>) => {
  return [venue.address_line1, venue.city, venue.state, venue.country].filter(Boolean).join(', ');
};

const getLegacyLocationLabel = (event: StandaloneEvent) => {
  return [event.location?.venue, event.location?.city].filter(Boolean).join(', ');
};



const EventDetail = () => {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<StandaloneEvent | null>(null);
  const [tickets, setTickets] = useState<EventTicket[]>([]);

  useSEO({
    title: event ? event.title : 'Loading Event...',
    description: event ? (event.description?.replace(/<[^>]*>/g, '').slice(0, 155) || 'Join this live experience on Amptive.') : 'Join our live experiences and community gatherings.',
    image: event?.thumbnail_url,
    type: 'event',
  });

  const [organizerProfile, setOrganizerProfile] = useState<any | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<StandaloneEvent[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dominantColor, setDominantColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const isVirtualEvent = useMemo(() => {
    if (!event) return true;
    const vType = event.venue?.venue_type?.toLowerCase();
    const vName = event.venue?.name?.trim();
    const lVenue = event.location?.venue?.trim();
    const lType = event.location?.type?.toLowerCase();
    const isOnline = (event as any).is_online || (event as any).is_virtual;

    if (vType === 'virtual' || lType === 'online' || isOnline) return true;

    if (!vName || vName === 'TBD' || vName === 'TBA' || vName === 'Venue' || vName === 'Online' || vName === 'Amptive App') {
      if (!event.venue?.address_line1 && !lVenue) {
        return true;
      }
    }

    if (vType === 'physical' && vName && vName !== 'TBD' && vName !== 'TBA' && vName !== 'Venue' && vName !== 'Online') {
      return false;
    }

    return !event.venue?.address_line1 && !event.location?.venue;
  }, [event]);

  // Handle escape key to close image modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImageUrl(null);
      }
    };
    if (selectedImageUrl) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImageUrl]);

  const handleDescriptionClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // 1. Check if the clicked element is an image
    const img = target.closest('img');
    if (img) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedImageUrl(img.src);
      return;
    }

    // 2. Check if the clicked element is a link (anchor tag)
    const anchor = target.closest('a');
    if (anchor) {
      e.preventDefault();
      const href = anchor.getAttribute('href');
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const [showStickyButton, setShowStickyButton] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const mobileCtaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky button when inline button is NOT intersecting (scrolled past)
        // We check boundingClientRect.top to ensure it's scrolled *above* (negative top), not below.
        // But simply "not intersecting" is a good start. 
        // Better: only show if we've scrolled PAST it. 
        // If entry.isIntersecting turned to false, check if it went up.
        setShowStickyButton(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );

    if (mobileCtaRef.current) {
      observer.observe(mobileCtaRef.current);
    }

    return () => observer.disconnect();
  }, [loading]); // Re-run when loading finishes so ref exists

  const displayProfile = organizerProfile || {
    username: 'Event Host',
    full_name: 'Event Host',
    avatar_url: null
  };

  // Fetch logic
  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      setLoading(true);
      setError(null);

      // Fetch Current User if logged in
      const user = await getCurrentUser();
      setCurrentUser(user);

      try {
        // Fetch Event
        let eventData = await getEvent(id);
        if (!eventData) throw new Error('Event not found');

        if (!eventData.venue && eventData.venue_id) {
          const venue = await getVenue(eventData.venue_id);
          if (venue) {
            eventData = { ...eventData, venue };
          }
        }

        setEvent(eventData);

        // Fetch Dominant Color
        if (eventData.thumbnail_url) {
          extractDominantColors(eventData.thumbnail_url).then(colors => {
            if (colors[0]) {
              // Convert hex to rgb for background style
              const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colors[0]);
              if (result) {
                setDominantColor({
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16)
                });
              }
            }
          });
        }

        // Fetch Tickets
        const ticketData = await getTicketsForEvent(id);
        setTickets(ticketData);

        // Fetch Organizer
        if (eventData.host?.user_id) {
          const profile = await getProfileByUserId(eventData.host!.user_id);
          // const profile = eventData.host
          if (profile) {
            setOrganizerProfile(profile);
          } else {
            // Fallback to the host data provided in the event response
            setOrganizerProfile({
              id: eventData.host.user_id,
              username: eventData.host.username || 'Event Host',
              full_name: eventData.host.display_name || eventData.host.name || eventData.host.username,
              profile_picture: eventData.host.profile_image_url || eventData.host.profile_picture || null,
              avatar_url: eventData.host.profile_image_url || eventData.host.profile_picture || null
            });
          }
        }

        // Fetch Related (Events by same organizer)
        if (eventData.host?.user_id) {
          const related = await getRelatedEvents(eventData.host?.user_id, id, 4);
          setRelatedEvents(related);
        }

      } catch (err: any) {
        console.error("Error loading event:", err);
        setError("Could not load event details.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);


  if (loading) {
    return (
      <AmptiveSplash />
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <h1 className="text-2xl font-bold text-black">Event Not Found</h1>
        <p className="text-black">{error || "The event you're looking for doesn't exist."}</p>
        <Link to="/explore" className="text-black hover:underline">Browse Events</Link>
      </div>
    );
  }

  const physicalVenue = event.venue?.venue_type === 'physical' ? event.venue : null;
  const physicalLatitude = toCoordinate(physicalVenue?.latitude ?? event.location?.latitude);
  const physicalLongitude = toCoordinate(physicalVenue?.longitude ?? event.location?.longitude);
  const fallbackMapQuery = physicalVenue
    ? [physicalVenue.name, getVenueAddress(physicalVenue)].filter(Boolean).join(', ')
    : getLegacyLocationLabel(event);
  const fallbackMapSrc = fallbackMapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(fallbackMapQuery)}&z=15&output=embed`
    : null;

  const handleScheduleEvent = async () => {
    if (!event?.scheduled_for) {
      toastError('Please set a start date and time before scheduling.');
      return;
    }
    if (new Date(event.scheduled_for) <= new Date()) {
      toastError('Start date and time must be in the future.');
      return;
    }
    setIsScheduling(true);
    const result = await publishEvent(event.event_id, event.scheduled_for);
    setIsScheduling(false);
    if (result.ok) {
      toastSuccess('Event published!');
      const updated = await getEvent(event.event_id);
      if (updated) setEvent(updated);
    } else {
      toastError(result.error || 'Failed to publish event');
    }
  };

  const renderActionContent = (mobile = false) => {
    const isDraft = event.status?.toLowerCase() === 'draft';
    const isOrganizer = currentUser?.id === event.host?.user_id;
    const isEventEnded = (() => {
      if (event.ended_at && new Date(event.ended_at) < new Date()) return true;
      if (event.scheduled_for) {
        const eventEnd = new Date(event.scheduled_for);
        eventEnd.setHours(eventEnd.getHours() + 12);
        return eventEnd < new Date();
      }
      return false;
    })();
    const hasTickets = tickets.length > 0;

    // Base classes
    const baseClasses = mobile
      ? "w-full rounded-xl py-3 text-center font-bold shadow-lg active:scale-[0.98]"
      : "w-full rounded-2xl py-4 text-center font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]";

    if (isDraft && isOrganizer) {
      return {
        button: (
          <button
            onClick={handleScheduleEvent}
            disabled={isScheduling}
            className={`${baseClasses} bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60`}
          >
            {isScheduling ? 'Scheduling...' : 'Schedule Event'}
          </button>
        ),
        footerText: "Publish this event to make it visible to attendees"
      };
    }

    if (isOrganizer) {
      return {
        button: (
          <Link to={`/dashboard/events/${event.event_id}/edit`} className={`${baseClasses} bg-black text-white block`}>
            Manage Event
          </Link>
        ),
        footerText: "Manage your event dashboard"
      };
    }

    if (isEventEnded) {
      return {
        button: (
          <button disabled className={`${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed`}>
            Event Ended
          </button>
        ),
        footerText: null
      };
    }

    if (!hasTickets) {
      return {
        button: (
          <button disabled className={`${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed`}>
            No Tickets Available
          </button>
        ),
        footerText: null
      };
    }

    const isCompletelySoldOut = hasTickets && tickets.every(isTicketSoldOut);

    if (isCompletelySoldOut) {
      return {
        button: (
          <button disabled className={`${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed`}>
            Sold Out
          </button>
        ),
        footerText: null
      };
    }

    return {
      button: (
        <Link
          to={`/events/${event.event_id}/checkout`}
          className={`${baseClasses} bg-black text-white block`}
        >
          Get Tickets
        </Link>
      ),
      footerText: "Secure checkout powered by Paystack"
    };
  };

  const availableTickets = tickets.filter(t => !isTicketSoldOut(t));
  const soldOutTickets = tickets.filter(isTicketSoldOut);
  const earlyBirdTickets = availableTickets.filter(ticket => (
    getTicketEarlyBirdRemaining(ticket) > 0 &&
    getTicketUnitPrice(ticket) < (Number(ticket.price) || 0)
  ));
  const hasEarlyBirdTickets = earlyBirdTickets.length > 0;

  return (
    <div className="min-h-screen selection:bg-blue-100 selection:text-blue-900 font-sans relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none transition-colors duration-1000"
        style={{
          backgroundColor: dominantColor
            ? `rgba(${dominantColor.r},${dominantColor.g},${dominantColor.b},0.08)`
            : '#ffffff'
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12 pt-20 lg:pt-24">

        {/* Back Button */}


        <div className="flex flex-col-reverse lg:flex-row-reverse gap-6 lg:gap-8 items-start">

          {/* LEFT COLUMN: Event Details (Previously the Form) */}
          <main className="flex-1 max-w-2xl w-full animate-in slide-in-from-bottom-4 duration-700 fade-in">
            <div className="space-y-6">

              {/* Header Group (Title + Date/Location) */}
              <div className="space-y-6">
                {/* Title */}
                <section className="group">
                  <div>
                    {/* Organizer Badge */}
                    {displayProfile && (
                      <Link 
                        to={`/profile/${displayProfile.username || event.host?.user_id}`} 
                        state={{ 
                          hostData: {
                            user_id: event.host?.user_id || displayProfile.id,
                            username: displayProfile.username,
                            full_name: displayProfile.full_name,
                            avatar_url: displayProfile.avatar_url || displayProfile.profile_picture
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors mb-4 group/badge"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
                          {(displayProfile.profile_picture || displayProfile.avatar_url) ? (
                            <>
                              <img
                                src={displayProfile.profile_picture || displayProfile.avatar_url}
                                alt={displayProfile.username || 'User'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white" style={{ display: 'none' }}>
                                {(displayProfile.full_name?.[0] || displayProfile.username?.[0] || 'U').toUpperCase()}
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                              {(displayProfile.full_name?.[0] || displayProfile.username?.[0] || 'U').toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-xs flex items-baseline gap-1">
                          Organised by <span className="font-medium">{displayProfile.full_name || displayProfile.username || 'Event Host'}</span>
                        </span>
                        <svg className="w-4 h-4 transition-transform group-hover/badge:translate-x-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="m9 18 6-6-6-6"></path>
                        </svg>
                      </Link>
                    )}

                    <h1 className="text-3xl md:text-[40px] font-bold text-black tracking-tight leading-[1.1] mb-2">
                      {event.title}
                    </h1>
                  </div>
                </section>

                {/* Date & Location Block */}
                <section className="flex flex-col gap-4">
                  {/* Date */}
                  <div className="flex items-start gap-3 group">
                    <div className="mt-1 p-2 rounded-lg bg-red-50 text-red-600 group-hover:bg-red-100 transition-colors">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 leading-tight">
                        {event.scheduled_for ? new Date(event.scheduled_for).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }) : 'TBA'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {event.scheduled_for ? new Date(event.scheduled_for).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                        {event.scheduled_for ? ` - ${new Date(event.scheduled_for).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-3 group">
                    <div className="mt-1 p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                      {isVirtualEvent ? (
                        <Globe className="w-5 h-5" />
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      {isVirtualEvent ? (
                        <>
                          <h3 className="text-base font-semibold text-gray-900 leading-tight">
                            <span className="inline-flex items-center gap-2">
                              On the Amptive App
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">Virtual</span>
                            </span>
                          </h3>
                          <div className="mt-2 max-w-md space-y-2">
                            <p className="text-sm leading-6 text-gray-500">
                              This event happens inside the Amptive app. Download the app before the event starts so you can join smoothly, access the live event, and use your ticket from your account.
                            </p>
                            {event.venue?.platform_note && (
                              <p className="text-sm leading-6 text-gray-500">{event.venue.platform_note}</p>
                            )}
                            <Link
                              to="/download"
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Download Amptive app
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="text-base font-semibold text-gray-900 leading-tight">
                            {event.venue?.name || event.location?.venue || 'Amptive App'}
                          </h3>
                          <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                            {event.venue?.address_line1 && <p>{event.venue.address_line1}</p>}
                            {(getVenueAddress(event.venue!) || getLegacyLocationLabel(event)) && (
                              <p>{getVenueAddress(event.venue!) || getLegacyLocationLabel(event)}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {/* Inline CTA Button (Mobile Only) */}
              <div ref={mobileCtaRef} className="lg:hidden w-full pb-2">
                <div className="rounded-2xl border border-gray-200 bg-white/50 p-1">
                  <div className="p-4">
                    <div className="w-full">
                      {renderActionContent(true).button}
                    </div>
                    {renderActionContent(true).footerText && (
                      <div className="mt-4 text-center text-xs text-gray-900">
                        {renderActionContent(true).footerText}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <section className="group pt-8 border-t border-gray-100">
                <div className="text-sm font-bold text-gray-600 border-b border-gray-200/60 pb-2 mb-4">
                  About Event
                </div>
                <div>
                  <div className="prose prose-lg max-w-none relative group/description">
                    <style>{`
                      .ProseMirror img {
                        cursor: zoom-in;
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                      }
                      .ProseMirror img:hover {
                        transform: scale(1.01);
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                      }
                    `}</style>
                    <div
                      dangerouslySetInnerHTML={{ __html: event.description || '<p>No description provided.</p>' }}
                      className={`ProseMirror text-base text-black transition-all duration-500 ease-in-out overflow-hidden ${isDescriptionExpanded ? 'max-h-[5000px]' : 'max-h-[240px]'}`}
                      onClick={handleDescriptionClick}
                    />

                    {/* Gradient Overlay when collapsed */}
                    {!isDescriptionExpanded && (event.description?.length || 0) > 300 && (
                      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    )}

                    {/* Hover-triggered Expand Button */}
                    {(event.description?.length || 0) > 300 && (
                      <button
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        aria-label={isDescriptionExpanded ? "Collapse" : "Expand"}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover/description:opacity-100 transition-opacity duration-200 w-10 h-10 rounded-full bg-white hover:bg-gray-50 shadow-lg border border-gray-200 flex items-center justify-center text-black hover:text-black"
                        type="button"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          className={`w-5 h-5 transition-transform duration-300 ${isDescriptionExpanded ? 'rotate-180' : ''}`}
                        >
                          <path d="M12 5v14M19 12l-7 7-7-7"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Tickets - Preserved 3D Card Design */}
              <section className="pt-12 border-t border-gray-100">
                {tickets.length > 0 ? (
                  <div className="space-y-8">
                    {availableTickets.length > 0 && (
                      <div>
                        <div className="text-sm font-bold text-gray-600 border-b border-gray-200/60 pb-2 mb-6">
                          Available tickets
                        </div>
                        {hasEarlyBirdTickets && (
                          <div className="mb-5 border-l-2 border-orange-500 pl-3">
                            <p className="text-[13px] font-semibold leading-tight text-gray-950">
                              Early bird pricing is available
                            </p>
                            <p className="mt-1 text-[12px] font-medium leading-5 text-gray-500">
                              Limited discounted tickets are still on sale before prices return to regular.
                            </p>
                          </div>
                        )}
                        <div className="flex overflow-x-auto pb-4 snap-x gap-4 md:gap-6 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar">
                          {availableTickets.map((ticket) => {
                            const benefits = deriveTicketBenefits(ticket);
                            const theme = TICKET_THEMES[ticket.color_theme || 'silver'] || TICKET_THEMES.silver;
                            const hasTicketEarlyBird = getTicketEarlyBirdRemaining(ticket) > 0 && getTicketUnitPrice(ticket) < (Number(ticket.price) || 0);

                            return (
                              <div key={ticket.id} className="group relative min-h-[14rem] flex-shrink-0 snap-center [perspective:1600px]" style={{ width: '85vw', maxWidth: '360px' }}>
                                <div className="relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                                  {/* Front */}
                                  <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-3xl border ${theme.border} ${theme.gradient} px-6 py-6 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow [backface-visibility:hidden]`}>
                                    <span className={`pointer-events-none absolute inset-y-8 -right-4 z-0 h-10 w-10 rounded-full border ${theme.border} bg-white/40`} aria-hidden="true" />
                                    <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[15%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                                    <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[15%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                                    <div className="relative z-10 flex items-start justify-between gap-4">
                                      <div className="space-y-1">
                                        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.text} opacity-60`}>{event.title}</p>
                                        <h3 className={`text-xl font-bold ${theme.text}`}>{ticket.label}</h3>
                                      </div>
                                    </div>

                                    <div className="relative z-10 mt-4 flex items-end justify-between">
                                      <span className={`text-3xl font-bold ${theme.text} tracking-tight`}>
                                        {formatTicketPrice(hasTicketEarlyBird ? getTicketUnitPrice(ticket) : ticket.price, ticket.currency ?? 'NGN')}
                                      </span>
                                      {hasTicketEarlyBird ? (
                                        <div className="flex flex-col items-end gap-1">
                                          <span className={`text-xs font-semibold line-through opacity-45 ${theme.text}`}>
                                            {formatTicketPrice(ticket.price, ticket.currency ?? 'NGN')}
                                          </span>
                                          <button className={`px-5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 ${theme.text} text-xs font-bold transition-colors uppercase whitespace-nowrap`}>
                                            Early bird
                                          </button>
                                        </div>
                                      ) : (
                                        <button className={`px-5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 ${theme.text} text-xs font-bold transition-colors uppercase whitespace-nowrap`}>
                                          PER GUEST
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Back */}
                                  <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-3xl border ${theme.border} ${theme.gradient} px-6 py-6 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]`}>
                                    <div className="relative z-10 space-y-3">
                                      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.text} opacity-60`}>Includes</p>
                                      <ul className={`space-y-2 ${theme.text}`}>
                                        {benefits.map((benefit, i) => (
                                          <li key={i} className="flex items-start gap-2">
                                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                            <span className="text-xs font-medium opacity-90">{benefit}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    <div className="relative z-10 flex items-end justify-between">
                                      <div className="flex flex-col gap-1">
                                        <span className={`text-xl font-bold ${theme.text}`}>
                                          {formatTicketPrice(hasTicketEarlyBird ? getTicketUnitPrice(ticket) : ticket.price, ticket.currency ?? 'NGN')}
                                        </span>
                                        {hasTicketEarlyBird && (
                                          <span className={`text-xs font-semibold line-through opacity-45 ${theme.text}`}>
                                            {formatTicketPrice(ticket.price, ticket.currency ?? 'NGN')}
                                          </span>
                                        )}
                                      </div>
                                      <div className={`flex flex-col items-end ${theme.text}`}>
                                        <QRCodeSVG value={`EVENT-${event.event_id}-TICKET-${ticket.id}`} size={48} fgColor="currentColor" bgColor="transparent" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {soldOutTickets.length > 0 && (
                      <div>
                        <div className="text-sm font-bold text-gray-600 border-b border-gray-200/60 pb-2 mb-6">
                          Sold out
                        </div>
                        <div className="flex overflow-x-auto pb-4 snap-x gap-4 md:gap-6 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar">
                          {soldOutTickets.map((ticket) => {
                            const benefits = deriveTicketBenefits(ticket);
                            const theme = TICKET_THEMES[ticket.color_theme || 'silver'] || TICKET_THEMES.silver;

                            return (
                              <div key={ticket.id} className="group relative min-h-[14rem] flex-shrink-0 snap-center [perspective:1600px] opacity-60 grayscale cursor-not-allowed" style={{ width: '85vw', maxWidth: '360px' }}>
                                <div className="relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                                  {/* Front */}
                                  <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-3xl border ${theme.border} ${theme.gradient} px-6 py-6 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow [backface-visibility:hidden]`}>
                                    <span className={`pointer-events-none absolute inset-y-8 -right-4 z-0 h-10 w-10 rounded-full border ${theme.border} bg-white/40`} aria-hidden="true" />
                                    <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[15%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                                    <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[15%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                                    <div className="relative z-10 flex items-start justify-between gap-4">
                                      <div className="space-y-1">
                                        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.text} opacity-60`}>{event.title}</p>
                                        <h3 className={`text-xl font-bold ${theme.text}`}>{ticket.label}</h3>
                                      </div>
                                    </div>

                                    <div className="relative z-10 mt-4 flex items-end justify-between">
                                      <span className={`text-3xl font-bold ${theme.text} tracking-tight`}>
                                        {formatTicketPrice(ticket.price, ticket.currency ?? 'NGN')}
                                      </span>
                                      <span className="rounded-full bg-rose-50 px-4 py-1.5 text-[12px] font-semibold text-rose-600 whitespace-nowrap ring-1 ring-rose-100">
                                        Sold out
                                      </span>
                                    </div>
                                  </div>

                                  {/* Back */}
                                  <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-3xl border ${theme.border} ${theme.gradient} px-6 py-6 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]`}>
                                    <div className="relative z-10 space-y-3">
                                      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.text} opacity-60`}>Includes</p>
                                      <ul className={`space-y-2 ${theme.text}`}>
                                        {benefits.map((benefit, i) => (
                                          <li key={i} className="flex items-start gap-2">
                                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                            <span className="text-xs font-medium opacity-90">{benefit}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    <div className="relative z-10 flex items-end justify-between">
                                      <div className="flex flex-col gap-1">
                                        <span className={`text-xl font-bold ${theme.text}`}>
                                          {formatTicketPrice(ticket.price, ticket.currency ?? 'NGN')}
                                        </span>
                                      </div>
                                      <div className={`flex flex-col items-end ${theme.text}`}>
                                        <QRCodeSVG value={`EVENT-${event.event_id}-TICKET-${ticket.id}`} size={48} fgColor="currentColor" bgColor="transparent" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-3xl border border-dashed border-gray-200 bg-gray-50/50">
                    <p className="text-gray-500">No tickets available yet.</p>
                  </div>
                )}
              </section>

              {/* Location Map Section */}
              {!isVirtualEvent && (physicalLatitude !== null || physicalLongitude !== null || fallbackMapQuery) ? (
                <section className="pt-12 border-t border-gray-100">
                  <div className="text-sm font-bold text-gray-600 border-b border-gray-200/60 pb-2 mb-6">
                    Location
                  </div>
                  <VenueMap
                    latitude={physicalLatitude}
                    longitude={physicalLongitude}
                    locationQuery={fallbackMapQuery}
                    venueName={physicalVenue?.name || event.location?.venue}
                    hostAvatarUrl={event.host?.profile_picture || (event.host as any)?.profile_image_url || (event.host as any)?.avatar_url || organizerProfile?.avatar_url || organizerProfile?.profile_picture || undefined}
                  />
                </section>
              ) : null}

              {/* More Events Widget (Right Column - Desktop) */}
              {relatedEvents.length > 0 && (
                <section className="pt-12 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-600 border-b border-gray-200/60 pb-2 mb-6">
                    More from {displayProfile.username ? displayProfile.username.charAt(0).toUpperCase() + displayProfile.username.slice(1) : 'Host'}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {relatedEvents.slice(0, 4).map((evt) => (
                      <Link key={evt.event_id} to={`/events/${evt.event_id}`} className="group flex items-center gap-3 bg-gray-50/50 p-2 rounded-xl hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                          {evt.thumbnail_url ? (
                            <img
                              src={evt.thumbnail_url}
                              alt={evt.title || 'Event'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-100">
                              <img src={amptiveLogo} alt="Amptive" className="h-6 w-auto opacity-20 grayscale" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {evt.title || 'Untitled Event'}
                          </h4>
                          <p className="text-xs font-medium text-gray-500 line-clamp-1">
                            {new Date(evt.scheduled_for!).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: 'numeric',
                            })}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}



            </div>
          </main>

          {/* RIGHT COLUMN: Cover Image & Sticky Actions */}
          <div className="w-full lg:w-[380px] space-y-8 animate-in slide-in-from-right-8 duration-1000 delay-200 fade-in fill-mode-backwards lg:sticky lg:top-24">

            {/* Cover Image Card */}
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-gray-100">
              {event.thumbnail_url ? (
                <img
                  src={event.thumbnail_url}
                  alt={event.title || 'Event Cover'}
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-50">
                  <img src={amptiveLogo} alt="Amptive" className="h-24 w-auto opacity-20 grayscale" />
                </div>
              )}

              {/* Share Button Overlay */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toastSuccess("Link copied to clipboard!");
                }}
                className="absolute top-6 right-6 p-3 rounded-full bg-white/90 backdrop-blur-md shadow-lg text-black hover:text-black hover:scale-110 transition-all active:scale-95"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Actions / CTA (Desktop) */}
            <div className="hidden lg:block space-y-4">
              {renderActionContent(false).button}
              {renderActionContent(false).footerText && (
                <p className="mt-3 text-center text-xs font-medium text-black">
                  {renderActionContent(false).footerText}
                </p>
              )}
            </div>

            {/* Mobile Sticky Action Bar */}
            <div className={`fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/80 backdrop-blur-xl p-4 lg:hidden safe-area-pb transition-transform duration-300 ${showStickyButton ? 'translate-y-0' : 'translate-y-full'}`}>
              {renderActionContent(true).button}
              {renderActionContent(true).footerText && (
                <div className="mt-2 text-center text-xs text-gray-900">
                  {renderActionContent(true).footerText}
                </div>
              )}
            </div>
          </div>

          {/* Organizer - Desktop Sidebar (Hidden but kept for structure) */}

          {/* More Events Widget */}

        </div>
      </div>

      <AnimatePresence>
        {selectedImageUrl && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImageUrl(null)}
          >
            <motion.div
              className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center"
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Bar Actions */}
              <div className="absolute -top-12 right-0 flex items-center gap-3">
                <a
                  href={selectedImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md shadow-lg transition-all active:scale-95 border border-white/5"
                  title="Open in new window"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Original</span>
                </a>
                <button
                  onClick={() => setSelectedImageUrl(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md shadow-lg transition-all active:scale-95 hover:rotate-90 duration-200 border border-white/5"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Preview Image Container */}
              <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-black/20 shadow-2xl flex items-center justify-center max-w-full max-h-[80vh]">
                <img
                  src={selectedImageUrl}
                  alt="Description Preview"
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl md:rounded-3xl select-none"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default EventDetail;
