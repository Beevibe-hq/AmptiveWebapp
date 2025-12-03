import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Coins, MapPin, Share2, Ticket } from 'lucide-react';
import amptiveLogo from '@/assets/amptivelogo.svg';
import { createClient } from '@/lib/supabase/client';
import { extractDominantColors } from '@/utils/colorExtractor';
import { QRCodeSVG } from 'qrcode.react';

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
  quantity?: number | null;
  benefits?: string[];
  color_theme?: string | null;
};

type AvailabilityStatus = 'Available' | 'Almost Sold Out' | 'Limited Spots' | 'Sold Out';

const DEFAULT_COVER =
  'https://www.shazam.com/mkimage/image/thumb/AMCArtistImages116/v4/7d/b1/4f/7db14f51-0978-2d7e-9add-f0d205bae318/883bda85-96d8-4515-a288-31e25bd8f216_ami-identity-b4d7093c3e0926436905c4b9df9223c0-2023-03-24T20-43-10.454Z_cropped.png/1552x1552bb.webp';

const DEFAULT_GRADIENT = {
  primary: '#131620',
  secondary: '#07080c',
};

const FALLBACK_COLORS = new Set(['#1e3a8a', '#3b82f6']);

const GOOGLE_MAP_STYLE_PARAMS = [
  'feature:administrative|element:geometry|visibility:off',
  'feature:administrative.land_parcel|visibility:off',
  'feature:administrative.neighborhood|visibility:off',
  'feature:poi|visibility:off',
  'feature:poi|element:labels.text|visibility:off',
  'feature:road|element:labels|visibility:off',
  'feature:road|element:labels.icon|visibility:off',
  'feature:transit|visibility:off',
  'feature:water|element:geometry.fill|color:0x71d3f4',
];

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

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return null;
  return { r, g, b };
};

const rgbChannelToHex = (value: number): string => {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, '0');
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }): string => `#${rgbChannelToHex(r)}${rgbChannelToHex(g)}${rgbChannelToHex(b)}`;

const lightenHex = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { r, g, b } = rgb;
  return rgbToHex({
    r: r + (255 - r) * amount,
    g: g + (255 - g) * amount,
    b: b + (255 - b) * amount,
  });
};

const darkenHex = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { r, g, b } = rgb;
  return rgbToHex({
    r: r * (1 - amount),
    g: g * (1 - amount),
    b: b * (1 - amount),
  });
};

const getSaturation = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const { r, g, b } = rgb;
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  return maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;
};

const relativeLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

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

const AVAILABILITY_SEQUENCE: AvailabilityStatus[] = ['Available', 'Limited Spots', 'Almost Sold Out', 'Sold Out'];

const AVAILABILITY_BADGE_CLASSES: Record<AvailabilityStatus, string> = {
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Almost Sold Out': 'border-amber-200 bg-amber-50 text-amber-700',
  'Limited Spots': 'border-orange-200 bg-orange-50 text-orange-700',
  'Sold Out': 'border-rose-200 bg-rose-50 text-rose-700',
};

const PLACEHOLDER_GRADIENTS = [
  'from-[#2d1b69] via-[#312558] to-[#10142a]',
  'from-[#0f172a] via-[#1e293b] to-[#111827]',
  'from-[#1b1a55] via-[#2d3a8c] to-[#0b172d]',
  'from-[#2f2346] via-[#3b1d6b] to-[#120c1f]',
];

const deriveAvailabilityStatus = (ticket: EventTicket, index: number): AvailabilityStatus => {
  const label = ticket.label?.toLowerCase() ?? '';
  if (label.includes('sold out')) return 'Sold Out';
  if (ticket.price === 0 || label.includes('free') || label.includes('general') || label.includes('standard')) {
    return 'Available';
  }
  if (label.includes('vip') || label.includes('table') || ticket.price >= 200) {
    return 'Limited Spots';
  }
  if (label.includes('early') || label.includes('pre-sale')) {
    return 'Almost Sold Out';
  }
  return AVAILABILITY_SEQUENCE[index % AVAILABILITY_SEQUENCE.length];
};

