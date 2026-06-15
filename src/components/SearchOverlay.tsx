import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Calendar, Users, ArrowRight, CornerDownLeft, Compass, PlusSquare, Ticket, HelpCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { listEvents, StandaloneEvent } from '@/lib/api/events';
import { listCommunities, Community } from '@/lib/api/communities';
import { useAuth } from '@/contexts/AuthContext';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigableItem {
  id: string;
  type: 'event' | 'community' | 'link' | 'action' | 'profile';
  title: string;
  subtitle?: string;
  url: string;
  image?: string | null;
  date?: string;
  badge?: string;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<StandaloneEvent[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { user: authUser } = useAuth();

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load data when opened
  useEffect(() => {
    if (!isOpen) return;

    // Reset states
    setQuery('');
    setActiveIndex(0);

    const loadSearchData = async () => {
      setIsLoading(true);
      try {
        const [eventsData, communitiesData] = await Promise.all([
          listEvents({ page_size: 100 }).catch(() => []),
          listCommunities({ page_size: 100 }).catch(() => []),
        ]);
        setEvents(eventsData || []);
        setCommunities(communitiesData || []);
      } catch (err) {
        console.error('Failed to load search data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSearchData();

    // Auto-focus input
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Global keydown listener for ESC and hotkeys
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle overlay on Cmd+K or Ctrl+K or / (if no input is focused)
      if (
        (e.metaKey && e.key.toLowerCase() === 'k') ||
        (e.ctrlKey && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Parent component handles opening
        }
      }

      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Extract unique hosts/co-hosts from fetched events to search creators
  const creators = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    if (authUser && authUser.user_id) {
      seen.add(authUser.user_id);
      list.push({
        user_id: authUser.user_id,
        username: authUser.username || authUser.name || authUser.email?.split('@')[0] || '',
        name: authUser.name || authUser.username || 'You',
        profile_picture: authUser.avatar_url || authUser.profile_picture || null,
      });
    }

    events.forEach((event) => {
      if (event.host && event.host.user_id && !seen.has(event.host.user_id)) {
        seen.add(event.host.user_id);
        list.push({
          user_id: event.host.user_id,
          username: event.host.username || '',
          name: event.host.name || event.host.display_name || '',
          profile_picture: event.host.profile_picture || event.host.profile_image_url || null,
        });
      }
      if (event.co_hosts) {
        event.co_hosts.forEach((ch) => {
          if (ch && ch.user_id && !seen.has(ch.user_id)) {
            seen.add(ch.user_id);
            list.push({
              user_id: ch.user_id,
              username: ch.username || '',
              name: ch.name || ch.display_name || '',
              profile_picture: ch.profile_picture || ch.profile_image_url || null,
            });
          }
        });
      }
    });

    return list;
  }, [events, authUser]);

  // Filter items based on query
  const filteredItems = useMemo<NavigableItem[]>(() => {
    const trimmed = query.trim().toLowerCase();

    // Quick default suggestions when query is empty
    if (!trimmed) {
      return [
        {
          id: 'quick-explore',
          type: 'link',
          title: 'Explore Events',
          subtitle: 'Discover upcoming live concerts, tech meetups, and art shows',
          url: '/explore',
          image: null,
        },
        {
          id: 'quick-create',
          type: 'link',
          title: 'Create an Event',
          subtitle: 'Host your own show or selling tickets with custom quantities',
          url: '/events/create',
          image: null,
        },
        {
          id: 'quick-tickets',
          type: 'link',
          title: 'My Tickets',
          subtitle: 'View your purchased ticket orders and QR codes',
          url: '/my-tickets',
          image: null,
        },
        {
          id: 'quick-community',
          type: 'link',
          title: 'Community Tasks',
          subtitle: 'Join tasks and collaborate on sponsored assignments',
          url: '/community',
          image: null,
        },
        {
          id: 'quick-help',
          type: 'link',
          title: 'Help Center',
          subtitle: 'Find answers, contact support, and submit queries',
          url: '/help',
          image: null,
        },
      ];
    }

    const items: NavigableItem[] = [];

    // 1. Search Action option at top
    items.push({
      id: 'search-explore-action',
      type: 'action',
      title: `Search for "${query}" in Explore`,
      subtitle: 'Open the full explore page with filters applied',
      url: `/explore?q=${encodeURIComponent(query)}`,
    });

    // 2. Filter Events
    const matchingEvents = events.filter((e) => {
      const title = e.title?.toLowerCase() || '';
      const desc = e.description?.toLowerCase() || '';
      const venue = e.location?.venue?.toLowerCase() || e.venue?.name?.toLowerCase() || '';
      const city = e.location?.city?.toLowerCase() || e.venue?.city?.toLowerCase() || '';
      return title.includes(trimmed) || desc.includes(trimmed) || venue.includes(trimmed) || city.includes(trimmed);
    });

    matchingEvents.slice(0, 5).forEach((e) => {
      const eventDate = e.scheduled_for ? new Date(e.scheduled_for) : null;
      const formattedDate = eventDate
        ? eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'TBA';
      const venueName = e.location?.type === 'online' ? 'Online Event' : (e.location?.venue || e.venue?.name || 'Venue TBA');

      items.push({
        id: e.event_id,
        type: 'event',
        title: e.title,
        subtitle: `${formattedDate} • ${venueName}`,
        url: `/events/${e.event_id}`,
        image: e.thumbnail_url,
      });
    });

    // 3. Filter Communities
    const matchingCommunities = communities.filter((c) => {
      const name = c.name?.toLowerCase() || '';
      const desc = c.description?.toLowerCase() || '';
      return name.includes(trimmed) || desc.includes(trimmed);
    });

    matchingCommunities.slice(0, 3).forEach((c) => {
      items.push({
        id: c.community_id,
        type: 'community',
        title: c.name,
        subtitle: `${c.member_count || 0} members • Community`,
        url: '/community', // Note: community pages go to /community since detail page is coming soon
        image: c.image || c.cover_image,
      });
    });

    // 4. Filter Creators/Profiles
    const matchingCreators = creators.filter((c) => {
      const name = c.name?.toLowerCase() || '';
      const username = c.username?.toLowerCase() || '';
      return name.includes(trimmed) || username.includes(trimmed);
    });

    matchingCreators.slice(0, 3).forEach((c) => {
      items.push({
        id: `creator-${c.user_id}`,
        type: 'profile',
        title: c.name || `@${c.username}` || 'Creator',
        subtitle: c.username ? `@${c.username}` : 'Host',
        url: `/profile/${c.user_id}`,
        image: c.profile_picture,
      });
    });

    return items;
  }, [query, events, communities, creators]);

  // Reset activeIndex when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    const container = resultsContainerRef.current;
    if (!container) return;

    const activeEl = container.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement;
    if (!activeEl) return;

    const containerHeight = container.clientHeight;
    const containerScrollTop = container.scrollTop;
    const elHeight = activeEl.clientHeight;
    const elOffsetTop = activeEl.offsetTop;

    if (elOffsetTop < containerScrollTop) {
      container.scrollTop = elOffsetTop;
    } else if (elOffsetTop + elHeight > containerScrollTop + containerHeight) {
      container.scrollTop = elOffsetTop + elHeight - containerHeight;
    }
  }, [activeIndex]);

  // Keyboard navigation inside the open modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[activeIndex]) {
        handleNavigate(filteredItems[activeIndex]);
      }
    }
  };

  const handleNavigate = (item: NavigableItem) => {
    if (item.type === 'profile') {
      const id = item.id.replace('creator-', '');
      const rawUsername = item.subtitle?.replace('@', '') || '';
      navigate(item.url, {
        state: {
          hostData: {
            user_id: id,
            username: rawUsername,
            full_name: item.title,
            avatar_url: item.image || null,
          }
        }
      });
    } else {
      navigate(item.url);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 md:px-0">
        {/* Glassmorphic Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-md"
        />

        {/* Modal Search Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl border border-gray-150 shadow-[0_32px_64px_-12px_rgba(15,23,42,0.18)] overflow-hidden flex flex-col max-h-[75vh]"
          onKeyDown={handleKeyDown}
        >
          {/* Header Input Section */}
          <div className="relative flex items-center border-b border-gray-100 px-5 py-4">
            <Search className="w-5.5 h-5.5 text-gray-400 mr-3.5 shrink-0" strokeWidth={2.2} />
            <input
              ref={inputRef}
              type="text"
              className="w-full text-lg text-gray-900 placeholder-gray-400 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
              placeholder="Search for events, tasks, communities..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            
            {query && (
              <div className="flex items-center shrink-0 ml-2">
                <button
                  onClick={() => setQuery('')}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Results List */}
          <div
            ref={resultsContainerRef}
            className="flex-1 overflow-y-auto px-2 py-3 divide-y divide-gray-50"
            style={{ scrollBehavior: 'smooth' }}
          >
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 space-y-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  <svg
                    className="h-full w-full animate-pulse text-black"
                    viewBox="0 0 105 84"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-label="Loading..."
                  >
                    <path
                      d="M96.9489 58.3115C96.7382 63.182 96.0281 67.7666 92.1577 68.4573C91.8456 68.5049 91.5725 68.5347 91.276 68.5347C86.7111 68.5347 82.7783 62.3186 78.6114 55.7691C75.8569 51.4524 72.5951 46.3081 69.7158 44.5397C69.0603 44.1348 68.1083 44.1825 67.5465 44.6647C65.1665 46.7249 63.4186 52.4884 61.9828 57.3172C59.7199 64.8551 57.5662 72 52.5175 72C47.4688 72 45.3152 64.861 43.0522 57.3053C41.6164 52.4706 39.8763 46.6832 37.4964 44.6409C36.9423 44.1646 36.0059 44.111 35.3427 44.504C32.4477 46.2247 29.1625 51.4107 26.3846 55.7751C22.2177 62.3246 18.2849 68.5407 13.72 68.5407C13.4235 68.5407 13.1582 68.5109 12.8383 68.4633C8.97567 67.7666 8.26558 63.182 8.05489 58.3115C7.46965 44.6528 11.5741 31.1668 19.8845 19.3003C22.6469 15.3349 26.0179 11.3933 29.8492 12.078C34.773 12.9413 34.7496 20.2589 34.7262 28.0052C34.7262 32.1611 34.7106 37.0078 35.725 39.8777C36.0996 40.9315 37.9646 41.0804 38.6278 40.1099C40.4226 37.4662 41.8193 32.828 43.0132 28.8388C45.2761 21.283 47.4298 14.1441 52.4785 14.1441C57.5272 14.1441 59.6808 21.283 61.9438 28.8566C63.1455 32.8697 64.55 37.5496 66.3604 40.1813C67.0237 41.1459 68.8808 40.997 69.2554 39.9491C70.2854 37.0852 70.2776 32.1969 70.2776 28.0052C70.2542 20.2589 70.2386 12.9413 75.1546 12.078C79.0094 11.3933 82.3569 15.3349 85.1193 19.3003C93.4297 31.1668 97.5107 44.6528 96.9489 58.3115Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider">Loading items...</span>
              </div>
            )}

            {!isLoading && filteredItems.length === 0 && (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">No results found for "{query}"</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                  We couldn't find any events or communities matching your search. Try different keywords.
                </p>
              </div>
            )}

            {!isLoading && filteredItems.length > 0 && (
              <div className="space-y-1">
                {/* Render Items with Grouped Subheadings */}
                {filteredItems.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  const showHeader = query.trim() !== '' && (idx === 0 || filteredItems[idx - 1].type !== item.type);
                  const headerText = item.type === 'action' ? 'Search Options' : item.type === 'event' ? 'Events' : item.type === 'community' ? 'Communities' : item.type === 'profile' ? 'Profiles' : '';

                  return (
                    <React.Fragment key={item.id}>
                      {showHeader && headerText && (
                        <div className="px-3.5 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 select-none">
                          {headerText}
                        </div>
                      )}
                      <div
                        data-index={idx}
                        onClick={() => handleNavigate(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`group flex items-center justify-between px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-150 ${
                          isActive
                            ? 'bg-gray-100 text-gray-900 shadow-sm'
                            : 'hover:bg-gray-50/60 text-gray-800'
                        }`}
                      >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        {/* Render Icons or Thumbnails */}
                        <div className="shrink-0">
                          {item.type === 'event' ? (
                            item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-10 h-10 rounded-xl object-cover border border-gray-100"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-gray-200/60 text-gray-700' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                <Calendar className="w-5 h-5" />
                              </div>
                            )
                          ) : item.type === 'community' ? (
                            item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-10 h-10 rounded-full object-cover border border-gray-100"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-gray-200/60 text-gray-700' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                <Users className="w-5 h-5" />
                              </div>
                            )
                          ) : item.type === 'profile' ? (
                            item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-10 h-10 rounded-full object-cover border border-gray-100"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-gray-200/60 text-gray-700' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                <User className="w-5 h-5" />
                              </div>
                            )
                          ) : item.type === 'action' ? (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-gray-200/60 text-blue-600' : 'bg-blue-50 text-blue-500'}`}>
                              <Search className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-gray-200/60 text-gray-700' : 'bg-gray-50 text-gray-500'}`}>
                              {item.id === 'quick-explore' && <Compass className="w-5 h-5" />}
                              {item.id === 'quick-create' && <PlusSquare className="w-5 h-5" />}
                              {item.id === 'quick-tickets' && <Ticket className="w-5 h-5" />}
                              {item.id === 'quick-community' && <Users className="w-5 h-5" />}
                              {item.id === 'quick-help' && <HelpCircle className="w-5 h-5" />}
                            </div>
                          )}
                        </div>

                        {/* Title and Subtitle */}
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold truncate text-gray-900">
                            {item.title}
                          </h4>
                          {item.subtitle && (
                            <p className="text-xs mt-0.5 truncate text-gray-500">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Indicator */}
                      <div className="shrink-0 ml-3 flex items-center">
                        {isActive ? (
                          <div className="flex items-center space-x-1.5 text-xs text-gray-500 bg-gray-200/60 px-2 py-1 rounded-[10px]">
                            <span>Select</span>
                            <CornerDownLeft className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
                })}
              </div>
            )}
          </div>


        </motion.div>
      </div>
    </AnimatePresence>
  );
}
