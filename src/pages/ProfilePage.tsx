import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { ProfileRow, getProfileById, updateProfileAvatar } from '@/lib/supabase/profiles';
import { extractDominantColors } from '@/utils/colorExtractor';

type DatabaseEventRow = {
  id: string;
  title?: string | null;
  start_time?: string | null;
  venue?: string | null;
  city?: string | null;
  cover_image?: string | null;
  details_url?: string | null;
  manage_url?: string | null;
};

type EventCardData = {
  id: string;
  title: string;
  dateLabel: string;
  startTimeLabel: string;
  locationLabel: string;
  coverImage: string;
  detailsUrl: string;
  manageUrl: string;
  tickets: EventTicket[];
};

const defaultEventCover = 'https://www.shazam.com/mkimage/image/thumb/AMCArtistImages116/v4/7d/b1/4f/7db14f51-0978-2d7e-9add-f0d205bae318/883bda85-96d8-4515-a288-31e25bd8f216_ami-identity-b4d7093c3e0926436905c4b9df9223c0-2023-03-24T20-43-10.454Z_cropped.png/1552x1552bb.webp';

const formatEventDateLabel = (iso?: string | null) => {
  if (!iso) return 'Date to be announced';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date to be announced';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatEventTimeLabel = (iso?: string | null) => {
  if (!iso) return 'Time to be announced';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Time to be announced';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const buildLocationLabel = (venue?: string | null, city?: string | null) => {
  const parts = [venue, city].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Location to be announced';
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

const mapEventRows = (rows: DatabaseEventRow[], ticketMap: Record<string, EventTicket[]>): EventCardData[] =>
  rows
    .filter((row): row is DatabaseEventRow & { id: string } => Boolean(row.id))
    .map((row) => ({
      id: row.id,
      title: row.title ?? 'Untitled Event',
      dateLabel: formatEventDateLabel(row.start_time),
      startTimeLabel: formatEventTimeLabel(row.start_time),
      locationLabel: buildLocationLabel(row.venue, row.city),
      coverImage: row.cover_image ?? defaultEventCover,
      detailsUrl: row.details_url ?? `/events/${row.id}`,
      manageUrl: row.manage_url ?? `/events/manage/${row.id}`,
      tickets: ticketMap[row.id] ?? [],
    }));

const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [shadowColor, setShadowColor] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeEventTab, setActiveEventTab] = useState<'upcoming' | 'past'>('upcoming');
  const [upcomingEvents, setUpcomingEvents] = useState<EventCardData[]>([]);
  const [pastEvents, setPastEvents] = useState<EventCardData[]>([]);
  const navigate = useNavigate();
  const supabase = createClient();
  const loadEvents = useCallback(
    async (targetUserId: string) => {
      const nowIso = new Date().toISOString();

      const [{ data: upcomingData, error: upcomingError }, { data: pastData, error: pastError }] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, start_time, venue, city, cover_image, details_url, manage_url')
          .eq('user_id', targetUserId)
          .gte('start_time', nowIso)
          .order('start_time', { ascending: true }),
        supabase
          .from('events')
          .select('id, title, start_time, venue, city, cover_image, details_url, manage_url')
          .eq('user_id', targetUserId)
          .lt('start_time', nowIso)
          .order('start_time', { ascending: false }),
      ]);

      if (upcomingError) throw upcomingError;
      if (pastError) throw pastError;

      const allEventIds = [...(upcomingData ?? []), ...(pastData ?? [])]
        .map((row) => row.id)
        .filter(Boolean) as string[];

      const ticketMap: Record<string, EventTicket[]> = {};

      if (allEventIds.length > 0) {
        const { data: ticketRows, error: ticketError } = await supabase
          .from('event_tickets')
          .select('id, event_id, label, price, currency')
          .in('event_id', allEventIds);

        if (ticketError) throw ticketError;

        (ticketRows ?? []).forEach((ticket) => {
          if (!ticket.event_id || !ticket.id) return;
          if (!ticketMap[ticket.event_id]) ticketMap[ticket.event_id] = [];
          ticketMap[ticket.event_id].push({
            id: ticket.id,
            eventId: ticket.event_id,
            label: ticket.label ?? 'Ticket',
            price: Number(ticket.price) || 0,
            currency: ticket.currency,
          });
        });
      }

      return {
        upcoming: mapEventRows(upcomingData ?? [], ticketMap),
        past: mapEventRows(pastData ?? [], ticketMap),
      };
    },
    [supabase]
  );
  
  // Load profile data
  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      if (!user?.id) { setProfileLoading(false); return; }
      try {
        setProfileLoading(true);
        const profileData = await getProfileById(user.id);
        if (!cancelled) {
          setProfile(profileData);
          // Only set avatar URL if it's from our database
          if (profileData?.avatar_url) {
            setProfileAvatarUrl(profileData.avatar_url);
          } else {
            // Clear any previous avatar URL to ensure we don't show provider avatars
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
  }, [user?.id]);
  
  // Update profile when avatar URL changes (only if it's a new URL)
  useEffect(() => {
    let cancelled = false;
    const updateAvatar = async () => {
      if (!user?.id || !profileAvatarUrl || (profile && profile.avatar_url === profileAvatarUrl)) return;
      try {
        await updateProfileAvatar(user.id, profileAvatarUrl);
        if (!cancelled) {
          setProfile(prev => prev ? { ...prev, avatar_url: profileAvatarUrl } : null);
        }
      } catch (error) {
        console.error('Error updating profile avatar:', error);
      }
    };
    updateAvatar();
    return () => { cancelled = true; };
  }, [profileAvatarUrl, user?.id, profile]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.id) {
        setUpcomingEvents([]);
        setPastEvents([]);
        return;
      }
      try {
        const { upcoming, past } = await loadEvents(user.id);
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
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, loadEvents]);

  const renderEventCard = useCallback(
    (event: EventCardData) => (
      <div key={event.id} className="flex items-stretch gap-2">
        <div className="flex w-16 flex-col items-center pt-1">
          <div className="text-center text-base font-bold text-gray-500">
            {event.startTimeLabel}
          </div>
          <div className="relative mt-2 h-full w-px flex-1">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(209,213,219,0.75),rgba(209,213,219,0.75)_8px,transparent_8px,transparent_16px)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white/90" />
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-black/10 bg-black/4 text-sm shadow-sm backdrop-blur-lg transition-colors hover:border-black/60">
          <a
            href={event.detailsUrl}
            className="absolute inset-0"
            aria-label={`View details for ${event.title}`}
          />
          <div className="relative z-10 flex flex-row gap-2 p-3 sm:items-start sm:gap-3 sm:p-4 md:gap-4">
            <div className="flex-1 flex flex-col text-left">
              <div className="mb-2 flex items-center text-[14px] text-gray-500">
                <svg
                  className="w-[1.2em] h-[1.2em] mr-1 text-red-500"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                </svg>
                <span>{event.dateLabel}</span>
              </div>
              <h3 className="mt-2 text-[18px] font-bold text-gray-900 truncate">{event.title}</h3>
              <div className="mt-2 text-[16px] font-medium text-black">
                {event.locationLabel}
              </div>
              {event.tickets.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ticket Types</p>
                  <div className="flex flex-wrap gap-2">
                    {event.tickets.map((ticket) => (
                      <span
                        key={ticket.id}
                        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/40 px-3 py-1 text-xs font-semibold text-gray-800 backdrop-blur"
                      >
                        <span>{ticket.label}</span>
                        <span className="text-gray-500">{formatTicketPrice(ticket.price, ticket.currency)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {event.manageUrl && (
                <div className="mt-auto w-full pt-10 text-left">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      navigate(event.manageUrl);
                    }}
                    className="mt-4 -mb-1 inline-flex items-center gap-2 rounded-full bg-black/10 px-4 py-2 text-sm font-semibold text-black transition hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2"
                  >
                    <span>Manage Event</span>
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.44 9.25H4.5a.75.75 0 0 0 0 1.5h8.94l-2.22 2.22a.75.75 0 1 0 1.06 1.06l3.5-3.5a.75.75 0 0 0 0-1.06l-3.5-3.5a.75.75 0 1 0-1.06 1.06l2.22 2.22Z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 self-start sm:self-start">
              <div className="relative aspect-square w-20 sm:w-24 md:w-28 lg:w-32 overflow-hidden rounded-xl bg-white">
                <img
                  src={event.coverImage}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    [navigate]
  );

  // Only use avatars from our database, not from OAuth providers
  const uploadedAvatar: string | undefined = profileAvatarUrl || undefined;

  // Deterministic emoji avatar fallback
  const seed = (user?.user_metadata?.username || user?.email || 'guest').toLowerCase();
  const emojiSet = useMemo(
    () => ['😀','😎','🤠','🦄','🐼','🐸','🐯','🐵','🐧','🐰','🐨','🦊','🐙','🐳','🐝','🐢','🐞','🌸','🌼','🍀','🍉','🍓','🍍','⚡','⭐','🌙','☀️','🔥','🎧','🎨','🎯','🚀','🧠','💎','💜','💛','💚','💙','🧸'],
    []
  );
  const bgSet = useMemo(
    () => ['#FDE68A','#FFEDD5','#E9D5FF','#DBEAFE','#DCFCE7','#FCE7F3','#FFE4E6','#F3E8FF','#E0E7FF','#D1FAE5'],
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
    const hydrateUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        if (!u) {
          navigate('/login');
          return;
        }
        setUser(u);
      } catch (error) {
        console.error('Error hydrating user session:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    hydrateUser();
  }, [navigate]);

  if (loading || (profileLoading && !!user?.id)) {
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
        <div className="relative z-10 w-full px-4 pt-20 pb-8">
          <div className="px-6 py-8 sm:p-10">
            <div className="mx-auto h-64 w-64 md:h-80 md:w-80 rounded-full overflow-hidden bg-gray-200 animate-pulse" />
            <div className="mt-6 h-4 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="mt-4 h-20 w-3/4 bg-gray-200 rounded animate-pulse" />
          </div>

          <div className="border-t border-gray-200">
            <div className="pl-4 pr-6 py-8 sm:px-10 space-y-8">
              <div>
                <div className="h-5 w-40 bg-gray-200 rounded mb-4 animate-pulse" />
                <div className="space-y-4">
                  <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              </div>

              <div>
                <div className="h-5 w-36 bg-gray-200 rounded mb-4 animate-pulse" />
                <div className="space-y-4">
                  <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="h-5 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
                <div className="space-y-4">
                  <div className="h-10 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
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
        <div className="pl-4 pr-6 py-8 sm:p-10 text-center">
            <div className="mx-auto h-64 w-64 md:h-80 md:w-80 rounded-full overflow-hidden shadow-xl bg-white" style={avatarShadowStyle}>
              {loading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse rounded-full" />
              ) : uploadedAvatar && !imgError ? (
                <img
                  src={uploadedAvatar}
                  alt={user?.email || 'User'}
                  className="w-full h-full object-cover"
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setImgError(true);
                    setLoading(false);
                  }}
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-9xl"
                  style={{ backgroundColor: emojiBg }}
                >
                  {emoji}
                </div>
              )}
            </div>
            <h1 className="w-full font-bold text-black text-center whitespace-nowrap overflow-visible mt-3 md:mt-1 text-[40px] md:text-[92px]" style={{ fontWeight: 700, color: '#000000' }}>
              {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </h1>
            <p className="mt-1 text-gray-600 text-center">@{profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'user'}</p>
            <div className="mt-7 flex flex-row flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/profile/edit')}
                className="inline-flex items-center gap-2 bg-white text-gray-700 px-4 md:px-6 py-2.5 md:py-3 rounded-full text-sm font-semibold border border-gray-300 hover:bg-gray-100 transition-all duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                  />
                </svg>
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => navigate('/events/create')}
                className="bg-black text-white px-4 md:px-6 py-2.5 md:py-3 rounded-full text-sm font-semibold hover:bg-gray-900 transition-all duration-200"
              >
                Create Event
              </button>
            </div>

            <div className="mt-20">
              <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[24px] font-bold text-gray-900 whitespace-nowrap">Events</span>
                <div className="flex items-center space-x-4 overflow-x-auto sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveEventTab('upcoming')}
                    className={`px-4 py-2 rounded-full border text-sm font-semibold transition whitespace-nowrap ${
                      activeEventTab === 'upcoming'
                        ? 'bg-[#F8F7F4] text-gray-900 border-[#F8F7F4]'
                        : 'bg-white text-gray-600 border-transparent hover:bg-gray-50'
                    }`}
                  >
                    Upcoming
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEventTab('past')}
                    className={`px-4 py-2 rounded-full border text-sm font-semibold transition whitespace-nowrap ${
                      activeEventTab === 'past'
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
                  upcomingEvents.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2">
                      {upcomingEvents.map(renderEventCard)}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 border border-dashed border-gray-200 rounded-xl py-12">
                      <div className="mx-auto mb-4 text-4xl">😮</div>
                      <h3 className="text-lg font-semibold text-gray-700">No upcoming events</h3>
                      <p className="mt-2 text-sm">Create your first event to share it with your audience.</p>
                      <button
                        type="button"
                        onClick={() => navigate('/events/create')}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-black rounded-full hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                      >
                        <span>Create event</span>
                      </button>
                    </div>
                  )
                )}

                {activeEventTab === 'past' && (
                  pastEvents.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2">
                      {pastEvents.map(renderEventCard)}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 border border-dashed border-gray-200 rounded-xl py-12">
                      <div className="mx-auto mb-4 text-4xl">😮</div>
                      <h3 className="text-lg font-semibold text-gray-700">No past events</h3>
                      <p className="mt-2 text-sm">Events you host will appear here once they’re completed.</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Profile Sections */}
          <div className="border-t border-gray-200">
            <div className="px-6 py-8 sm:px-10 space-y-8">
              {/* Account Section */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Account Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <div>
                      <h3 className="font-medium text-gray-900">Email</h3>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
                      Change
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <div>
                      <h3 className="font-medium text-gray-900">Password</h3>
                      <p className="text-sm text-gray-500">•••••••••••</p>
                    </div>
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
                      Change
                    </button>
                  </div>
                </div>
              </div>

              {/* Preferences Section */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <div>
                      <h3 className="font-medium text-gray-900">Theme</h3>
                      <p className="text-sm text-gray-500">System</p>
                    </div>
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
                      Change
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <div>
                      <h3 className="font-medium text-gray-900">Notifications</h3>
                      <p className="text-sm text-gray-500">Email, Push</p>
                    </div>
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
                      Manage
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h2>
                <div className="space-y-4">
                  <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200">
                    Delete Account
                  </button>
                  <button 
                    onClick={async () => {
                      await supabase.auth.signOut();
                      navigate('/');
                    }}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default ProfilePage;
