import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { updateProfileAvatar, getProfileByUserId, getProfileByUsername } from '@/lib/api/profiles';
import { extractDominantColors } from '@/utils/colorExtractor';
import amptiveLogo from '@/assets/amptivelogo.svg';
import { getCurrentUser } from '@/lib/api/auth';
import { getEventsByUser, StandaloneEvent } from '@/lib/api/events';
import { UserProfile } from '@/lib/api/services';
import { useAuth } from '@/contexts/AuthContext';

type EventStatus = 'upcoming' | 'live' | 'past';

type EventCardData = {
  id: string;
  title: string;
  dateLabel: string;
  startTimeLabel: string;
  locationLabel: string;
  coverImage: string | null;
  detailsUrl: string;
  manageUrl: string;
  tickets: EventTicket[];
  startIso: string | null;
  endIso: string | null;
  status: EventStatus;
};

const CARD_PLACEHOLDER_GRADIENTS = [
  'from-[#2d1b69] via-[#312558] to-[#10142a]',
  'from-[#0f172a] via-[#1e293b] to-[#111827]',
  'from-[#1b1a55] via-[#2d3a8c] to-[#0b172d]',
  'from-[#2f2346] via-[#3b1d6b] to-[#120c1f]',
];

const formatEventDateLabel = (iso?: string | null) => {
  if (!iso) return 'Date to be announced';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date to be announced';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatEventTimeLabel = (iso?: string | null) => {
  if (!iso) return 'Time to be announced';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Time to be announced';
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = ((hours % 12) + 12) % 12 || 12;
  const hourString = hour12.toString().padStart(2, '0');
  const minuteString = minutes.toString().padStart(2, '0');
  return `${hourString}:${minuteString}${suffix}`;
};

const buildLocationLabel = (venue?: string | null, city?: string | null, type?: string | null) => {
  if (type === 'online') return 'Online';
  const parts = [venue, city].filter(Boolean);
  return parts.length ? parts.join(', ') : 'TBA';
};

type EventTicket = {
  id: string;
  eventId: string;
  label: string;
  price: number;
  currency?: string | null;
};

const formatTicketPrice = (price: number, currency?: string | null) => {
  if (!Number.isFinite(price)) return 'Free';
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency ?? 'NGN',
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
  });
  return formatter.format(price);
};

const toTimestamp = (iso?: string | null) => {
  if (!iso) return Number.NaN;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? Number.NaN : time;
};

const resolveEventStatus = (startIso: string | null, endIso: string | null, now: Date): EventStatus => {
  const nowMs = now.getTime();
  const startMs = toTimestamp(startIso ?? undefined);
  const endMs = toTimestamp(endIso ?? undefined);

  if (!Number.isNaN(endMs) && nowMs >= endMs) {
    return 'past';
  }

  if (!Number.isNaN(startMs)) {
    if (nowMs >= startMs) {
      if (Number.isNaN(endMs) || nowMs < endMs) {
        return 'live';
      }
      return 'past';
    }
    return 'upcoming';
  }

  return 'upcoming';
};

const mapStandaloneEvents = (
  events: StandaloneEvent[],
  ticketMap: Record<string, EventTicket[]>,
  now: Date
): EventCardData[] =>
  events
    .filter((e): e is StandaloneEvent & { event_id: string } => Boolean(e.event_id))
    .map((e) => {
      const startIso = e.scheduled_for ?? null;
      const endIso = e.ended_at ?? null;
      const status = resolveEventStatus(startIso, endIso, now);
      const startTimeLabel = status === 'live' ? 'LIVE' : formatEventTimeLabel(startIso);

      return {
        id: e.event_id,
        title: e.title ?? 'Untitled Event',
        dateLabel: formatEventDateLabel(e.scheduled_for),
        startTimeLabel,
        locationLabel: buildLocationLabel(
          e.venue?.name || e.location?.venue,
          e.venue?.city || e.location?.city,
          e.location?.type || e.venue?.venue_type
        ),
        coverImage: e.thumbnail_url ?? null,
        detailsUrl: `/events/${e.event_id}`,
        manageUrl: `/dashboard/events/${e.event_id}/edit`,
        tickets: ticketMap[e.event_id] ?? [],
        startIso,
        endIso,
        status,
      };
    });

