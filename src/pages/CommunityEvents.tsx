import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Search, Users } from 'lucide-react';
import { getCommunity, type Community } from '@/lib/api/communities';
import { listEvents, type StandaloneEvent } from '@/lib/api/events';

const formatEventDate = (value?: string | null) => {
  if (!value) return 'Date TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date TBA';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function CommunityEvents() {
  const { id } = useParams<{ id: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [events, setEvents] = useState<StandaloneEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const loadCommunityEvents = async () => {
      setLoading(true);
      try {
        const [communityData, eventsData] = await Promise.all([
          getCommunity(id).catch(() => null),
          listEvents({ page_size: 100, communityId: id }).catch(() => []),
        ]);

        if (cancelled) return;

        setCommunity(communityData);
        setEvents(eventsData || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCommunityEvents();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const communityName = community?.name?.trim().toLowerCase() || '';
  const coverImage = communityName === 'music'
    ? '/images/community-music-cover.png'
    : ['comedy', 'commedy'].includes(communityName)
      ? '/images/community-comedy-cover.png'
      : community?.cover_image || community?.image;

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <header className="mb-10">
        <div className="relative h-[260px] overflow-hidden bg-gray-100 sm:h-[360px]">
          {coverImage ? (
            <img src={coverImage} alt={community?.name || 'Community'} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <Users className="h-16 w-16" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8">
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {community?.name || 'Community'}
              </h1>
              {community?.description && (
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/75 sm:text-base">
                  {community.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-black sm:text-2xl">Events</h2>
              <p className="mt-1 text-sm font-medium text-gray-500">
                {loading ? 'Loading events' : `${events.length} event${events.length === 1 ? '' : 's'} in this community`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl p-2">
                  <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-3">
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                    <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {events.map((event) => (
                <Link
                  key={event.event_id}
                  to={`/events/${event.event_id}`}
                  className="group flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-gray-50"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-100">
                    {event.thumbnail_url ? (
                      <img src={event.thumbnail_url} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <Calendar className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-tight text-gray-500">
                      {formatEventDate(event.scheduled_for)}
                    </p>
                    <h3 className="truncate text-base font-bold text-gray-950 group-hover:underline">
                      {event.title}
                    </h3>
                    <p className="mt-1 truncate text-sm font-medium text-gray-500">
                      {event.venue?.name || event.location?.venue || event.venue?.city || event.location?.city || 'Location TBA'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
                <Search className="h-6 w-6 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-950">No events yet</h3>
              <p className="mt-1 max-w-sm text-sm font-medium leading-6 text-gray-500">
                Events assigned to this community will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
