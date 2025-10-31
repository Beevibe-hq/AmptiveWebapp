import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Share2, Ticket } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { extractDominantColors } from '@/utils/colorExtractor';

type EventRecord = {
  id: string;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  city?: string | null;
  cover_image?: string | null;
  details_url?: string | null;
  manage_url?: string | null;
  description?: string | null;
  summary?: string | null;
  user_id?: string | null;
};

type EventTicket = {
  id: string;
  label: string;
  price: number;
  currency?: string | null;
};

const DEFAULT_COVER =
  'https://www.shazam.com/mkimage/image/thumb/AMCArtistImages116/v4/7d/b1/4f/7db14f51-0978-2d7e-9add-f0d205bae318/883bda85-96d8-4515-a288-31e25bd8f216_ami-identity-b4d7093c3e0926436905c4b9df9223c0-2023-03-24T20-43-10.454Z_cropped.png/1552x1552bb.webp';

const formatDate = (iso?: string | null, withYear = true) => {
  if (!iso) return 'Date to be announced';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date to be announced';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: withYear ? 'numeric' : undefined,
  });
};

const formatShortDate = (iso?: string | null) => {
  if (!iso) return 'TBD';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const formatTimeRange = (startIso?: string | null, endIso?: string | null) => {
  if (!startIso) return 'Time to be announced';
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return 'Time to be announced';
  const startLabel = start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!endIso) return startLabel;
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return startLabel;
  const endLabel = end.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${startLabel} – ${endLabel}`;
};

const buildLocationLabel = (venue?: string | null, city?: string | null) => {
  const parts = [venue, city].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Location to be announced';
};

const formatTicketPrice = (price?: number, currency?: string | null) => {
  if (!Number.isFinite(price)) return 'Free';
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency ?? 'NGN',
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
  });
  return formatter.format(price ?? 0);
};

const resolveStatus = (startIso?: string | null, endIso?: string | null) => {
  const now = Date.now();
  const start = startIso ? new Date(startIso).getTime() : Number.NaN;
  const end = endIso ? new Date(endIso).getTime() : Number.NaN;

  if (!Number.isNaN(end) && now >= end) return 'Past';
  if (!Number.isNaN(start)) {
    if (now >= start && (Number.isNaN(end) || now < end)) return 'Live';
    if (now < start) return 'Upcoming';
  }
  return 'Upcoming';
};

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supabase = useMemo(() => createClient(), []);

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [relatedEvents, setRelatedEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [heroGradient, setHeroGradient] = useState<{ primary: string; secondary: string }>({
    primary: '#111827',
    secondary: '#040507',
  });

  useEffect(() => {
    if (!id) {
      setError('Missing event identifier.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setShareFeedback(null);

      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (eventError) throw eventError;

        if (!eventData) {
          if (!cancelled) {
            setEvent(null);
            setTickets([]);
            setRelatedEvents([]);
            setError('We couldn’t find this event.');
          }
          return;
        }

        const eventRecord = eventData as EventRecord;
        if (!cancelled) {
          setEvent(eventRecord);
          const cover = eventRecord.cover_image || DEFAULT_COVER;
          extractDominantColors(cover, 2)
            .then(([primary, secondary]) => {
              if (!cancelled) {
                setHeroGradient({ primary, secondary: secondary ?? primary });
              }
            })
            .catch((gradientError) => {
              console.error('Error extracting cover colors:', gradientError);
              if (!cancelled) {
                setHeroGradient({ primary: '#111827', secondary: '#040507' });
              }
            });
        }

        const [ticketRes, relatedRes] = await Promise.all([
          supabase
            .from('event_tickets')
            .select('id, label, price, currency')
            .eq('event_id', id),
          eventRecord.user_id
            ? supabase
                .from('events')
                .select('id, title, start_time, venue, city, cover_image')
                .eq('user_id', eventRecord.user_id)
                .neq('id', id)
                .order('start_time', { ascending: true })
                .limit(4)
            : Promise.resolve({ data: [] as EventRecord[], error: null }),
        ]);

        if (ticketRes.error) throw ticketRes.error;
        if (relatedRes.error) throw relatedRes.error;

        if (!cancelled) {
          setTickets(
            (ticketRes.data ?? []).map((ticket) => ({
              id: ticket.id,
              label: ticket.label ?? 'General Admission',
              price: Number(ticket.price) || 0,
              currency: ticket.currency,
            }))
          );
          setRelatedEvents((relatedRes.data ?? []) as EventRecord[]);
        }
      } catch (err) {
        console.error('Error loading event details:', err);
        if (!cancelled) {
          setError('Something went wrong while fetching this event.');
          setEvent(null);
          setTickets([]);
          setRelatedEvents([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  const handleShare = async () => {
    if (!event) return;
    const shareData = {
      title: event.title ?? 'Upcoming Event',
      text: `Check out ${event.title ?? 'this event'} on Amptive`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareFeedback('Link shared successfully.');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        setShareFeedback('Link copied to clipboard.');
      } else {
        setShareFeedback('Sharing not supported on this browser.');
      }
    } catch (shareError) {
      console.error('Error sharing event:', shareError);
      setShareFeedback('Unable to share the event right now.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080c] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
          <div className="space-y-6">
            <div className="h-10 w-48 rounded-full bg-white/10 animate-pulse" />
            <div className="h-16 w-3/4 rounded-2xl bg-white/10 animate-pulse" />
            <div className="h-64 rounded-3xl bg-white/10 animate-pulse" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-60 rounded-3xl bg-white/10 animate-pulse" />
              <div className="h-60 rounded-3xl bg-white/10 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#07080c] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 text-center space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Event Overview</p>
          <h1 className="text-3xl font-semibold">{error ?? 'Event not found'}</h1>
          <p className="text-white/60">
            The event you are looking for may have been removed or is no longer available.
          </p>
          <div className="pt-6">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const coverImage = event.cover_image || DEFAULT_COVER;
  const startDate = formatDate(event.start_time);
  const timeRange = formatTimeRange(event.start_time, event.end_time);
  const locationLabel = buildLocationLabel(event.venue, event.city);
  const status = resolveStatus(event.start_time, event.end_time);
  const year = event.start_time ? new Date(event.start_time).getFullYear() : new Date().getFullYear();
  const manageUrl = (event.manage_url && event.manage_url.trim().length > 0)
    ? event.manage_url
    : `/events/manage/${event.id}`;
  const cheapestTicket = tickets.reduce<EventTicket | null>((cheapest, ticket) => {
    if (cheapest === null) return ticket;
    if (!Number.isFinite(ticket.price)) return cheapest;
    if (!Number.isFinite(cheapest.price) || ticket.price < cheapest.price) return ticket;
    return cheapest;
  }, null);
  const ticketPriceLabel = tickets.length === 0
    ? 'Free'
    : cheapestTicket
    ? formatTicketPrice(cheapestTicket.price, cheapestTicket.currency)
    : 'Free';

  return (
    <div className="min-h-screen bg-[#07080c] text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={coverImage} alt={event.title ?? 'Event artwork'} className="h-full w-full object-cover opacity-5" />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${heroGradient.primary} 0%, rgba(0,0,0,0.6) 45%, ${heroGradient.secondary} 100%)`,
            }}
          />
          <div className="absolute inset-0 mix-blend-soft-light" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)] items-start">
            <div className="order-2 space-y-6 lg:order-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                  {year}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  {status}
                </span>
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                  {event.title ?? 'Untitled Event'}
                </h1>
                <p className="text-white/70 text-base sm:text-lg">
                  {event.summary ??
                    'Experience this curated event featuring emerging talent, intimate energy, and a carefully designed atmosphere for fans.'}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-2.5 text-white/80">
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] sm:text-xs">
                  <span className="mr-1.5 uppercase tracking-[0.14em] text-white/50">Date</span>
                  <span className="font-medium text-white">{startDate}</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] sm:text-xs">
                  <span className="mr-1.5 uppercase tracking-[0.14em] text-white/50">Time</span>
                  <span className="font-medium text-white">{timeRange}</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] sm:text-xs">
                  <span className="mr-1.5 uppercase tracking-[0.14em] text-white/50">Location</span>
                  <span className="font-medium text-white">{locationLabel}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                {tickets.length > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    <Ticket className="h-4 w-4" />
                    {tickets.length} ticket {tickets.length === 1 ? 'type' : 'types'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 md:px-6 py-2.5 md:py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  <Share2 className="h-4 w-4" />
                  Share Event
                </button>
                <Link
                  to={manageUrl}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white text-[#07080c] px-4 md:px-6 py-2.5 md:py-3 text-sm font-semibold transition hover:bg-gray-100"
                >
                  Manage Event
                </Link>
              </div>

              <p className="mt-2 text-xs text-white/60">
                {ticketPriceLabel === 'Free' ? 'Free event' : `Tickets from ${ticketPriceLabel}`}
              </p>

              
            </div>

            <div className="order-1 flex flex-col gap-6 lg:order-2 lg:sticky lg:top-32">
              <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-[0_30px_80px_rgba(7,8,12,0.35)]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
                <img src={coverImage} alt={event.title ?? 'Event artwork'} className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 text-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr),minmax(0,0.9fr)]">
            <section className="space-y-10">
              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-semibold text-gray-900">Event Overview</h2>
                <p className="mt-4 text-gray-600 leading-relaxed whitespace-pre-line">
                  {event.description ??
                    'Details for this event will be announced soon. Check back for artist information, special experiences, and key updates as we prepare the perfect show.'}
                </p>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">Schedule & Logistics</h3>
                <div className="mt-6 space-y-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm uppercase tracking-[0.28em] text-gray-400">Doors Open</span>
                    <span className="text-base font-medium text-gray-900">{formatDate(event.start_time, false)}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm uppercase tracking-[0.28em] text-gray-400">Showtime</span>
                    <span className="text-base font-medium text-gray-900">{timeRange}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm uppercase tracking-[0.28em] text-gray-400">Venue</span>
                    <span className="text-base font-medium text-gray-900">{locationLabel}</span>
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-8">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Ticket Options</h3>
                  <Ticket className="h-5 w-5 text-gray-400" />
                </div>
                <div className="mt-4 space-y-3">
                  {tickets.length === 0 && (
                    <p className="text-sm text-gray-500">Tickets have not been published yet.</p>
                  )}
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{ticket.label}</span>
                      <span className="text-sm font-semibold text-gray-700">{formatTicketPrice(ticket.price, ticket.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {relatedEvents.length > 0 && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">More from this host</h3>
                  <div className="mt-5 space-y-4">
                    {relatedEvents.map((item) => (
                      <Link
                        key={item.id}
                        to={`/events/${item.id}`}
                        className="group flex items-center justify-between gap-4 rounded-2xl border border-gray-100 px-4 py-3 transition hover:border-gray-200 hover:bg-gray-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-black">
                            {item.title ?? 'Untitled Event'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatShortDate(item.start_time)} · {buildLocationLabel(item.venue, item.city)}
                          </p>
                        </div>
                        <span className="text-gray-300 transition group-hover:text-gray-500">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">Need edits?</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Jump back into the event manager to update details, adjust ticketing, or share new dates.
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    to={manageUrl}
                    className="flex-1 rounded-full border border-gray-200 bg-gray-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-black"
                  >
                    Manage Event
                  </Link>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center justify-center rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;