const ProfilePage = () => {
  const location = useLocation();
  const hostData = location.state?.hostData as { user_id?: string; username: string; full_name: string; avatar_url: string | null } | undefined;
  
  const { id: urlUserId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [shadowColor, setShadowColor] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeEventTab, setActiveEventTab] = useState<'upcoming' | 'past'>('upcoming');
  const [upcomingEvents, setUpcomingEvents] = useState<EventCardData[]>([]);
  const [pastEvents, setPastEvents] = useState<EventCardData[]>([]);
  const [hoveredPastCard, setHoveredPastCard] = useState<string | null>(null);
  const [pastFadeState, setPastFadeState] = useState<'idle' | 'out' | 'in'>('idle');
  const fadeOutTimeoutRef = useRef<number | null>(null);
  const fadeInTimeoutRef = useRef<number | null>(null);
  const [pastOffset, setPastOffset] = useState(0);
  const [eventsLoading, setEventsLoading] = useState(true);
  const isPastStackingEnabled = true;
  const isMyProfile = !!(user && (urlUserId === user.user_id || urlUserId === user.username || !urlUserId));
  
  const [isMobileView, setIsMobileView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 639px)').matches;
  });
  const pastCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [failedCardImageIds, setFailedCardImageIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const loadEvents = useCallback(
    async (targetUserId: string) => {
      const nowIso = new Date().toISOString();
      const events = await getEventsByUser(targetUserId);
      
      const upcomingData = (events ?? []).filter(e => e.scheduled_for && e.scheduled_for >= nowIso);
      const pastData = (events ?? []).filter(e => e.scheduled_for && e.scheduled_for < nowIso);
      
      const allEventIds = events?.map(e => e.event_id).filter(Boolean) as string[] || [];
      const ticketMap: Record<string, EventTicket[]> = {};

      const now = new Date();
      const upcomingMapped = mapStandaloneEvents(upcomingData, ticketMap, now);
      const pastMapped = mapStandaloneEvents(pastData, ticketMap, now);
      const allEvents = [...upcomingMapped, ...pastMapped];

      const upcoming = allEvents
        .filter((event) => event.status !== 'past')
        .sort((a, b) => {
          if (a.status !== b.status) {
            if (a.status === 'live') return -1;
            if (b.status === 'live') return 1;
          }
          const aStart = toTimestamp(a.startIso);
          const bStart = toTimestamp(b.startIso);
          if (Number.isNaN(aStart) && Number.isNaN(bStart)) return 0;
          if (Number.isNaN(aStart)) return 1;
          if (Number.isNaN(bStart)) return -1;
          return aStart - bStart;
        });

      const past = allEvents
        .filter((event) => event.status === 'past')
        .sort((a, b) => {
          const aStart = toTimestamp(a.startIso);
          const bStart = toTimestamp(b.startIso);
          if (Number.isNaN(aStart) && Number.isNaN(bStart)) return 0;
          if (Number.isNaN(aStart)) return 1;
          if (Number.isNaN(bStart)) return -1;
          return bStart - aStart;
        });

      return { upcoming, past };
    },
    []
  );

  // Load profile data
  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      // Determine the target user ID:
      // 1. URL param (public view)
      // 2. Authenticated user (private view)
      const targetId = urlUserId || user?.user_id;

      if (!targetId) {
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);

        // If it's a UUID, fetch by ID. If it's a username, we might need a different query or logic.
        // Assuming urlUserId is the user ID for now as per current routing.
        // If your routing passes username, you need to resolve username -> ID first.
        // But the previous component uses `displayProfile.username || event.user_id` in the link.
        // If it is a UUID, getProfileById works. If it is a username, we need to fetch by username.

        let profileData: UserProfile | null = null;
        
        if (urlUserId && urlUserId !== user?.user_id) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
          if (isUuid) {
            profileData = await getProfileByUserId(targetId);
          } else {
            profileData = await getProfileByUsername(targetId);
          }
        } else {
          profileData = user;
        }

        if (!cancelled) {
          setProfile(profileData);
          if (profileData?.avatar_url) {
            setProfileAvatarUrl(profileData.avatar_url);
          } else {
            setProfileAvatarUrl(null);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };
    loadProfile();
    return () => { cancelled = true; };
  }, [user?.user_id, urlUserId]); // Depend on urlUserId too

  // Update profile when avatar URL changes (only if it's a new URL)
  useEffect(() => {
    let cancelled = false;
    const updateAvatar = async () => {
      if (!user?.user_id || !profileAvatarUrl || (profile && profile.avatar_url === profileAvatarUrl)) return;
      try {
        await updateProfileAvatar(profileAvatarUrl);
        if (!cancelled) {
          setProfile(prev => prev ? { ...prev, avatar_url: profileAvatarUrl } : null);
        }
      } catch (error) {
        console.error('Error updating profile avatar:', error);
      }
    };
    updateAvatar();
    return () => { cancelled = true; };
  }, [profileAvatarUrl, user?.user_id, profile]);

  // Load Events
  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;

    const run = async () => {
      const targetId = profile?.user_id || hostData?.user_id || (urlUserId ? undefined : user?.user_id); // Use profile.user_id if profile loaded, else falback

      // Wait for profile to load if we are using a username URL
      if (!targetId && profileLoading) {
        return;
      }

      if (!targetId) {
        setEventsLoading(false);
        setUpcomingEvents([]);
        setPastEvents([]);
        return;
      }

      setEventsLoading(true);
      try {
        const { upcoming, past } = await loadEvents(targetId);
        if (!cancelled) {
          setUpcomingEvents(upcoming);
          setPastEvents(past);
        }
      } catch (error) {
        console.error('Error fetching events for user:', error);
        if (!cancelled) {
          setUpcomingEvents([]);
          setPastEvents([]);
        }
      } finally {
        if (!cancelled) {
          setEventsLoading(false);
        }
      }
    };

    run();
    intervalId = window.setInterval(run, 60 * 1000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [user?.user_id, urlUserId, profile?.user_id, loadEvents]); // Updated dependencies

  const ProfileEventCardSkeleton = ({ type = 'upcoming' }: { type?: 'upcoming' | 'past' }) => {
    const isPast = type === 'past';
    return (
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3 min-w-0 ${isPast ? 'w-[96%] sm:w-[85%] lg:w-[70%] self-center' : 'w-[95%] max-w-[480px] mx-auto sm:w-full sm:max-w-none'}`}>
        {!isPast && (
          <>
            <div className="flex items-center gap-3 sm:hidden">
              <div className="flex flex-col items-center">
                <div className="h-3 w-8 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-5 w-10 bg-gray-300 animate-pulse rounded mt-1"></div>
              </div>
              <div className="relative flex-1 h-6">
                <div className="absolute left-0 right-2 top-1/2 h-px -translate-y-1/2 bg-gray-200" />
              </div>
            </div>
            <div className="hidden sm:flex sm:w-20 sm:flex-col sm:items-center sm:pt-1">
              <div className="text-center">
                <div className="h-3 w-8 bg-gray-200 animate-pulse rounded mx-auto"></div>
                <div className="h-5 w-10 bg-gray-300 animate-pulse rounded mt-1 mx-auto"></div>
              </div>
              <div className="relative mt-3 flex-1 w-full">
                <div className="absolute left-1/2 right-0 top-0 bottom-1/2 -translate-x-1/2 w-px bg-gray-200" />
              </div>
            </div>
          </>
        )}
  
        <div className="relative w-full flex-1 overflow-hidden rounded-2xl border bg-gray-50/50 p-2.5 sm:p-5 shadow-sm">
          <div className="relative z-10 flex flex-row gap-2.5 sm:items-start sm:gap-4 animate-pulse">
            <div className="flex-1 flex flex-col text-left min-w-0">
              <div className="h-3 w-20 bg-gray-200 rounded mb-3"></div>
              <div className="h-5 sm:h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-1/2 bg-gray-200 rounded mb-4"></div>
              <div className="mt-2">
                 <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
              </div>
              <div className="mt-auto w-full pt-6 text-left">
                 <div className="h-8 w-24 bg-gray-200 rounded-full"></div>
              </div>
            </div>
            <div className="flex-shrink-0 self-start">
              <div className="relative aspect-square w-16 sm:w-24 md:w-28 lg:w-32 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEventCard = useCallback(
    (
      event: EventCardData,
      options?: {
        stacked?: boolean;
        index?: number;
        total?: number;
        hovered?: boolean;
        onHoverStart?: () => void;
        onHoverEnd?: () => void;
        setNode?: (node: HTMLDivElement | null) => void;
      }
    ) => {
      const isPast = event.status === 'past';
      const isLive = event.status === 'live';

      const accentTextClass = isPast ? 'text-gray-500' : isLive ? 'text-red-500' : 'text-black';
      const iconColorClass = isPast ? 'text-gray-400' : 'text-red-500';

      const cardBorderClasses = (() => {
        if (isPast) return 'border-gray-200 hover:border-gray-300';
        if (isLive) return 'border-red-100 hover:border-red-200';
        return 'border-black/10 hover:border-black/40';
      })();

      const mobileHorizontalDashClass = (() => {
        if (isPast) return 'bg-[repeating-linear-gradient(to_right,rgba(148,163,184,0.6),rgba(148,163,184,0.6)_8px,transparent_8px,transparent_16px)]';
        if (isLive) return 'bg-[repeating-linear-gradient(to_right,rgba(239,68,68,0.7),rgba(239,68,68,0.7)_8px,transparent_8px,transparent_16px)]';
        return 'bg-[repeating-linear-gradient(to_right,rgba(0,0,0,0.65),rgba(0,0,0,0.65)_8px,transparent_8px,transparent_16px)]';
      })();
      const mobileVerticalDashClass = (() => {
        if (isPast) return 'bg-[repeating-linear-gradient(to_bottom,rgba(148,163,184,0.5),rgba(148,163,184,0.5)_8px,transparent_8px,transparent_16px)]';
        if (isLive) return 'bg-[repeating-linear-gradient(to_bottom,rgba(239,68,68,0.6),rgba(239,68,68,0.6)_8px,transparent_8px,transparent_16px)]';
        return 'bg-[repeating-linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.55)_8px,transparent_8px,transparent_16px)]';
      })();
      const desktopVerticalDashClass = (() => {
        if (isPast) return 'bg-[repeating-linear-gradient(to_bottom,rgba(148,163,184,0.5),rgba(148,163,184,0.5)_8px,transparent_8px,transparent_16px)]';
        if (isLive) return 'bg-[repeating-linear-gradient(to_bottom,rgba(239,68,68,0.6),rgba(239,68,68,0.6)_8px,transparent_8px,transparent_16px)]';
        return 'bg-[repeating-linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.55)_8px,transparent_8px,transparent_16px)]';
      })();
      const desktopHorizontalDashClass = (() => {
        if (isPast) return 'bg-[repeating-linear-gradient(to_right,rgba(148,163,184,0.6),rgba(148,163,184,0.6)_8px,transparent_8px,transparent_16px)]';
        if (isLive) return 'bg-[repeating-linear-gradient(to_right,rgba(239,68,68,0.7),rgba(239,68,68,0.7)_8px,transparent_8px,transparent_16px)]';
        return 'bg-[repeating-linear-gradient(to_right,rgba(0,0,0,0.65),rgba(0,0,0,0.65)_8px,transparent_8px,transparent_16px)]';
      })();


      const ctaTarget = isPast
        ? event.detailsUrl || `/events/${event.id}`
        : isMyProfile ? event.manageUrl : (event.detailsUrl || `/events/${event.id}`);
      const ctaLabel = isPast ? 'View Recap' : (isMyProfile ? 'Manage Event' : 'View Event');

      const hasTickets = event.tickets.length > 0;
      const multipleTickets = event.tickets.length > 1;
      const minPricedTicket = hasTickets
        ? event.tickets.reduce((lowest, current) => {
          const currentPrice = typeof current.price === 'number' ? current.price : Number(current.price);
          if (!lowest) return current;
          const lowestPrice = typeof lowest.price === 'number' ? lowest.price : Number(lowest.price);
          if (Number.isNaN(lowestPrice) || currentPrice < lowestPrice) {
            return current;
          }
          return lowest;
        }, event.tickets[0])
        : null;
      const singleTicket = hasTickets && !multipleTickets ? minPricedTicket : null;

      const ticketPillClasses = isPast
        ? 'border border-black/10 bg-white/60 text-gray-800'
        : 'border border-blue-200 bg-blue-50 text-blue-800';
      const ticketPriceClasses = isPast ? 'text-gray-500' : 'text-blue-700 font-semibold';
      const freePillClasses = isPast
        ? 'border border-black/10 bg-white/60 text-gray-700'
        : 'border border-blue-200 bg-blue-50 text-blue-800';

      const renderTimeBadge = (variant: 'mobile' | 'desktop') => {
        if (isLive) {
          const padding = variant === 'mobile' ? 'px-2.5 py-0.5' : 'px-3 py-1';
          return (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white bg-red-500 rounded-full shadow-sm ${padding}`}
            >
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white/50 animate-ping" aria-hidden="true" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
              </span>
              LIVE
            </span>
          );
        }

        const textSize = variant === 'mobile' ? 'text-sm' : 'text-sm';
        return <span className={`${textSize} font-semibold ${accentTextClass}`}>{event.startTimeLabel}</span>;
      };

      const overlapTopClass = options?.stacked && (options.index ?? 0) > 0 ? ' -mt-12 sm:-mt-18' : '';
      const stackedWrapperClasses = options?.stacked ? ' transition-transform hover:-translate-y-1' : '';
      const stackedWidthClasses = options?.stacked ? ' w-[96%] sm:w-[85%] lg:w-[70%]' : ' w-[95%] max-w-[480px] mx-auto sm:w-full sm:max-w-none';
      const stackedAlignmentClasses = options?.stacked ? ' self-center' : '';
      const baseZ = options?.stacked ? (options.total ?? 0) - (options.index ?? 0) : 0;
      const wrapperStyle = options?.stacked
        ? {
          zIndex: options?.hovered ? (options.total ?? 0) + 10 : baseZ,
          marginTop:
            options?.hovered && (options.index ?? 0) > 0
              ? (options.index ?? 0) === 1
                ? '-4.5rem'
                : '-4rem'
              : undefined,
          transition: 'margin-top 320ms ease, transform 320ms ease',
        }
        : undefined;
      const stackedShadowStrength = options?.stacked
        ? options?.hovered
          ? 0.22
          : Math.max(0.06, 0.18 - (options.index ?? 0) * 0.03)
        : null;
      const stackedScale = options?.stacked
        ? options?.hovered
          ? 1
          : Math.max(0.88, 1 - (options.index ?? 0) * 0.04)
        : 1;
      const blurAmount = (() => {
        if (!options?.stacked || options?.hovered) return 0;
        const idx = options.index ?? 0;
        if (isMobileView) {
          if (idx === 0) return 6;
          if (idx === 1) return 9;
          return 12;
        }
        if (idx === 0) return 0;
        if (idx === 1) return 4;
        return 7;
      })();
      const cardStyle = options?.stacked
        ? {
          boxShadow: `0 18px 40px rgba(15,23,42,${stackedShadowStrength!.toFixed(2)})`,
          transform: `scale(${stackedScale.toFixed(2)})`,
          transformOrigin: 'top center',
          filter: blurAmount ? `blur(${blurAmount}px)` : 'none',
          transition: 'transform 320ms ease, box-shadow 320ms ease, filter 240ms ease',
        }
        : undefined;

      return (
        <div
          key={event.id}
          className={`flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3 min-w-0${overlapTopClass}${stackedWrapperClasses}${stackedWidthClasses}${stackedAlignmentClasses}`}
          ref={options?.setNode}
          data-event-id={event.id}
          style={wrapperStyle}
          onMouseEnter={options?.onHoverStart}
          onMouseLeave={options?.onHoverEnd}
        >
          {!isPast && (
            <>
              {/* Mobile time and connector */}
              <div className="flex items-center gap-3 sm:hidden">
                {renderTimeBadge('mobile')}
                <div className="relative flex-1 h-6">
                  <div className={`absolute left-0 right-2 top-1/2 h-px -translate-y-1/2 ${mobileHorizontalDashClass}`} />
                  <div className={`absolute right-2 top-1/2 h-6 w-px ${mobileVerticalDashClass}`} />
                </div>
              </div>

              {/* Desktop time column */}
              <div className="hidden sm:flex sm:w-20 sm:flex-col sm:items-center sm:pt-1">
                <div className="text-center">{renderTimeBadge('desktop')}</div>
                <div className="relative mt-3 flex-1 w-full">
                  <div className={`absolute left-1/2 right-0 top-0 bottom-1/2 -translate-x-1/2 w-px ${desktopVerticalDashClass}`} />
                  <div className={`absolute left-1/2 right-[-0.75rem] top-1/2 h-px -translate-y-1/2 ${desktopHorizontalDashClass}`} />
                </div>
              </div>
            </>
          )}

          {/* Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(event.detailsUrl || `/events/${event.id}`)}
            onKeyDown={(evt) => {
              if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault();
                navigate(event.detailsUrl || `/events/${event.id}`);
              }
            }}
            className={`relative w-full flex-1 overflow-hidden rounded-2xl border bg-gradient-to-br from-gray-100 via-orange-50/20 to-gray-100 text-sm shadow-sm shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2 focus:ring-offset-gray-100 sm:ml-0 ${cardBorderClasses}`}
            style={cardStyle}
          >
            <div className="relative z-10 flex flex-row gap-2.5 p-2.5 sm:items-start sm:gap-4 sm:p-5">
              <div className="flex-1 flex flex-col text-left min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium uppercase tracking-[0.12em] sm:tracking-[0.18em] text-gray-500">
                  <svg className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${iconColorClass}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                  </svg>
                  <span>{event.dateLabel}</span>
                </div>
                <h3 className="mt-2.5 sm:mt-3 text-lg sm:text-2xl font-semibold text-gray-900 truncate" title={event.title}>
                  {event.title}
                </h3>
                <p className="mt-1 text-xs sm:text-base font-medium text-gray-700">{event.locationLabel}</p>
                {hasTickets ? (
                  multipleTickets && minPricedTicket ? (
                    <div className="mt-3 sm:mt-4">
                      <span className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold ${ticketPillClasses}`}>
                        <span>From</span>
                        <span className={ticketPriceClasses}>
                          {formatTicketPrice(minPricedTicket.price, minPricedTicket.currency)}
                        </span>
                      </span>
                    </div>
                  ) : singleTicket ? (
                    <div className="mt-3 sm:mt-4">
                      <span className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold ${ticketPillClasses}`}>
                        <span className={ticketPriceClasses}>
                          {formatTicketPrice(singleTicket.price, singleTicket.currency)}
                        </span>
                      </span>
                    </div>
                  ) : null
                ) : (
                  <div className="mt-3 sm:mt-4">
                    <span className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold ${freePillClasses}`}>
                      Free
                    </span>
                  </div>
                )}
                {ctaTarget && (
                  <div className="mt-auto w-full pt-4 sm:pt-8 text-left">
                    <button
                      type="button"
                      className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-black/10 bg-white px-3.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.10em] sm:tracking-[0.15em] text-gray-900 transition hover:border-black/40 hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        navigate(ctaTarget);
                      }}
                    >
                      <span>{ctaLabel}</span>
                      <svg aria-hidden="true" className="h-3 w-3 sm:h-3.5 sm:w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.44 9.25H4.5a.75.75 0 0 0 0 1.5h8.94l-2.22 2.22a.75.75 0 1 0 1.06 1.06l3.5-3.5a.75.75 0 0 0 0-1.06l-3.5-3.5a.75.75 0 1 0-1.06 1.06l2.22 2.22Z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 self-start sm:self-start">
                <div className="relative aspect-square w-16 sm:w-24 md:w-28 lg:w-32 overflow-hidden rounded-xl">
                  {event.coverImage && !failedCardImageIds.has(event.id) ? (
                    <img
                      src={event.coverImage}
                      alt={event.title}
                      className={`h-full w-full object-cover ${isPast ? 'grayscale' : ''}`}
                      loading="lazy"
                      onError={() =>
                        setFailedCardImageIds((previous) => {
                          const next = new Set(previous);
                          next.add(event.id);
                          return next;
                        })
                      }
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br ${CARD_PLACEHOLDER_GRADIENTS[(options?.index ?? 0) % CARD_PLACEHOLDER_GRADIENTS.length]} ${isPast ? 'opacity-90' : ''}`}
                    >
                      <img src={amptiveLogo} alt="Amptive" className="h-10 w-auto opacity-85 drop-shadow-[0_4px_14px_rgba(15,23,42,0.35)]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    },
    [navigate, isMyProfile]
  );

  const uploadedAvatar: string | undefined = profileAvatarUrl || hostData?.avatar_url || undefined;

  // Deterministic emoji avatar fallback
  const seed = (profile?.username || hostData?.username || urlUserId || user?.username || user?.email || 'guest').toLowerCase();
  const emojiSet = useMemo(
    () => ['😀', '😎', '🤠', '🦄', '🐼', '🐸', '🐯', '🐵', '🐧', '🐰', '🐨', '🦊', '🐙', '🐳', '🐝', '🐢', '🐞', '🌸', '🌼', '🍀', '🍉', '🍓', '🍍', '⚡', '⭐', '🌙', '☀️', '🔥', '🎧', '🎨', '🎯', '🚀', '🧠', '💎', '💜', '💛', '💚', '💙', '🧸'],
    []
  );
  const bgSet = useMemo(
    () => ['#FDE68A', '#FFEDD5', '#E9D5FF', '#DBEAFE', '#DCFCE7', '#FCE7F3', '#FFE4E6', '#F3E8FF', '#E0E7FF', '#D1FAE5'],
    []
  );
  const hash = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h << 5) - h + seed.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }, [seed]);
  const emoji = emojiSet[hash % emojiSet.length];
  const emojiBg = bgSet[hash % bgSet.length];

  // Convert hex color to rgba string with alpha
  const hexToRgba = (hex: string, alpha: number) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (_m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Extract dominant color for avatar shadow
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!uploadedAvatar || imgError) {
        setShadowColor(null);
        return;
      }
      try {
        const [color] = await extractDominantColors(uploadedAvatar, 1);
        if (!cancelled) setShadowColor(color);
      } catch (e) {
        if (!cancelled) setShadowColor(null);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [uploadedAvatar, imgError]);

  const avatarShadowStyle = useMemo(() => {
    if (!shadowColor) return undefined;
    const soft = hexToRgba(shadowColor, 0.4);
    // Increased spread and blur for a wider, softer glow
    // Format: offset-x offset-y blur-radius spread-radius color
    return { boxShadow: `0 35px 70px 10px ${soft}` } as React.CSSProperties;
  }, [shadowColor]);

  const PAST_BATCH_SIZE = 3;
  const displayedPastEvents = useMemo(() => {
    if (pastEvents.length === 0) return [] as EventCardData[];
    const batch = pastEvents.slice(pastOffset, pastOffset + PAST_BATCH_SIZE);
    if (batch.length === 0 && pastOffset !== 0) {
      return pastEvents.slice(0, Math.min(PAST_BATCH_SIZE, pastEvents.length));
    }
    return batch;
  }, [pastEvents, pastOffset]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobileView(event.matches);
    setIsMobileView(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    setPastOffset(0);
    setPastFadeState('idle');
  }, [pastEvents.length]);

  useEffect(() => {
    if (displayedPastEvents.length === 0) return;
    if (isMobileView) {
      setHoveredPastCard(null);
      return;
    }
    setHoveredPastCard((current) => {
      if (current && displayedPastEvents.some((event) => event.id === current)) {
        return current;
      }
      return displayedPastEvents[0].id;
    });
  }, [displayedPastEvents, isMobileView]);

  useEffect(() => {
    if (!isMobileView || displayedPastEvents.length === 0) return undefined;

    let frameRequested = false;

    const evaluate = () => {
      frameRequested = false;
      let bestId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      const viewportCenter = viewportHeight / 2;

      displayedPastEvents.forEach((event) => {
        const node = pastCardRefs.current.get(event.id);
        if (!node) return;
        const rect = node.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= viewportHeight) return;
        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = event.id;
        }
      });

      if (bestId && bestDistance < viewportHeight * 0.28) {
        setHoveredPastCard((current) => (current === bestId ? current : bestId));
      } else {
        setHoveredPastCard((current) => (current && displayedPastEvents.some((event) => event.id === current) ? current : null));
      }
    };

    const handleScroll = () => {
      if (frameRequested) return;
      frameRequested = true;
      window.requestAnimationFrame(evaluate);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    evaluate();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [displayedPastEvents, isMobileView]);

  const registerPastCardRef = useCallback(
    (eventId: string) => (node: HTMLDivElement | null) => {
      if (!node) {
        pastCardRefs.current.delete(eventId);
        return;
      }
      pastCardRefs.current.set(eventId, node);
    },
    []
  );

  const handlePastViewMore = () => {
    if (pastEvents.length <= PAST_BATCH_SIZE) return;
    if (pastFadeState === 'out') return;

    setPastFadeState('out');
    if (fadeOutTimeoutRef.current) window.clearTimeout(fadeOutTimeoutRef.current);
    if (fadeInTimeoutRef.current) window.clearTimeout(fadeInTimeoutRef.current);

    fadeOutTimeoutRef.current = window.setTimeout(() => {
      setPastOffset((current) => {
        const nextOffset = current + PAST_BATCH_SIZE;
        return nextOffset >= pastEvents.length ? 0 : nextOffset;
      });
      setPastFadeState('in');

      fadeInTimeoutRef.current = window.setTimeout(() => {
        setPastFadeState('idle');
      }, 240);
    }, 200);
  };

  // Subtle top tint overlay using the dominant avatar color
  const topTintStyle = useMemo(() => {
    if (!shadowColor) return undefined;
    const c12 = hexToRgba(shadowColor, 0.12);
    const c08 = hexToRgba(shadowColor, 0.08);
    const c04 = hexToRgba(shadowColor, 0.04);
    return {
      background: `linear-gradient(to bottom, ${c12} 0%, ${c08} 20%, ${c04} 40%, rgba(255,255,255,0) 60%)`
    } as React.CSSProperties;
  }, [shadowColor]);

  useEffect(() => {
    if (!authLoading && !user && !urlUserId) {
      navigate('/login');
    }
  }, [authLoading, user, urlUserId, navigate]);

  if (profileLoading || (authLoading && !urlUserId)) {
    return (
      <div className="min-h-screen bg-white">
        {/* Blur Background */}
        <div
          className="fixed inset-0 -z-10"
          style={{
            backdropFilter: 'blur(140px)',
            backgroundImage: 'url("/mkimage/image/thumb/Features125/v4/d5/bb/ad/d5bbad45-cb3e-6334-ac5d-72442a0e822c/pr_source.png/800x800vb.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* Top tint overlay */}
        {topTintStyle && (
          <div className="fixed top-0 left-0 right-0 h-80 md:h-96 lg:h-[28rem] z-0 pointer-events-none" style={topTintStyle} />
        )}

        {/* Skeleton Content */}
        <div className="relative z-10 w-full pl-3 pr-4 pt-20 pb-8">
          <div className="px-4 py-8 sm:px-8 sm:py-10 text-center flex flex-col items-center">
            <div className="mx-auto h-64 w-64 md:h-80 md:w-80 rounded-full bg-gray-200 animate-pulse shadow-xl" />
            <div className="mt-6 md:mt-4 h-12 md:h-[92px] w-3/4 max-w-xl bg-gray-200 rounded-lg animate-pulse" />
            <div className="mt-4 h-5 w-48 bg-gray-200 rounded-md animate-pulse" />
            <div className="mt-7 flex flex-row items-center justify-center gap-3">
              <div className="h-10 md:h-12 w-32 md:w-36 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-10 md:h-12 w-32 md:w-36 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>

          <div className="mt-20">
            <div className="flex flex-row items-center justify-between pb-4">
              <div className="h-8 w-24 bg-gray-200 rounded-md animate-pulse" />
              <div className="flex space-x-4">
                <div className="h-10 w-24 rounded-full bg-gray-200 animate-pulse" />
                <div className="h-10 w-24 rounded-full bg-gray-200 animate-pulse" />
              </div>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 max-w-xl mx-auto sm:max-w-none">
               <div className="h-48 w-full rounded-2xl bg-gray-200 animate-pulse" />
               <div className="h-48 w-full rounded-2xl bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Blur Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backdropFilter: 'blur(140px)',
          backgroundImage: 'url("/mkimage/image/thumb/Features125/v4/d5/bb/ad/d5bbad45-cb3e-6334-ac5d-72442a0e822c/pr_source.png/800x800vb.webp")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      ></div>
      {/* Top tint overlay */}
      {topTintStyle && (
        <div className="fixed top-0 left-0 right-0 h-80 md:h-96 lg:h-[28rem] z-0 pointer-events-none" style={topTintStyle}></div>
      )}

      {/* Content */}
      <div className="relative z-10 w-full pl-3 pr-4 pt-20 pb-8">
        {/* Profile Header */}
        <div className="px-4 py-8 sm:px-8 sm:py-10 text-center">
          <div className="relative mx-auto h-64 w-64 md:h-80 md:w-80">
            <div className="h-full w-full rounded-full overflow-hidden shadow-xl bg-white" style={avatarShadowStyle}>
              {uploadedAvatar && !imgError ? (
                <>
                  {imageLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-full" />}
                  <img
                    src={uploadedAvatar}
                    alt={user?.email || 'User'}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImgError(true);
                      setImageLoading(false);
                    }}
                  />
                </>
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-9xl"
                  style={{ backgroundColor: emojiBg }}
                >
                  {emoji}
                </div>
              )}
            </div>

            {/* Edit Profile Button at Avatar Edge */}
            {user?.id && profile?.user_id && user.id === profile.user_id && (
              <button
                type="button"
                onClick={() => navigate('/profile/edit')}
                className="absolute top-4 right-4 md:top-6 md:right-6 bg-white text-gray-700 p-2 md:p-3 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 transition-all duration-200 group flex items-center gap-2"
                title="Edit Profile"
              >
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-4 h-4 transition-transform group-hover:rotate-12"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                    />
                  </svg>
                  <span className="hidden group-hover:block transition-all text-xs font-bold whitespace-nowrap">Edit Profile</span>
                </div>
              </button>
            )}
          </div>

          <h1 className="w-full font-bold text-black text-center break-words px-4 mt-3 md:mt-1 text-3xl md:text-[92px]" style={{ fontWeight: 700, color: '#000000' }}>
            {profile?.name || (urlUserId === user?.user_id || !urlUserId ? user?.name : undefined) || hostData?.full_name || urlUserId || 'User'}
          </h1>
          <p className="mt-1 text-gray-600 text-center">@{profile?.username || (urlUserId === user?.user_id || !urlUserId ? user?.username : undefined) || hostData?.username || urlUserId || 'user'}</p>
          <div className="mt-7 flex flex-row flex-wrap items-center justify-center gap-3">
            {user?.id && profile?.user_id && user.id === profile.user_id && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/events/create')}
                  className="bg-black text-white px-4 md:px-6 py-2.5 md:py-3 rounded-full text-sm font-semibold hover:bg-gray-900 transition-all duration-200 shadow-sm hover:scale-105 active:scale-95"
                >
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (profile?.support_enabled) {
                      navigate(`/support/${profile.username || profile.user_id}`);
                    } else {
                      navigate('/profile/support-setup');
                    }
                  }}
                  title={profile?.support_enabled ? "View My Support Page" : "Setup Support Me"}
                  className="inline-flex items-center gap-2 px-4 py-2.5 md:py-3 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all duration-200 shadow-sm hover:scale-110 active:scale-95 group text-sm font-semibold"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    className="w-5 h-5 transition-transform group-hover:rotate-12"
                    aria-hidden="true"
                  >
                    <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875V3H9.375ZM12.75 3v3.75h1.875a1.875 1.875 0 1 0 0-3.75H12.75Z" />
                    <path fillRule="evenodd" d="M1.5 7.5a1.5 1.5 0 0 1 1.5-1.5h18a1.5 1.5 0 0 1 1.5 1.5v3.75a1.5 1.5 0 0 1-1.5 1.5h-18a1.5 1.5 0 0 1-1.5-1.5V7.5ZM12 6.75a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M3.75 14.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 .75.75v3.75a3 3 0 0 1-3 3h-9.75a3 3 0 0 1-3-3v-3.75Zm8.25.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                  </svg>
                  <span>{profile?.support_enabled ? 'My Support Page' : 'Accept Tips'}</span>
                </button>
              </>
            )}
          </div>

          <div className="mt-20">
            <div className="flex flex-row flex-wrap items-center justify-between gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[20px] font-bold text-gray-900 whitespace-nowrap sm:text-[24px]">Events</span>
              <div className="flex items-center space-x-4 overflow-x-auto sm:justify-end">
                <button
                  type="button"
                  onClick={() => setActiveEventTab('upcoming')}
                  className={`px-4 py-2 rounded-full border text-sm font-semibold transition whitespace-nowrap ${activeEventTab === 'upcoming'
                    ? 'bg-[#F8F7F4] text-gray-900 border-[#F8F7F4]'
                    : 'bg-white text-gray-600 border-transparent hover:bg-gray-50'
                    }`}
                >
                  Upcoming
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEventTab('past')}
                  className={`px-4 py-2 rounded-full border text-sm font-semibold transition whitespace-nowrap ${activeEventTab === 'past'
                    ? 'bg-[#F8F7F4] text-gray-900 border-[#F8F7F4]'
                    : 'bg-white text-gray-600 border-transparent hover:bg-gray-50'
                    }`}
                >
                  Past
                </button>
              </div>
            </div>

            <div className="mt-6">
              {activeEventTab === 'upcoming' && (
                eventsLoading ? (
                  <div className="grid gap-6 sm:grid-cols-2 max-w-xl mx-auto sm:max-w-none">
                    {[1, 2].map(i => <ProfileEventCardSkeleton key={i} type="upcoming" />)}
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 max-w-xl mx-auto sm:max-w-none">
                    {upcomingEvents.map(event => renderEventCard(event))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 border border-dashed border-gray-200 rounded-xl py-12">
                    <div className="mx-auto mb-4 text-4xl">😮</div>
                    <h3 className="text-lg font-semibold text-gray-700">No upcoming events</h3>
                    {isMyProfile ? (
                      <>
                        <p className="mt-2 text-sm">Create your first event to share it with your audience.</p>
                        <button
                          type="button"
                          onClick={() => navigate('/events/create')}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-black rounded-full hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Create event</span>
                        </button>
                      </>
                    ) : (
                      <p className="mt-2 text-sm">This host doesn't have any upcoming events right now. Check back later!</p>
                    )}
                  </div>
                )
              )}

              {activeEventTab === 'past' && (
                eventsLoading ? (
                  <div className="flex flex-col items-stretch gap-4 sm:gap-0 sm:items-center">
                    {[1, 2].map(i => (
                      <div key={i} className="w-full sm:w-[85%] lg:w-[70%] mb-4 flex justify-center">
                        <ProfileEventCardSkeleton type="past" />
                      </div>
                    ))}
                  </div>
                ) : pastEvents.length > 0 ? (
                  <>
                    <div
                      className={`relative flex flex-col items-stretch gap-4 sm:gap-0 sm:items-center transition-opacity duration-200 ease-in-out ${pastFadeState === 'out'
                        ? 'opacity-0'
                        : pastFadeState === 'in'
                          ? 'opacity-100'
                          : 'opacity-100'
                        }`}
                    >
                      {displayedPastEvents.map((event, index) =>
                        renderEventCard(event, {
                          stacked: isPastStackingEnabled,
                          index,
                          total: displayedPastEvents.length,
                          hovered: isPastStackingEnabled && hoveredPastCard === event.id,
                          onHoverStart: isPastStackingEnabled ? () => setHoveredPastCard(event.id) : undefined,
                          onHoverEnd: isPastStackingEnabled
                            ? () =>
                              setHoveredPastCard((current) => (current === event.id ? null : current))
                            : undefined,
                          setNode: registerPastCardRef(event.id),
                        })
                      )}
                    </div>
                    {pastEvents.length > PAST_BATCH_SIZE && (
                      <div className="mt-6 flex justify-center">
                        <button
                          type="button"
                          onClick={handlePastViewMore}
                          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-gray-900 transition hover:border-black/40 hover:bg-black hover:text-white"
                        >
                          {pastOffset + PAST_BATCH_SIZE >= pastEvents.length ? 'Back to First Events' : 'View More'}
                          <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            {pastOffset + PAST_BATCH_SIZE >= pastEvents.length ? (
                              <path d="M11.78 16.28a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 1 1 1.06 1.06L7.81 10.5l3.97 3.97a.75.75 0 0 1 0 1.06Z" />
                            ) : (
                              <path d="M10 3.5a.75.75 0 0 1 .75.75v5h5a.75.75 0 0 1 0 1.5h-5v5a.75.75 0 0 1-1.5 0v-5h-5a.75.75 0 0 1 0-1.5h5v-5A.75.75 0 0 1 10 3.5Z" />
                            )}
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-500 border border-dashed border-gray-200 rounded-xl py-12">
                    <div className="mx-auto mb-4 text-4xl">😮</div>
                    <h3 className="text-lg font-semibold text-gray-700">No past events</h3>
                    <p className="mt-2 text-sm">
                      {isMyProfile
                        ? "Events you host will appear here once they're completed."
                        : "This host hasn't hosted any events yet."}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
