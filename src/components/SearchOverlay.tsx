import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Calendar, Users, ArrowRight, CornerDownLeft, Compass, PlusSquare, Ticket, HelpCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { listEvents, StandaloneEvent } from '@/lib/api/events';
import { listCommunities, Community } from '@/lib/api/communities';
import { searchProfiles } from '@/lib/api/profiles';
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
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingProfiles, setIsSearchingProfiles] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { user: authUser } = useAuth();

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setProfiles([]);
      setIsSearchingProfiles(false);
      return;
    }

    setIsSearchingProfiles(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchProfiles(trimmed);
        setProfiles(data || []);
      } catch {
        setProfiles([]);
      } finally {
        setIsSearchingProfiles(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

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

    profiles.forEach((profile) => {
      const userId = profile.user_id || profile.id;
      if (userId && !seen.has(userId)) {
        seen.add(userId);
        list.push({
          user_id: userId,
          username: profile.username || '',
          name: profile.name || profile.full_name || profile.display_name || '',
          email: profile.email || '',
          profile_picture: profile.profile_picture || profile.avatar_url || null,
        });
      }
    });

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
  }, [events, authUser, profiles]);

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
        url: `/community/${c.community_id}`,
        image: c.image || c.cover_image,
      });
    });

    // 4. Filter Creators/Profiles
    const matchingCreators = creators.filter((c) => {
      const name = c.name?.toLowerCase() || '';
      const username = c.username?.toLowerCase() || '';
      const email = c.email?.toLowerCase() || '';
      return name.includes(trimmed) || username.includes(trimmed) || email.includes(trimmed);
    });

    matchingCreators.slice(0, 6).forEach((c) => {
      items.push({
        id: `creator-${c.user_id}`,
        type: 'profile',
        title: c.name || `@${c.username}` || 'Creator',
        subtitle: c.username ? `@${c.username}` : (c.email || 'Profile'),
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
      const rawUsername = item.subtitle?.startsWith('@') ? item.subtitle.replace('@', '') : '';
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

  const overlay = (
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
            <input
              ref={inputRef}
              type="text"
              className="w-full text-base text-gray-900 placeholder-gray-400 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 sm:text-lg"
              placeholder="Search for events, users, communities..."
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
            {(isLoading || isSearchingProfiles) && (
              <div className="space-y-1 py-1">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="flex items-center gap-3.5 px-3.5 py-3 rounded-2xl">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100 animate-pulse" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-2/5 rounded-full bg-gray-100 animate-pulse" />
                      <div className="h-3 w-3/5 rounded-full bg-gray-100 animate-pulse" />
                    </div>
                    <div className="h-4 w-4 rounded-full bg-gray-100 animate-pulse" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !isSearchingProfiles && filteredItems.length === 0 && (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">No results found for "{query}"</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                  We couldn't find any users, events, or communities matching your search. Try a username, full name, event title, or community name.
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
                              <div className={`w-10 h-10 flex items-center justify-center ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
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
                              <div className={`w-10 h-10 flex items-center justify-center ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
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
                              <div className={`w-10 h-10 flex items-center justify-center ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                                <User className="w-5 h-5" />
                              </div>
                            )
                          ) : item.type === 'action' ? (
                            <div className={`w-10 h-10 flex items-center justify-center ${isActive ? 'text-blue-600' : 'text-blue-500'}`}>
                              <Search className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className={`w-10 h-10 flex items-center justify-center ${isActive ? 'text-gray-700' : 'text-gray-500'}`}>
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

  return createPortal(overlay, document.body);
}
