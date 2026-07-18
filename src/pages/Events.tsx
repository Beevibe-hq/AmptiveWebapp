import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { listEvents, StandaloneEvent } from '@/lib/api/events';
import EventCard, { EventCardSkeleton } from '../components/EventCard';

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

export default function Events() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [events, setEvents] = useState<StandaloneEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const eventsData = await listEvents({ page_size: 100 });
        setEvents(eventsData || []);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-16 px-6 sm:px-10 lg:px-14">
      <div>
        <header className="mb-4 md:mb-5 w-full flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
              Upcoming Events
            </h1>
            <p className="hidden sm:block text-[15px] text-black/40 font-sans mt-1">
              Browse live experiences and community gatherings happening on Amptive.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/events/create')}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </header>

        <section className="mb-8 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <input
                type="text"
                placeholder="Search events, venues, communities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 w-full rounded-full border border-black/10 bg-white pl-11 pr-11 text-sm font-medium text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/30"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-black/35 transition-colors hover:bg-black/5 hover:text-black"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden items-center gap-2 px-5 py-3 rounded-full text-sm font-medium text-black/60 sm:inline-flex">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter
                </span>
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      selectedFilter === filter.id
                        ? 'bg-[#F2F2F2] text-black'
                        : 'bg-transparent text-black/60 hover:bg-black/5'
                    }`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="font-semibold text-black/45">{resultLabel}</p>
            {(searchTerm || selectedFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedFilter('all');
                }}
                className="font-semibold text-black hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <EventCardSkeleton key={`events-skeleton-${index}`} />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
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
                  <div className="mt-3 flex items-center justify-between gap-3 px-1 text-xs font-semibold text-black/35">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{location}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {getEventDateLabel(event.scheduled_for)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
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
