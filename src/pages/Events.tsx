import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, LayoutGrid, List, MapPin, MoreVertical, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { listEvents, StandaloneEvent } from '@/lib/api/events';
import { getTicketsForEvent } from '@/lib/api/tickets';
import EventCard, { EventCardSkeleton } from '../components/EventCard';
import { useSEO } from '@/hooks/useSEO';

const filters = [
  { id: 'all', name: 'All' },
  { id: 'music', name: 'Music' },
  { id: 'tech', name: 'Tech' },
  { id: 'art', name: 'Art' },
  { id: 'business', name: 'Business' },
];

const getEventLocation = (event: StandaloneEvent) => {
  if (event.location?.type === 'online') return 'Online';
  return event.venue?.name || event.location?.venue || event.location?.city || event.venue?.city || 'Location TBA';
};

const getEventPrice = (event: StandaloneEvent) => {
  const tickets = Array.isArray(event.event_tickets)
    ? event.event_tickets
    : Array.isArray(event.ticket_types)
      ? event.ticket_types
      : [];

  if (tickets.length > 0) {
    const prices = tickets
      .map((ticket: any) => Number(ticket?.price ?? ticket?.amount ?? ticket?.ticket_price ?? 0))
      .filter((price: number) => Number.isFinite(price));
    return prices.length > 0 ? Math.min(...prices) : 0;
  }

  const rawPrice = (event as any).price_from ?? (event as any).price;
  return rawPrice != null && Number.isFinite(Number(rawPrice)) ? Number(rawPrice) : 0;
};

const getEventPriceLabel = (event: StandaloneEvent) => {
  const tickets = Array.isArray(event.event_tickets)
    ? event.event_tickets
    : Array.isArray(event.ticket_types)
      ? event.ticket_types
      : [];

  if (tickets.length > 0) {
    const prices = tickets
      .map((ticket: any) => Number(ticket?.price ?? ticket?.amount ?? ticket?.ticket_price ?? 0))
      .filter((price: number) => Number.isFinite(price));

    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const isMultiple = minPrice !== maxPrice || tickets.length > 1;

      if (minPrice === 0) {
        return isMultiple ? 'From Free' : 'Free';
      }
      const formatted = `₦${minPrice.toLocaleString()}`;
      return isMultiple ? `From ${formatted}` : formatted;
    }
  }

  const rawPrice = (event as any).price_from ?? (event as any).price;
  if (rawPrice == null || !Number.isFinite(Number(rawPrice))) return 'Free';
  const numericPrice = Number(rawPrice);
  if (numericPrice === 0) return 'Free';

  const isMultiple = Boolean((event as any).price_from != null || (event as any).has_multiple_prices);
  const formatted = `₦${numericPrice.toLocaleString()}`;
  return isMultiple ? `From ${formatted}` : formatted;
};

const getEventDateLabel = (date?: string | null) => {
  if (!date) return 'Date TBA';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
};

const isSoldOut = (event: StandaloneEvent) => Boolean((event as any).is_sold_out);

const hasActiveEarlyBird = (event: StandaloneEvent) => {
  if ((event as any).has_early_bird || (event as any).hasEarlyBirdOnSale) return true;
  const tickets = Array.isArray((event as any).event_tickets)
    ? (event as any).event_tickets
    : Array.isArray((event as any).ticket_types)
      ? (event as any).ticket_types
      : [];

  if (tickets.length === 0) {
    return Boolean((event as any).has_early_bird);
  }

  return tickets.some((ticket: any) => {
    // 1. Direct boolean flags
    if (ticket.has_early_bird === true || ticket.is_early_bird === true || ticket.is_early_bird_on_sale === true) {
      const ebUnits = Number(ticket.early_bird_max_count ?? ticket.early_bird_units ?? ticket.early_bird_quantity ?? 0);
      const ebSold = Number(ticket.early_bird_sold_count ?? ticket.early_bird_sold ?? 0);
      if (ebUnits > 0 && ebSold >= ebUnits) return false;
      if (ticket.early_bird_deadline && new Date(ticket.early_bird_deadline) < new Date()) return false;
      return true;
    }

    // 2. Early bird in ticket label, name or type
    const nameOrType = `${ticket.label || ''} ${ticket.name || ''} ${ticket.type || ''} ${ticket.title || ''} ${ticket.category || ''}`.toLowerCase();
    if (nameOrType.includes('early')) {
      const total = Number(ticket.quantity_total ?? ticket.quantity ?? ticket.capacity ?? 0);
      const sold = Number(ticket.quantity_sold ?? ticket.sold_count ?? 0);
      if (total > 0 && sold >= total) return false;
      if (ticket.early_bird_deadline && new Date(ticket.early_bird_deadline) < new Date()) return false;
      return true;
    }

    // 3. Discount percentage check
    const discount = Number(ticket.early_bird_discount_percent ?? ticket.early_bird_discount_percentage ?? 0);
    const ebUnits = Number(ticket.early_bird_max_count ?? ticket.early_bird_units ?? 0);
    if (discount > 0 && ebUnits > 0) {
      const ebSold = Number(ticket.early_bird_sold_count ?? ticket.early_bird_sold ?? 0);
      if (ebSold < ebUnits) return true;
    }

    return false;
  });
};