const deriveTicketBenefits = (ticket: EventTicket): string[] => {
  const label = ticket.label?.toLowerCase() ?? '';
  const benefits = new Set<string>();

  if (label.includes('vip') || label.includes('premium')) {
    benefits.add('Priority check-in lane');
    benefits.add('Complimentary welcome drink');
    benefits.add('Exclusive lounge seating');
  }

  if (label.includes('table') || label.includes('booth')) {
    benefits.add('Reserved table with bottle service');
    benefits.add('Dedicated host for your group');
  }

  if (label.includes('early') || label.includes('pre-sale')) {
    benefits.add('Early venue access');
    benefits.add('Limited edition merch drop access');
  }

  if (label.includes('backstage')) {
    benefits.add('Backstage meet & greet');
  }

  if (label.includes('general') || label.includes('standard') || benefits.size === 0) {
    benefits.add('Guaranteed entry to the event');
    benefits.add('Access to all main stage performances');
  }

  if (ticket.price === 0) {
    benefits.add('No payment required at entry');
  }

  return Array.from(benefits);
};

const getInitials = (value?: string | null) => {
  if (!value) return 'EH';
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'EH';
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || 'EH';
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
  const [heroGradient, setHeroGradient] = useState<{ primary: string; secondary: string }>(DEFAULT_GRADIENT);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [organizerProfile, setOrganizerProfile] = useState<{ username?: string | null; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [organizerAvatarError, setOrganizerAvatarError] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

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
            setOrganizerProfile(null);
            setError('We couldn’t find this event.');
          }
          return;
        }

        const eventRecord = eventData as EventRecord;
        if (!cancelled) {
          setEvent(eventRecord);
          const cover = eventRecord.cover_image || DEFAULT_COVER;
          extractDominantColors(cover, 8)
            .then((palette) => {
              const validPalette = palette
                .map((color) => color.trim().toLowerCase())
                .filter((color, index, self) => hexToRgb(color) && self.indexOf(color) === index)
                .filter((color) => !FALLBACK_COLORS.has(color))
                .filter((color) => getSaturation(color) > 0.08);

              if (validPalette.length === 0) {
                setHeroGradient(DEFAULT_GRADIENT);
                return;
              }

              const sortedByDarkness = [...validPalette].sort(
                (a, b) => relativeLuminance(a) - relativeLuminance(b),
              );

              const candidate = sortedByDarkness.find((color) => relativeLuminance(color) < 0.35) ?? sortedByDarkness[0];
              const brightCandidate = [...validPalette]
                .sort((a, b) => relativeLuminance(b) - relativeLuminance(a))
                .find((color) => relativeLuminance(color) > 0.5 && getSaturation(color) > 0.15);

              const adjustedDark = darkenHex(candidate, 0.1);
              const adjustedLightBase = brightCandidate ?? candidate;
              const lightAdjustAmount = brightCandidate ? 0.08 : 0.12;
              const adjustedLight = lightenHex(adjustedLightBase, lightAdjustAmount);

              if (!cancelled) {
                setHeroGradient({ primary: adjustedLight, secondary: adjustedDark });
              }
            })
            .catch((gradientError) => {
              console.error('Error extracting cover colors:', gradientError);
              if (!cancelled) {
                setHeroGradient(DEFAULT_GRADIENT);
              }
            });
        }

        const [ticketRes, relatedRes, organizerRes] = await Promise.all([
          supabase
            .from('event_tickets')
            .select('id, label, price, currency, quantity, benefits, color_theme')
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
          eventRecord.user_id
            ? supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('user_id', eventRecord.user_id)
              .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (ticketRes.error) throw ticketRes.error;
        if (relatedRes.error) throw relatedRes.error;
        if (organizerRes.error) throw organizerRes.error;

        if (!cancelled) {
          setTickets(
            (ticketRes.data ?? []).map((ticket) => ({
              id: ticket.id,
              label: ticket.label ?? 'General Admission',
              price: Number(ticket.price) || 0,
              currency: ticket.currency,
              quantity: ticket.quantity,
              benefits: ticket.benefits || [],
              color_theme: ticket.color_theme,
            }))
          );
          setRelatedEvents((relatedRes.data ?? []) as EventRecord[]);
          setOrganizerProfile(organizerRes.data ?? null);
        }
      } catch (err) {
        console.error('Error loading event details:', err);
        if (!cancelled) {
          setError('Something went wrong while fetching this event.');
          setEvent(null);
          setTickets([]);
          setRelatedEvents([]);
          setOrganizerProfile(null);
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

  useEffect(() => {
    setOrganizerAvatarError(false);
  }, [organizerProfile?.avatar_url]);

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
  const descriptionText = event.description && event.description.trim().length > 0
    ? event.description.trim()
    : null;
  const summaryText = event.summary && event.summary.trim().length > 0
    ? event.summary.trim()
    : descriptionText ??
    'Experience this curated event featuring emerging talent, intimate energy, and a carefully designed atmosphere for fans.';
  const summaryWordCount = summaryText.trim().split(/\s+/).length;
  const hasLongSummary = summaryText.length > 220 || summaryWordCount > 40;

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
  const hasAnnouncedLocation = locationLabel !== 'Location to be announced';
  const mapQuery = hasAnnouncedLocation ? encodeURIComponent(locationLabel) : null;
  const mapStyleQuery = GOOGLE_MAP_STYLE_PARAMS.map((param) => `style=${encodeURIComponent(param)}`).join('&');
  const mapSrc = mapQuery
    ? `https://maps.google.com/maps?q=${mapQuery}&z=14&output=embed${mapStyleQuery ? `&${mapStyleQuery}` : ''}`
    : null;
  const fallbackTicket: EventTicket = {
    id: `${event.id}-free-pass`,
    label: 'Complimentary Access',
    price: 0,
    currency: cheapestTicket?.currency ?? null,
  };
  const ticketsToDisplay = tickets.length > 0 ? tickets : [fallbackTicket];

  return (
    <div className="min-h-screen bg-[#07080c] text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={coverImage} alt={event.title ?? 'Event artwork'} className="h-full w-full object-cover opacity-5" />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${heroGradient.primary} 0%, ${heroGradient.secondary} 100%)`,
            }}
          />
          <div className="absolute inset-0 mix-blend-soft-light" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)] items-start">
            <div className="order-2 space-y-6 lg:order-1">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                  {year}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${status === 'Past' ? 'bg-gray-400' : 'bg-emerald-400'
                      }`}
                  />
                  {status}
                </span>
              </div>
              <div className="space-y-6">
                <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                  {event.title ?? 'Untitled Event'}
                </h1>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-white/85">
                <span className="inline-flex items-center rounded-full border border-white/8 bg-white/10 px-3.5 py-1.5 text-xs sm:text-sm">
                  <span className="mr-2 uppercase tracking-[0.16em] text-white/55">Date</span>
                  <span className="text-sm font-semibold text-white">{startDate}</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-white/8 bg-white/10 px-3.5 py-1.5 text-xs sm:text-sm">
                  <span className="mr-2 uppercase tracking-[0.16em] text-white/55">Time</span>
                  <span className="text-sm font-semibold text-white">{timeRange}</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-white/8 bg-white/10 px-3.5 py-1.5 text-xs sm:text-sm">
                  <span className="mr-2 uppercase tracking-[0.16em] text-white/55">Location</span>
                  <span className="text-sm font-semibold text-white">{locationLabel}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                <Link
                  to={manageUrl}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white text-[#07080c] px-4 md:px-6 py-2.5 md:py-3 text-sm font-semibold transition hover:bg-gray-100"
                >
                  Manage Event
                </Link>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 md:px-6 py-2.5 md:py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  <Share2 className="h-4 w-4" />
                  Share Event
                </button>
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
                <Coins className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{ticketPriceLabel === 'Free' ? 'Free event' : `Tickets from ${ticketPriceLabel}`}</span>
              </div>


            </div>

            <div className="order-1 flex flex-col gap-6 lg:order-2 lg:sticky lg:top-32">
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-white/5 shadow-[0_30px_80px_rgba(7,8,12,0.35)]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
                <img src={coverImage} alt={event.title ?? 'Event artwork'} className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 text-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="space-y-24">
            <section className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-900">About Event</h3>
              <div
                className="text-[20px] text-gray-600 leading-relaxed [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-gray-900 [&>h1]:mb-4 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mb-3 [&>h2]:mt-6 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>img]:rounded-2xl [&>img]:my-6 [&>img]:w-full [&>img]:object-cover"
                dangerouslySetInnerHTML={{ __html: summaryText }}
              />
              {hasLongSummary && (
                <button
                  type="button"
                  onClick={() => setIsSummaryExpanded((prev) => !prev)}
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 transition hover:text-gray-800"
                >
                  {isSummaryExpanded ? 'Show Less' : 'Read More'}
                </button>
              )}
            </section>

            <section className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Location</h3>
              <p className="text-[20px] text-gray-600 leading-relaxed">
                {hasAnnouncedLocation
                  ? `Join us at ${locationLabel}.`
                  : 'Venue details will be shared once the location is confirmed.'}
              </p>
              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-gray-900/12 via-gray-900/6 to-transparent shadow-[0_36px_80px_rgba(7,8,12,0.18)]"
                  aria-hidden="true"
                />
                <div className="relative h-[28rem] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                  <div
                    className="pointer-events-none absolute inset-0 rounded-3xl border border-gray-900/8"
                    aria-hidden="true"
                  />
                  {mapSrc ? (
                    <iframe
                      title={`Map showing ${locationLabel}`}
                      src={mapSrc}
                      className="absolute inset-0 h-full w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-center text-sm text-white/70">
                      <MapPin className="h-6 w-6 text-white/60" />
                      <p>Map preview will appear once the venue is finalized.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {organizerProfile && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-900">Organized by</h3>
                <div className="flex flex-col gap-8 rounded-[2.5rem] border border-gray-200 px-8 py-8 min-h-[14rem] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-12 sm:py-10">
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
                    <div className="relative h-32 w-32 overflow-hidden rounded-full bg-gray-100">
                      {organizerProfile.avatar_url && !organizerAvatarError ? (
                        <img
                          src={organizerProfile.avatar_url}
                          alt={organizerProfile.username ?? organizerProfile.full_name ?? 'Event host'}
                          className="h-full w-full object-cover"
                          onError={() => setOrganizerAvatarError(true)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-gray-500">
                          {getInitials(organizerProfile.full_name ?? organizerProfile.username ?? 'Event Host')}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-center sm:text-left">
                      <span className="text-2xl font-bold text-gray-900">
                        {organizerProfile.full_name ?? organizerProfile.username ?? 'Event Host'}
                      </span>
                      {organizerProfile.username && organizerProfile.full_name && (
                        <span className="text-base text-gray-500">@{organizerProfile.username}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={manageUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black sm:w-auto"
                  >
                    <span>Manage Event</span>
                  </Link>
                </div>
              </section>
            )}

            <section className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Event Overview</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-gray-900" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-gray-400">Showtime</p>
                    <p className="text-sm font-semibold text-gray-900">{timeRange}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-6 w-6 text-gray-900" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-gray-400">Venue</p>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{locationLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Ticket className="h-6 w-6 text-gray-900" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-gray-400">Tickets</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {ticketPriceLabel === 'Free' ? 'Free event' : `From ${ticketPriceLabel}`}
                    </p>
                    <p className="text-xs text-gray-500">Secure your spot early to avoid missing out.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900">Tickets</h3>
                  <p className="text-[20px] text-gray-500">Preview available passes and their current availability.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  <Ticket className="h-4 w-4 text-gray-400" />
                  {tickets.length > 0 ? `${tickets.length} option${tickets.length > 1 ? 's' : ''}` : 'Coming soon'}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {ticketsToDisplay.map((ticket, index) => {
                  const availabilityStatus = deriveAvailabilityStatus(ticket, index);
                  const badgeClasses = AVAILABILITY_BADGE_CLASSES[availabilityStatus];
                  // Use benefits from database, or derive if empty
                  const benefits = ticket.benefits && ticket.benefits.length > 0
                    ? ticket.benefits
                    : deriveTicketBenefits(ticket);
                  // Get theme from database or default to silver
                  const theme = TICKET_THEMES[ticket.color_theme || 'silver'] || TICKET_THEMES.silver;

                  return (
                    <div key={ticket.id} className="group relative min-h-[15rem] [perspective:1600px]">
                      <div className="relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                        {/* Front of card */}
                        <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-[2rem] border ${theme.border} ${theme.gradient} px-6 py-6 backdrop-blur-sm shadow-xl [backface-visibility:hidden]`}>
                          <span className={`pointer-events-none absolute inset-y-6 -right-3 z-0 h-10 w-10 rounded-full border ${theme.border} bg-white/50`} aria-hidden="true" />
                          <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                          <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                          <div className="relative z-10 flex items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <p className={`text-xs uppercase tracking-[0.28em] ${theme.text} opacity-60`}>{event?.title || 'Event Name'}</p>
                              <p className={`text-lg font-semibold ${theme.text} line-clamp-2 break-words`}>{ticket.label}</p>
                            </div>
                          </div>

                          <div className="relative z-10 mt-6 flex items-baseline justify-between gap-2">
                            <span className={`text-3xl font-bold ${theme.text} truncate`}>
                              {ticket.price === 0 ? 'Free' : formatTicketPrice(ticket.price, ticket.currency)}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${theme.badge} ${theme.badgeText} flex-shrink-0 opacity-80`}>
                              Per guest
                            </span>
                          </div>
                        </div>

                        {/* Back of card */}
                        <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-[2rem] border ${theme.border} ${theme.gradient} px-6 py-6 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]`}>
                          <span className={`pointer-events-none absolute inset-y-6 -right-3 z-0 h-10 w-10 rounded-full border ${theme.border} bg-white/50`} aria-hidden="true" />
                          <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                          <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                          <div className="relative z-10 space-y-4">
                            <div className="space-y-2">
                              <p className={`text-xs uppercase tracking-[0.32em] ${theme.text} opacity-60`}>Access & Benefits</p>
                              <ul className={`space-y-2 text-sm ${theme.text} opacity-90 list-disc list-inside`}>
                                {benefits.slice(0, 3).map((benefit, i) => (
                                  <li key={i} className="leading-snug">
                                    {benefit}
                                  </li>
                                ))}
                                {benefits.length > 3 && (
                                  <li className="list-none text-xs opacity-75 pt-1 pl-1 font-medium">
                                    and {benefits.length - 3} more...
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>

                          <div className="relative z-10 mt-4 flex items-center justify-between">
                            <span className={`text-xl font-semibold ${theme.text}`}>
                              {ticket.price === 0 ? 'Free' : formatTicketPrice(ticket.price, ticket.currency)}
                            </span>
                          </div>

                          {/* QR Code & Ticket ID - Bottom Right */}
                          <div className={`absolute bottom-4 right-4 z-20 flex flex-col items-end gap-1 ${theme.text}`}>
                            <QRCodeSVG
                              value={`PREVIEW-${ticket.id}`}
                              size={72}
                              level="M"
                              includeMargin={false}
                              fgColor="currentColor"
                              bgColor="transparent"
                            />
                            <p className="text-[9px] font-mono opacity-60">
                              PREVIEW-{ticket.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {relatedEvents.length > 0 && (
              <section className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">More Events</h3>
                </div>

                <div className="overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="grid auto-cols-[minmax(18rem,20.5rem)] grid-flow-col gap-x-6 md:gap-x-8 pr-4">
                    {relatedEvents.map((item, index) => (
                      <Link
                        key={item.id}
                        to={`/events/${item.id}`}
                        className="group flex w-full min-w-[18rem] flex-col gap-3 transition-transform duration-300 hover:-translate-y-1"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-[1.5rem]">
                          {item.cover_image && !failedImageIds.has(item.id) ? (
                            <img
                              src={item.cover_image}
                              alt={item.title ?? 'Related event cover'}
                              className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                              loading="lazy"
                              onError={() => setFailedImageIds((prev) => new Set(prev).add(item.id))}
                            />
                          ) : (
                            <div
                              className={`flex h-full w-full items-center justify-center rounded-[1.5rem] bg-gradient-to-br ${PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length]} p-6`}
                            >
                              <img src={amptiveLogo} alt="Amptive" className="h-16 w-auto opacity-85 drop-shadow-[0_6px_18px_rgba(15,23,42,0.35)]" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <p className="text-lg font-semibold text-gray-900 group-hover:text-black">
                            {item.title ?? 'Untitled Event'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {buildLocationLabel(item.venue, item.city)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;