export default function Events() {
  useSEO({
    title: 'Events',
    description: 'Discover and book tickets for live shows, workshops, and creative events happening on Amptive.',
    keywords: 'amptive events, live shows, workshops, creative meetups, ticket sales',
  });

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPopularSort = searchParams.get('sort') === 'popular' || searchParams.get('view') === 'chart';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'chart'>(isPopularSort ? 'chart' : 'grid');
  const [events, setEvents] = useState<StandaloneEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPopularSort) {
      setViewMode('chart');
    }
  }, [isPopularSort]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const eventsData = await listEvents({ page_size: 100 });
        
        // Fetch tickets for events to retrieve early bird ticket tiers
        const eventsWithTickets = await Promise.all((eventsData || []).map(async (event: any) => {
          try {
            const tickets = await getTicketsForEvent(event.event_id);
            return { ...event, event_tickets: tickets, ticket_types: tickets };
          } catch {
            return event;
          }
        }));

        setEvents(eventsWithTickets || []);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
      const searchableText = [
        event.title,
        event.description,
        getEventLocation(event),
        event.community?.name,
        ...(event.tags || []).map((tag) => tag.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);
      const matchesFilter = selectedFilter === 'all' || event.tags?.some((tag) => tag.name?.toLowerCase() === selectedFilter);
      return matchesSearch && matchesFilter;
    });
  }, [events, searchTerm, selectedFilter]);

  const resultLabel = loading
    ? 'Loading events'
    : `${filteredEvents.length} ${filteredEvents.length === 1 ? 'event' : 'events'}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-16 px-4 sm:px-10 lg:px-14">
      <div>
        <header className="mb-4 md:mb-6 w-full flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
              {viewMode === 'chart' ? 'Popular this Week' : 'Upcoming Events'}
            </h1>
            <p className="hidden sm:block text-[15px] text-black/40 font-sans mt-1">
              {viewMode === 'chart'
                ? 'The top ranked and most booked events on Amptive right now.'
                : 'Browse live experiences and community gatherings happening on Amptive.'}
            </p>
          </div>
        </header>

        <div className="mb-6" />

        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <EventCardSkeleton key={`events-skeleton-${index}`} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 xl:gap-12 items-start w-full">
              {/* Left Chart Skeleton List */}
              <div className="flex-1 min-w-0 w-full max-w-2xl lg:max-w-[620px] divide-y divide-gray-200/90 border-t border-b border-gray-200/90">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={`chart-skel-${index}`} className="flex items-center gap-4 py-3 sm:py-3.5 px-2 animate-pulse">
                    <div className="h-6 w-8 bg-gray-200 rounded shrink-0" />
                    <div className="h-16 w-16 sm:h-[75px] sm:w-[75px] bg-gray-200 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 bg-gray-200 rounded" />
                      <div className="h-3 w-1/3 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Video Card Skeleton */}
              <div className="hidden lg:block lg:w-[320px] xl:w-[360px] shrink-0 lg:ml-6 xl:ml-10">
                <div className="w-full h-[480px] sm:h-[540px] lg:h-[580px] bg-gray-200 rounded-2xl animate-pulse shadow-sm" />
              </div>
            </div>
          )
        ) : filteredEvents.length > 0 ? (
          viewMode === 'chart' ? (
            /* Shazam-styled Top Chart Ranked List View + Video Card Sidebar */
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 xl:gap-12 items-start w-full">
              {/* Main Ranked List */}
              <div className="flex-1 min-w-0 w-full max-w-2xl lg:max-w-[620px]">
                <div className="PageGrid-module_grid PageGrid-module_fullWidth w-full">
                  <div className="page_chartContainer">
                    <div className="ListShowMoreLess_container page_chartList">
                      <ul className="divide-y divide-gray-200/90 border-t border-b border-gray-200/90">
                        {filteredEvents.map((event, index) => {
                          const price = getEventPrice(event);
                          const priceLabel = getEventPriceLabel(event);
                          const location = getEventLocation(event);
                          const dateLabel = getEventDateLabel(event.scheduled_for);
                          const rankNumber = index + 1;
                          const hasEarlyBird = hasActiveEarlyBird(event);

                          return (
                            <li
                              key={event.event_id}
                              onClick={() => navigate(`/events/${event.event_id}`)}
                              className="py-3 sm:py-3.5 transition-colors hover:bg-gray-50/80 rounded-xl px-2 cursor-pointer"
                            >
                              <div className="page_songItem flex items-center gap-3 sm:gap-5">
                                {/* Rank Number */}
                                <span className="SongItem-module_rankingNumber text-lg sm:text-2xl font-extrabold text-black w-7 sm:w-10 text-center shrink-0 select-none">
                                  {rankNumber}
                                </span>

                                {/* Cover Art Thumbnail */}
                                <div className="SongItem-module_thumbnailPlayButtonStack relative h-16 w-16 sm:h-[75px] sm:w-[75px] shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-xs">
                                  {event.thumbnail_url ? (
                                    <img
                                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                      loading="lazy"
                                      src={event.thumbnail_url}
                                      alt={event.title}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                                      <Calendar className="h-6 w-6" />
                                    </div>
                                  )}
                                </div>

                                {/* Main Items Container (Title & Subtitle) */}
                                <div className="SongItem-module_mainItemsContainer flex-1 min-w-0">
                                  <div className="SongItem-module_metadataLine flex items-center gap-2">
                                    <h3 className="text-base sm:text-lg font-bold text-gray-900 hover:underline truncate leading-snug">
                                      {event.title}
                                    </h3>
                                    {/* Early Bird Orange Icon Badge */}
                                    {hasEarlyBird && (
                                      <span
                                        className="inline-flex items-center justify-center p-0.5 rounded shrink-0 text-orange-600 border border-orange-600/80 bg-orange-50 select-none"
                                        title="Early Bird Available"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 fill-orange-600" viewBox="0 0 256 256">
                                          <path d="M236.44,73.34,213.21,57.86A60,60,0,0,0,156,16h-.29C122.79,16.16,96,43.47,96,76.89V96.63L11.63,197.88l-.1.12A16,16,0,0,0,24,224h88A104.11,104.11,0,0,0,216,120V100.28l20.44-13.62a8,8,0,0,0,0-13.32ZM126.15,133.12l-60,72a8,8,0,1,1-12.29-10.24l60-72a8,8,0,1,1,12.29,10.24ZM164,80a12,12,0,1,1,12-12A12,12,0,0,1,164,80Z" />
                                        </svg>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs sm:text-sm font-medium text-gray-500 truncate mt-0.5">
                                    {location} · <span className="font-semibold text-gray-700">{priceLabel}</span> · {dateLabel}
                                  </p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Video Card */}
              <div className="hidden lg:block lg:w-[320px] xl:w-[360px] shrink-0 sticky top-24 lg:ml-6 xl:ml-10">
                <div className="relative overflow-hidden rounded-2xl bg-black shadow-lg group">
                  <video
                    src="/videos/amptivevid5.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-[480px] sm:h-[540px] lg:h-[580px] object-cover rounded-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none rounded-2xl" />
                  <div className="absolute bottom-5 left-5 right-5 text-white z-10">
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-2">
                      Featured Highlights
                    </span>
                    <h3 className="text-xl font-bold leading-tight">Experience Amptive Live</h3>
                    <p className="text-sm text-gray-200 mt-1 font-medium">Discover moments from our top weekly events.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Grid View */
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredEvents.map((event) => {
                const price = getEventPrice(event);
                const location = getEventLocation(event);
                const date = event.scheduled_for ? new Date(event.scheduled_for).toISOString() : '';

                return (
                  <button
                    key={event.event_id}
                    type="button"
                    onClick={() => navigate(`/events/${event.event_id}`)}
                    className="group text-left"
                  >
                    <EventCard
                      title={event.title}
                      location={location}
                      status={isSoldOut(event) ? 'Sold Out' : 'On Sale'}
                      price={price}
                      date={date}
                      media={{
                        type: 'image',
                        src: event.thumbnail_url || '',
                        alt: event.title,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-black/5 bg-black/[0.02] px-6 py-16 text-center">
            <div className="max-w-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Search className="h-5 w-5 text-black/35" />
              </div>
              <h2 className="text-xl font-bold text-black">No events found</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-black/45">
                Try a different search term or remove the current filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedFilter('all');
                }}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Reset filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
