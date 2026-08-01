import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { listEvents } from '../lib/api/events';
import { getTicketEarlyBirdRemaining, getTicketRemaining, getTicketUnitPrice, getTicketsForEvent, isTicketSoldOut } from '../lib/api/tickets';
import LocationMap from '../components/LocationMap';
import { listCommunities, Community } from '@/lib/api/communities';
import { useAuth } from '@/contexts/AuthContext';
import { getPublishedPosts } from '@/lib/api/blog';
import { blogPosts as staticBlogPosts } from '@/lib/blog-data';
import { useSEO } from '@/hooks/useSEO';
import EventSpotlightCarousel from '@/components/EventSpotlightCarousel';


// Type definition for Trending Card
interface TrendingCardProps {
  id: number;
  title: string;
  description: string;
  image: string;
  gradient: string;
  avatars: string[];
  type: 'shows' | 'events';
  buttonText?: string;
}

// Trending Card Component
const TrendingCard: React.FC<TrendingCardProps> = ({
  title,
  description,
  image,
  gradient,
  avatars,
  type,
  buttonText
}) => {
  const ctaLabel = buttonText || (type === 'shows' ? 'Subscribe' : 'Get Tickets');
  const isLive = ctaLabel.toLowerCase().includes('live');

  return (
    <div
      className="flex-shrink-0 w-[280px] sm:w-auto rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden relative"
      style={{ background: gradient }}
    >
      <div className="p-4 flex flex-col h-full relative z-10">
        <div className="flex justify-between items-center mb-3">
          <img
            src={image}
            alt={title}
            className="w-12 h-12 rounded-md object-cover"
          />
          <button
            className="px-3.5 py-1.5 bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 shadow-xs"
            type="button"
          >
            {isLive && <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />}
            {ctaLabel}
          </button>
        </div>
        <h3 className="text-sm font-semibold text-white mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{title}</h3>
        <p className="text-gray-200 text-xs mb-3 line-clamp-2">
          {description}
        </p>
        <div className="mt-auto">
          <div className="flex -space-x-2">
            {avatars.map((avatar, index) => (
              <img
                key={index}
                src={avatar}
                alt={`Host ${index + 1}`}
                className="w-6 h-6 rounded-full border-2 border-white object-cover"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
// Images moved to public directory for Netlify
import EventCard, { MediaSource, EventCardSkeleton } from '../components/EventCard';
import GeometricPattern from '../components/GeometricPattern';

interface EventType {
  id: number;
  title: string;
  location: string;
  country: string;
  ticket_status: string;
  price: number | any[];
  date: string;
  media: MediaSource;
  hasEarlyBirdOnSale?: boolean;
  isAlmostSoldOut?: boolean;
}

const HOMEPAGE_CACHE_TTL = 60_000;

let homepageBlogCache: { data: any[]; timestamp: number } | null = null;
let homepageEventsCache: { data: EventType[]; timestamp: number } | null = null;
let homepageCommunitiesCache: { data: Community[]; timestamp: number } | null = null;
let homepageHeroSlide = 0;
const homepageHeroVideoTimes: Record<string, number> = {};

// Update image paths to use public directory
const techConferenceCardStyles = `
  .tech-conference-card p {
    color: white !important;
  }
  .tech-conference-card p.text-gray-500 {
    color: rgba(255, 255, 255, 0.9) !important;
  }
`;



const TopEventRowSkeleton = () => (
  <div className="grid grid-cols-[40px,minmax(300px,2fr),minmax(180px,1.5fr),minmax(100px,1fr),minmax(120px,1fr),minmax(100px,1fr)] gap-8 items-center px-4 py-4 rounded-lg animate-pulse">
    <div className="w-4 h-4 bg-gray-200 rounded mx-auto"></div>
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-gray-200 rounded-md"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
  </div>
);

// Community section images
const communityMusicImage = '/images/Community card 1.png';
const communityFoodImage = '/images/Community card 2.png';
const communityArtImage = '/images/Community card 4.png';
const communityTechImage = '/images/Community card 5.png';
const communitySportsImage = '/images/Community card 6 (1).png';
const communityFashionImage = '/images/Community card 8.png';
const communityGamingImage = '/images/Community card 9.png';
const communityHealthImage = '/images/Community card 7.png';
const communityEducationImage = '/images/Community card 10.png';
const communityTravelImage = '/images/Community card 11.png';

interface HeroSlideProps {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  videoSrc: string;
  videoSources?: string[];
  shadowColor?: string;
  bgColor?: string;
  backgroundImage?: string;
  textColor?: string;
  className?: string;
  isFirstSlide?: boolean;
  isSecondSlide?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const HeroSlide: React.FC<HeroSlideProps> = ({
  title,
  description,
  ctaText,
  ctaLink,
  videoSrc,
  videoSources = [],
  shadowColor,
  bgColor,
  backgroundImage,
  textColor = '',
  className = '',
  isFirstSlide = false,
  isSecondSlide = false,
  videoClassName = '',
  onSwipeLeft,
  onSwipeRight,
  isActive = false,
  eyebrow,
  eyebrowColor
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const minSwipeDistance = 50; // Minimum distance to consider it a swipe

  const hasMultiple = videoSources && videoSources.length > 0;
  const activeSrc = hasMultiple ? videoSources[currentVideoIndex] : videoSrc;

  const defaultPosition = videoClassName.includes('object-[15%_center]') ? '15% center' : 'center';
  const [objectPos, setObjectPos] = useState<string>(defaultPosition);

  // Keep objectPos in sync when defaultPosition/activeSrc changes
  useEffect(() => {
    setObjectPos(defaultPosition);
  }, [activeSrc, defaultPosition]);

  // Reset video index and handle playback based on active status
  useEffect(() => {
    if (isActive) {
      setCurrentVideoIndex(0);
      if (videoRef.current) {
        videoRef.current.currentTime = homepageHeroVideoTimes[activeSrc] || 0;
        videoRef.current.play().catch(err => {
          console.log("Video play interrupted/prevented:", err);
        });
      }
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [isActive]);

  // Handle playing next video sequence when current changes
  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.log("Video play interrupted/prevented on src change:", err);
      });
    }
  }, [activeSrc, isActive]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0); // Reset touch end position
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeRight) {
      onSwipeRight();
    } else if (isRightSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
  };

  const handleVideoEnded = () => {
    if (hasMultiple) {
      setCurrentVideoIndex((prev) => (prev + 1) % videoSources.length);
    }
  };

  // Listen to video time updates to dynamically shift positioning
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const time = video.currentTime;
    const src = video.currentSrc || activeSrc;
    homepageHeroVideoTimes[activeSrc] = time;

    // Check if we are on the third slide videos
    if (src.includes('accepttips_encode4.mp4')) {
      // In accepttips_encode4, mouse clicks are typically in the center-right from ~4s to ~19s
      if (time >= 4 && time <= 19) {
        setObjectPos('center');
      } else {
        setObjectPos('15% center');
      }
    } else if (src.includes('tipping1.mp4')) {
      // In tipping1, the tipping sheet and payment confirmation is on center-right from ~3.5s to ~20s
      if (time >= 3.5 && time <= 20) {
        setObjectPos('center');
      } else {
        setObjectPos('15% center');
      }
    } else {
      // For all other videos, respect defaultPosition
      setObjectPos(defaultPosition);
    }
  };

  return (
    <div
      className={`relative rounded-2xl w-[95vw] max-w-[95vw] md:w-[92vw] md:max-w-[92vw] lg:w-[95vw] lg:max-w-[95vw] flex items-start justify-center overflow-hidden bg-gray-100 mt-20 mx-auto py-0 md:py-16 lg:py-20 xl:py-24 ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background - Image for all slides */}
      <div className="absolute inset-0 w-full h-full">
        {isFirstSlide ? (
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: 'url(/images/OC%2011.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        ) : (
          <>
            {backgroundImage && (
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  backgroundImage: `url(${backgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
            )}
            {bgColor && (
              <>
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    background: bgColor,
                    opacity: backgroundImage ? 0.6 : 1 // Slightly transparent if there's a background image
                  }}
                />
                <div
                  className="absolute inset-0 w-full h-full pointer-events-none mix-blend-overlay"
                  style={{
                    background: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E\")"
                  }}
                />
              </>
            )}
            {!backgroundImage && !bgColor && shadowColor && (
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: `linear-gradient(135deg, ${shadowColor.replace('0.4', '0.1')}, ${shadowColor.replace('0.4', '0.3')})`
                }}
              />
            )}
          </>
        )}
      </div>

      <div className={`w-full relative z-20 ${textColor}`}>
        <div className="flex flex-col lg:flex-row items-center justify-center pt-8 lg:pt-0 mx-auto w-full max-w-[calc(620px+550px+6rem)] gap-8 lg:gap-16 px-4 sm:px-6 lg:px-8 pb-8 lg:pb-0">
          {/* Video Column - Responsive size */}
          <div className="w-full lg:w-auto flex justify-center">
            <div className="w-full max-w-[620px] h-[40vh] md:h-[50vh] lg:h-[70vh] min-w-0 animate-slide-up transition-all duration-500" style={{
              width: 'min(100%, max(350px, calc(100vw - 100px)))' // Adjusted for better tablet display
            }}>
              <video
                ref={videoRef}
                key={activeSrc}
                autoPlay
                preload="auto"
                loop={!hasMultiple}
                muted
                playsInline
                onEnded={handleVideoEnded}
                onTimeUpdate={handleTimeUpdate}
                className={`w-full h-full object-cover rounded-2xl overflow-hidden ${videoClassName.replace('object-[15%_center]', '')}`}
                style={{
                  objectPosition: objectPos,
                  transition: 'object-position 0.8s ease-in-out',
                  boxShadow: shadowColor 
                    ? `0 10px 40px -5px ${shadowColor}` 
                    : '0 8px 30px rgba(0, 0, 0, 0.15)'
                }}
              >
                <source src={activeSrc} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Content Column - Fixed max width with min-width */}
          <div className="w-full lg:min-w-[350px] max-w-[550px] lg:max-w-[650px] text-center lg:text-left">
            {eyebrow && (
              <div 
                className="hidden md:block text-sm md:text-base font-semibold mb-2 md:mb-3 animate-fade-in"
                style={{ color: eyebrowColor || '#F59E0B' }}
              >
                {eyebrow}
              </div>
            )}
            <h1 className={`text-2xl ${title.length > 35 ? 'md:text-[26px] lg:text-[30px]' : 'md:text-[36px]'} font-extrabold mb-4 md:mb-6 leading-tight text-white`}>
              {isFirstSlide ? (
                <>
                  <span className="md:hidden">Go Live With Amptive</span>
                  <span className="hidden md:inline">
                    Earn Money From Your Live Audio Through Direct Monetization And Gifting.
                  </span>
                </>
              ) : isSecondSlide ? (
                <>
                  <span className="md:hidden">Launch Ticketed Events</span>
                  <span className="hidden md:inline">{title}</span>
                </>
              ) : (
                <>
                  <span className="md:hidden">One Link. Endless Support.</span>
                  <span className="hidden md:inline">{title}</span>
                </>
              )}
            </h1>
            <p className="text-[14px] md:text-[16px] font-semibold text-white mb-6 md:mb-8">
              {isFirstSlide ? (
                <span>
                  Join communities, attend unforgettable events, support creators, & earn rewards.
                </span>
              ) : isSecondSlide ? (
                <>
                  <span className="md:hidden" dangerouslySetInnerHTML={{
                    __html: 'Reach more attendees, track sales, <br> and deliver a smooth ticketing experience.'
                  }} />
                  <span className="hidden md:inline">
                    {description}
                  </span>
                </>
              ) : (
                <>
                  <span className="md:hidden">Create your Amptive Support Card and start receiving gifts and tips.</span>
                  <span className="hidden md:inline">{description}</span>
                </>
              )}
            </p>

            {/* Button */}
            <div className="flex justify-center lg:justify-start">
              <Link
                to={ctaLink}
                className="bg-white text-black px-6 md:px-8 py-3 md:py-4 rounded-full font-bold text-sm md:text-base hover:bg-gray-100 transition-all duration-200 inline-block"
              >
                {ctaText}
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// Move slides data outside the component to avoid recreation on each render
interface SlideData {
  title: string;
  mobileTitle?: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  videoSrc: string;
  videoSources?: string[];
  shadowColor?: string;
  isFirstSlide?: boolean;
  isSecondSlide?: boolean;
  videoClassName?: string;
  backgroundImage?: string;
  bgColor?: string;
}

const SLIDES: SlideData[] = [
  {
    title: "Earn Money From Your Live Audio Through Direct Monetization And Gifting.",
    mobileTitle: "Go Live With Amptive",
    description: "Join communities, attend unforgettable events, support creators, & earn rewards.",
    ctaText: "Join Waitlist",
    ctaLink: "/waitlist",
    videoSrc: new URL('../assets/949_720x60_shots_so.mp4', import.meta.url).href,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    isFirstSlide: true
  },
  {
    title: "Launch, Sell, And Manage Your Physical Event Tickets With Ease.",
    description: "Reach more attendees, track sales, and deliver a smooth ticketing experience from start to finish.",
    ctaText: "Launch event",
    ctaLink: "/events",
    videoSrc: '/videos/1v1ce11.mp4',
    videoClassName: "object-[15%_center]",
    bgColor: "#4E5D26",
    isSecondSlide: true
  },
  {
    title: "Create Your Amptive Support Card & Start Earning Tips",
    description: "As a business, creator, or event organizer, Amptive's support feature provides your audience with an easy way to support your work anytime and anywhere",
    ctaText: "Accept Gifts",
    ctaLink: "/profile/support-setup",
    videoSrc: '/videos/accepttips_encode4.mp4',
    videoSources: ['/videos/accepttips_encode4.mp4', '/videos/tipping1.mp4'],
    videoClassName: "object-[15%_center]",
    bgColor: "#6A4A76",
    eyebrow: "One link. Endless support.",
    eyebrowColor: "#FDE047"
  }
];

const Homepage: React.FC = () => {
  useSEO({
    title: 'Amptive - From Ticket to Tip$ | Create, Stream, Earn',
    description: 'More than live audio sessions. Create engaging shows, events, and meetings with built-in ticketing and tipping. Grow your audience and earn from every session.',
    keywords: 'amptive, creators, events, communities, support, tickets, connect, invest',
  });

  // Add styles for tech-conference-card
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = techConferenceCardStyles;
    document.head.appendChild(styleTag);

    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  // Initialize navigation
  const navigate = useNavigate();

  // User state from AuthContext
  const { user } = useAuth();

  // Blog state
  const [blogPosts, setBlogPosts] = useState<any[]>(() => homepageBlogCache?.data || []);
  const [loadingBlog, setLoadingBlog] = useState(() => !homepageBlogCache?.data);

  // Fetch latest blog posts on mount
  useEffect(() => {
    const fetchLatestBlogPosts = async () => {
      const cached = homepageBlogCache;
      if (cached) {
        setBlogPosts(cached.data);
        setLoadingBlog(false);

        if (Date.now() - cached.timestamp < HOMEPAGE_CACHE_TTL) {
          return;
        }
      } else {
        setLoadingBlog(true);
      }

      try {
        const response = await getPublishedPosts({ page_size: 6 });
        const apiPosts = response.posts || [];
        
        let mapped = apiPosts.map(apiPost => {
          const category = apiPost.tags?.[0]?.name || 'General';
          
          const categoryColors: Record<string, string> = {
            'Events': '#22c55e',
            'Insights': '#f59e0b',
            'Amptive': '#3b82f6',
            'Product': '#8b5cf6',
            'Community': '#ec4899',
            'General': '#64748b'
          };
          
          let formattedDate = 'Recent';
          try {
            if (apiPost.created_at) {
              formattedDate = new Date(apiPost.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
          } catch (e) {
            // ignore
          }

          return {
            id: apiPost.id,
            slug: apiPost.slug,
            title: apiPost.title,
            category: category.toUpperCase(),
            image: apiPost.featured_image_url || '/images/Overview.png',
            date: formattedDate,
            color: categoryColors[category] || '#3b82f6',
            content: apiPost.content,
            excerpt: apiPost.excerpt
          };
        });

        if (mapped.length === 0) {
          const fallbackPosts = staticBlogPosts.slice(0, 6);
          homepageBlogCache = { data: fallbackPosts, timestamp: Date.now() };
          setBlogPosts(fallbackPosts);
        } else {
          if (mapped.length < 6) {
            const staticSlice = staticBlogPosts.slice(mapped.length, 6);
            mapped = [...mapped, ...staticSlice];
          }
          homepageBlogCache = { data: mapped, timestamp: Date.now() };
          setBlogPosts(mapped);
        }
      } catch (err) {
        console.error('Error fetching blog posts for homepage:', err);
        const fallbackPosts = staticBlogPosts.slice(0, 6);
        homepageBlogCache = { data: fallbackPosts, timestamp: Date.now() };
        setBlogPosts(fallbackPosts);
      } finally {
        setLoadingBlog(false);
      }
    };

    fetchLatestBlogPosts();
  }, []);

  // State for filter dropdowns
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [userCountry, setUserCountry] = useState('Loading...');
  const [showAllTopEvents, setShowAllTopEvents] = useState(false);
  const [filters, setFilters] = useState({
    country: 'Loading...',
    status: 'ALL',
    priceRange: { min: '', max: '' },
    dateRange: { start: '', end: '' },
  });

  // State for active tab in Trending section
  const [activeTab, setActiveTab] = useState<'shows' | 'events'>('shows');
  const [filteredEvents, setFilteredEvents] = useState<EventType[]>(() => homepageEventsCache?.data || []);
  const [dbEvents, setDbEvents] = useState<EventType[]>(() => homepageEventsCache?.data || []);
  const [loadingEvents, setLoadingEvents] = useState(() => !homepageEventsCache?.data);
  const [communities, setCommunities] = useState<Community[]>(() => homepageCommunitiesCache?.data || []);
  const [loadingCommunities, setLoadingCommunities] = useState(() => !homepageCommunitiesCache?.data);

  // Get user's country on component mount
  useEffect(() => {
    const fetchUserCountry = async () => {
      try {
        // const response = await fetch('https://ipapi.co/json/');
        // const data = await response.json();
        const data = { country_name: 'Nigeria' };
        setUserCountry(data.country_name || 'Nigeria');
        setFilters(prev => ({
          ...prev,
          country: data.country_name || 'Nigeria'
        }));
      } catch (error) {
        console.error('Error fetching user country:', error);
        setUserCountry('Nigeria');
        setFilters(prev => ({
          ...prev,
          country: 'Nigeria'
        }));
      }
    };

    fetchUserCountry();
  }, []);

  // Fetch events from database
  useEffect(() => {
    const fetchEvents = async () => {
      const cached = homepageEventsCache;
      if (cached) {
        setDbEvents(cached.data);
        setFilteredEvents(cached.data);
        setLoadingEvents(false);

        if (Date.now() - cached.timestamp < HOMEPAGE_CACHE_TTL) {
          return;
        }
      } else {
        setLoadingEvents(true);
      }

      try {
        const eventsData = await listEvents({ page_size: 20 });
        
        // Fetch tickets for all events to handle multiple prices correctly
        const eventsWithTickets = await Promise.all((eventsData || []).map(async (event: any) => {
          try {
            const tickets = await getTicketsForEvent(event.event_id);
            return { ...event, tickets };
          } catch {
            return { ...event, tickets: [] };
          }
        }));

        // Transform database events to match EventType interface
        const transformedEvents: EventType[] = eventsWithTickets.map((event: any) => {
          const tickets = event.tickets || [];
          let finalPrice: number | any[] = 0;
          
          if (tickets.length > 0) {
            const availableTickets = tickets.filter((t: any) => !isTicketSoldOut(t));
            
            // If all tickets are sold out, we can just pass tickets since the card will override and display 'Sold Out'
            finalPrice = availableTickets.length > 0 ? availableTickets : tickets;
          } else {
            const rawPrice = event.price_from;
            finalPrice = rawPrice != null ? Number(rawPrice) : 0;
          }

          let isSoldOut = false;
          if (tickets.length > 0) {
            isSoldOut = tickets.every((t: any) => isTicketSoldOut(t));
          } else {
            isSoldOut = event.is_sold_out;
          }

          const hasEarlyBirdOnSale = tickets.some((ticket: any) => (
            !isTicketSoldOut(ticket) &&
            getTicketEarlyBirdRemaining(ticket) > 0 &&
            getTicketUnitPrice(ticket) < (Number(ticket.price) || 0)
          ));
          const availableTickets = tickets.filter((ticket: any) => !isTicketSoldOut(ticket));
          const remainingCounts = availableTickets
            .map((ticket: any) => getTicketRemaining(ticket))
            .filter((count: number | null): count is number => count !== null);
          const totalRemaining = remainingCounts.reduce((sum, count) => sum + count, 0);
          const totalCapacity = availableTickets.reduce((sum: number, ticket: any) => {
            const total = Number(ticket.quantity_total ?? ticket.quantity ?? ticket.capacity ?? ticket.total_quantity ?? 0);
            return sum + (Number.isFinite(total) ? total : 0);
          }, 0);
          const isAlmostSoldOut = !isSoldOut && remainingCounts.length > 0 && totalRemaining > 0 && (
            totalRemaining <= 10 || (totalCapacity > 0 && totalRemaining / totalCapacity <= 0.2)
          );

          return {
            id: event.event_id,
            title: event.title,
            location: (event.venue?.venue_type === 'virtual' || event.location?.type === 'online' || (event as any).is_online || (event as any).is_virtual || !(event.venue?.name || event.location?.venue || event.location?.city) || event.venue?.name === 'TBD' || event.location?.venue === 'TBD') ? 'Amptive App' : (event.venue?.name || event.location?.venue || event.location?.city),
            country: event.venue?.city || event.location?.city || 'Nigeria',
            ticket_status: isSoldOut ? 'Sold Out' : 'On Sale',
            price: finalPrice,
            date: event.scheduled_for ? new Date(event.scheduled_for).toISOString() : '',
            media: {
              type: 'image' as const,
              src: event.thumbnail_url,
              alt: event.title
            },
            hasEarlyBirdOnSale,
            isAlmostSoldOut
          };
        });
        homepageEventsCache = { data: transformedEvents, timestamp: Date.now() };
        setDbEvents(transformedEvents);
        setFilteredEvents(transformedEvents);
        setLoadingEvents(false);
      } catch (error) {
        console.error('Unexpected error fetching events:', error);
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  // Fetch communities
  useEffect(() => {
    const fetchCommunities = async () => {
      const cached = homepageCommunitiesCache;
      if (cached) {
        setCommunities(cached.data);
        setLoadingCommunities(false);

        if (Date.now() - cached.timestamp < HOMEPAGE_CACHE_TTL) {
          return;
        }
      } else {
        setLoadingCommunities(true);
      }

      try {
        const data = await listCommunities({ page_size: 20 });        
        homepageCommunitiesCache = { data, timestamp: Date.now() };
        setCommunities(data);
      } catch (error) {
        console.error('Error fetching communities:', error);
      } finally {
        setLoadingCommunities(false);
      }
    };
    fetchCommunities();
  }, []);


  // Data for Trending section
  const trendingData: { [key: string]: any[] } = {
    shows: [
      {
        id: 1,
        title: "We Can Do Hard Things",
        description: "Life is freaking hard. We are hard. Let's get through it together. Join Glennon Doyle and her sister Amanda as they discuss hard things and how to survive them.",
        image: '/images/we-can-do-hard-things.jpeg',
        gradient: 'linear-gradient(135deg, #8B3A3A 0%, #CD5C5C 50%, #D2691E 100%)',
        avatars: ['https://i.pravatar.cc/150?img=1', 'https://i.pravatar.cc/150?img=2', 'https://i.pravatar.cc/150?img=3'],
        buttonText: 'Subscribe'
      },
      {
        id: 2,
        title: "I Said What I Said",
        description: "Unfiltered conversations about life, love, and everything in between. No topic is off limits.",
        image: '/images/i-said-what-i-said.jpg',
        gradient: 'linear-gradient(135deg, #4C1D1D 0%, #7F1D1D 50%, #B91C1C 100%)',
        avatars: ['https://i.pravatar.cc/150?img=32', 'https://i.pravatar.cc/150?img=33'],
        buttonText: 'Join Live'
      },
      {
        id: 3,
        title: "Still Processing",
        description: "Join the conversation about culture, technology, and everything in between with hosts Jenna Wortham and Wesley Morris.",
        image: '/images/still processing.jpg',
        gradient: 'linear-gradient(135deg, #4A2D5A 0%, #6A3F7A 50%, #8A5E9B 100%)',
        avatars: ['https://i.pravatar.cc/150?img=34', 'https://i.pravatar.cc/150?img=35'],
        buttonText: 'Add to Calendar'
      },
      {
        id: 4,
        title: "The Honest Bunch",
        description: "A group of friends having honest conversations about life, relationships, and personal growth.",
        image: '/images/honnest bunch.jpeg',
        gradient: 'linear-gradient(135deg, #556B2F 0%, #6B8E23 100%)',
        avatars: ['https://i.pravatar.cc/150?img=36', 'https://i.pravatar.cc/150?img=37', 'https://i.pravatar.cc/150?img=38'],
        buttonText: 'One-Time Access'
      }
    ],
    events: [
      {
        id: 5,
        title: "Figma Config 2025",
        description: "The biggest tech conference of the year featuring industry leaders and innovative startups.",
        image: '/images/config.jpeg',
        gradient: 'linear-gradient(135deg, #825B90 0%, #7E41B9 100%)',
        avatars: ['/images/config.jpg'],
        buttonText: 'Get Tickets'
      },
      {
        id: 6,
        title: "Liquidium Festival",
        description: "A weekend of amazing music, food, and good vibes with your favorite artists.",
        image: '/images/liquidium.jpg',
        gradient: 'linear-gradient(to bottom, #1A4D00 0%, #37A400 100%)',
        avatars: ['https://i.pravatar.cc/150?img=8', 'https://i.pravatar.cc/150?img=9'],
        buttonText: 'Add to Calendar'
      },
      {
        id: 7,
        title: "Food & Wine Expo",
        description: "Experience the finest culinary delights and wines from around the world.",
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
        gradient: 'linear-gradient(135deg, #B91C1C 0%, #F87171 100%)',
        avatars: ['https://i.pravatar.cc/150?img=10', 'https://i.pravatar.cc/150?img=11', 'https://i.pravatar.cc/150?img=12'],
        buttonText: 'Join Live'
      },
      {
        id: 8,
        title: "Startup Pitch Night",
        description: "Witness innovative startups pitch their ideas to a panel of investors.",
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
        gradient: 'linear-gradient(135deg, #047857 0%, #10B981 100%)',
        avatars: ['https://i.pravatar.cc/150?img=13', 'https://i.pravatar.cc/150?img=14'],
        buttonText: 'Get Tickets'
      }
    ]
  };

  // Sample events data
  // const events = [
  //   {
  //     id: 1,
  //     title: "Karaoke Traffic Vibes",
  //     location: "Lekki Phase 1, Lagos",
  //     country: "Nigeria",
  //     status: "Upcoming",
  //     price: [
  //       { type: 'Regular', price: 5000 },
  //       { type: 'VIP', price: 10000 },
  //       { type: 'VVIP', price: 20000 }
  //     ],
  //     date: "2025-07-12T20:00:00",
  //     media: {
  //       type: 'image' as const,
  //       src: karaImage,
  //       alt: 'Karaoke Traffic Vibes'
  //     } as MediaSource
  //   },
  //   {
  //     id: 2,
  //     title: "Clinton Flames",
  //     location: "Victoria Island, Lagos",
  //     country: "Nigeria",
  //     status: "Upcoming",
  //     price: 10000,
  //     date: "2025-07-13T19:30:00",
  //     media: {
  //       type: 'image' as const,
  //       src: 'https://www.shazam.com/mkimage/image/thumb/AMCArtistImages116/v4/7d/b1/4f/7db14f51-0978-2d7e-9add-f0d205bae318/883bda85-96d8-4515-a288-31e25bd8f216_ami-identity-b4d7093c3e0926436905c4b9df9223c0-2023-03-24T20-43-10.454Z_cropped.png/1552x1552bb.webp',
  //       alt: 'Clinton Flames'
  //     } as MediaSource
  //   },
  //   {
  //     id: 3,
  //     title: "1analog Girl",
  //     location: "Ikeja, Lagos",
  //     country: "Nigeria",
  //     status: "Sold Out",
  //     price: 0, // Price is 0 for sold out events
  //     date: "2025-07-07T22:00:00",
  //     media: {
  //       type: 'gif' as const,
  //       src: '/images/GIF promo (1mouth analog) v2.gif',
  //       alt: '1analog Girl',
  //       autoplay: true,
  //       loop: true
  //     } as MediaSource
  //   },
  //   {
  //     id: 4,
  //     title: "Reekado Banks Live In Abuja",
  //     location: "Garki, Abuja",
  //     country: "Nigeria",
  //     status: "Registration Open",
  //     price: [
  //       { type: 'Early Bird', price: 2000 },
  //       { type: 'Regular', price: 5000 },
  //       { type: 'VIP', price: 10000 }
  //     ],
  //     date: "2025-07-20T21:00:00",
  //     media: {
  //       type: 'image' as const,
  //       src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1744053819/lv7lfpukvpotznvykopf.webp',
  //       alt: 'Reekado Banks Live In Abuja'
  //     } as MediaSource
  //   },
  //   {
  //     id: 5,
  //     title: "House Party/pool Party",
  //     location: "Ikoyi, Lagos",
  //     country: "Nigeria",
  //     status: "Sold Out",
  //     price: 0, // Price is 0 for sold out events
  //     date: "2025-07-07T23:30:00",
  //     media: {
  //       type: 'image' as const,
  //       src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751906823/yflortvspnhc5idiol9t.webp',
  //       alt: 'House Party/pool Party'
  //     } as MediaSource
  //   },
  //   {
  //     id: 6,
  //     title: "Afrobeat Night Live",
  //     location: "Yaba, Lagos",
  //     country: "Nigeria",
  //     status: "Upcoming",
  //     price: [
  //       { type: 'Early Bird', price: 3000 },
  //       { type: 'Regular', price: 5000 },
  //       { type: 'VIP', price: 8000 }
  //     ],
  //     date: "2025-07-25T21:00:00",
  //     media: {
  //       type: 'image' as const,
  //       src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1752002405/mgoz620c4yjyeb0xa6hd.webp',
  //       alt: 'Afrobeat Night Live',
  //     } as MediaSource
  //   },
  //   {
  //     id: 7,
  //     title: "Tech Conference 2025",
  //     location: "Maitama, Abuja",
  //     country: "Nigeria",
  //     status: "Sold Out",
  //     price: 0, // Price is 0 for sold out events
  //     date: "2025-08-05T09:00:00",
  //     media: {
  //       type: 'image' as const,
  //       src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751984779/nlhtme0suacdfjyypc8s.webp',
  //       alt: 'Tech Conference 2025',
  //     } as MediaSource
  //   },
  //   {
  //     id: 8,
  //     title: "Art Exhibition",
  //     location: "Wuse, Abuja",
  //     country: "Nigeria",
  //     status: "Upcoming",
  //     price: 0,
  //     date: "2025-07-30T10:00:00",
  //     media: {
  //       type: 'image' as const,
  //       src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751961673/yzh40wdpkykt96kogcam.webp',
  //       alt: 'Art Exhibition',
  //     } as MediaSource
  //   },
  //   {
  //     id: 9,
  //     title: "Food Festival",
  //     location: "GRA, Port Harcourt",
  //     country: "Nigeria",
  //     status: "Live Now",
  //     price: [
  //       { type: 'Tasting Pass', price: 5000 },
  //       { type: 'VIP Experience', price: 15000 }
  //     ],
  //     date: "2025-07-10T12:00:00",
  //     media: {
  //       type: 'image' as const,
  //       src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751961662/ltctlgwlgfma1hzlfs1q.webp',
  //       alt: 'Food Festival',
  //     } as MediaSource
  //   },
  //   {
  //     id: 10,
  //     title: "Jazz Night",
  //     location: "GRA, Ilorin",
  //     country: "Nigeria",
  //     status: "Upcoming",
  //     price: [
  //       { type: 'Standard', price: 7000 },
  //       { type: 'VIP', price: 12000 }
  //     ],
  //     date: "2025-08-15T20:00:00",
  //     media: {
  //       type: 'image' as const,
  //       src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751666040/dzit74ibwfmtpuwfexme.webp',
  //       alt: 'Jazz Night',
  //     } as MediaSource
  //   },
  //   {
  //     id: 11,
  //     title: "Amptive Live Session",
  //     location: "Amptive",
  //     country: "Global",
  //     status: "Live Now",
  //     price: 0,
  //     date: "2025-07-17T20:00:00",
  //     media: {
  //       type: 'image' as const,
  //       src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751666040/dzit74ibwfmtpuwfexme.webp',
  //       alt: 'Amptive Live Session',
  //     } as MediaSource
  //   }
  // ];

  // Initialize filtered events with database events
  useEffect(() => {
    if (!loadingEvents && dbEvents.length > 0) {
      console.log('Initializing filteredEvents with dbEvents:', dbEvents.length);
      setFilteredEvents(dbEvents);
    }
  }, [dbEvents, loadingEvents]);

  // Filter events based on filters
  const applyFilters = () => {
    let result = [...dbEvents];

    // Filter by status
    if (filters.status === 'Ticket on sale') {
      // Show only events that are not sold out
      result = result.filter(event => event.ticket_status !== 'Sold Out');
    }
    // If status is 'ALL', show all events including sold out

    // Filter by country
    if (filters.country) {
      result = result.filter(event =>
        event.country.toLowerCase().includes(filters.country.toLowerCase())
      );
    }

    // Filter by price range
    if (filters.priceRange.min || filters.priceRange.max) {
      const minPrice = filters.priceRange.min ? parseFloat(filters.priceRange.min) : 0;
      const maxPrice = filters.priceRange.max ? parseFloat(filters.priceRange.max) : Infinity;

      result = result.filter(event => {
        const eventPrice = Array.isArray(event.price)
          ? Math.min(...event.price.map(p => p.price))
          : event.price;
        return eventPrice >= minPrice && eventPrice <= maxPrice;
      });
    }

    // Filter by date range
    if (filters.dateRange.start || filters.dateRange.end) {
      const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
      const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;

      if (startDate) {
        startDate.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      result = result.filter(event => {
        const eventDate = new Date(event.date);
        if (startDate && endDate) {
          return eventDate >= startDate && eventDate <= endDate;
        } else if (startDate) {
          return eventDate >= startDate;
        } else if (endDate) {
          return eventDate <= endDate;
        }
        return true;
      });
    }

    setFilteredEvents(result);
    setIsFilterOpen(false);
  };

  const handleFilterChange = (field: 'country' | 'status' | 'priceRange' | 'dateRange', value: any) => {
    if (field === 'priceRange' || field === 'dateRange') {
      setFilters(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          ...value
        }
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      country: userCountry,
      status: 'ALL',
      priceRange: { min: '', max: '' },
      dateRange: { start: '', end: '' },
    });
    setFilteredEvents(dbEvents);
  };

  // Close filter when clicking outside
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };
  // State for carousel
  const [currentSlide, setCurrentSlide] = useState(() => homepageHeroSlide);
  const [isPaused, setIsPaused] = useState(false);
  const [progressBars, setProgressBars] = useState<number[]>(Array(SLIDES.length).fill(0));
  const sliderRef = useRef<HTMLDivElement>(null);
  const upcomingEventsScrollRef = useRef<HTMLDivElement>(null);
  const upcomingMobileEventsScrollRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const resumeTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    homepageHeroSlide = currentSlide;
  }, [currentSlide]);

  // Handle slide change
  const goToSlide = (index: number) => {
    // Only reset the current slide's progress when navigating directly to a specific slide
    setProgressBars(prev => {
      const newProgress = [...prev];
      newProgress[currentSlide] = 0; // Reset current slide's progress
      return newProgress;
    });
    setCurrentSlide(index);
  };

  // Go to next slide
  const nextSlide = () => {
    // Reset current slide's progress before moving to the next
    setProgressBars(prev => {
      const newProgress = [...prev];
      newProgress[currentSlide] = 0; // Reset current slide's progress
      return newProgress;
    });

    // Move to next slide
    const nextSlideIndex = (currentSlide + 1) % SLIDES.length;
    setCurrentSlide(nextSlideIndex);
  };

  // Go to previous slide
  const prevSlide = () => {
    goToSlide((currentSlide - 1 + SLIDES.length) % SLIDES.length);
  };

  const scrollUpcomingEvents = (direction: 'left' | 'right') => {
    const container = window.innerWidth < 640
      ? upcomingMobileEventsScrollRef.current
      : upcomingEventsScrollRef.current;
    if (!container) return;

    container.scrollBy({
      left: direction === 'left' ? -360 : 360,
      behavior: 'smooth',
    });
  };

  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Define colors for each card with matching border colors
  const cardColors = [
    'bg-purple-50 border-purple-100',
    'bg-orange-50 border-orange-100',
    'bg-blue-50 border-blue-100',
    'bg-indigo-50 border-indigo-100',
    'bg-green-50 border-green-100',
    'bg-pink-50 border-pink-100',
    'bg-yellow-50 border-yellow-100',
    'bg-teal-50 border-teal-100',
    'bg-cyan-50 border-cyan-100',
    'bg-amber-50 border-amber-100'
  ];

  const checkScroll = () => {
    const container = cardsContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);

    // Find which card is most visible on the left
    const cards = container.querySelectorAll('.community-card');
    let mostVisibleIndex = 0;
    let maxVisibleArea = 0;
    const containerRect = container.getBoundingClientRect();

    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();

      // Calculate visible area
      const visibleLeft = Math.max(rect.left, containerRect.left);
      const visibleRight = Math.min(rect.right, containerRect.right);
      const visibleWidth = Math.max(0, visibleRight - visibleLeft);

      // If this card has more visible area than the current max, update
      if (visibleWidth > maxVisibleArea) {
        maxVisibleArea = visibleWidth;
        mostVisibleIndex = index;
      }
    });

    setActiveCardIndex(mostVisibleIndex);
  };

  const scrollCards = (direction: 'left' | 'right') => {
    if (!cardsContainerRef.current) return;

    const scrollAmount = direction === 'left' ? -300 : 300;
    cardsContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const container = cardsContainerRef.current;
    const handleResize = () => {
      checkScroll();
    };

    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', handleResize);
      // Initial check with a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        checkScroll();
      }, 100);

      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
      };
    }
  }, []);

  // Toggle pause state
  const togglePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);

    // Clear any pending resume timeout when manually toggling pause/play
    if (resumeTimeout.current) {
      clearTimeout(resumeTimeout.current);
      resumeTimeout.current = null;
    }

    // If pausing, don't schedule auto-resume
    if (newPausedState) return;

    // If unpausing, schedule the next auto-slide
    scheduleAutoResume();
  };

  // Schedule auto-resume of the slider
  const scheduleAutoResume = () => {
    // Clear any existing timeout
    if (resumeTimeout.current) {
      clearTimeout(resumeTimeout.current);
      resumeTimeout.current = null;
    }

    // Set a new timeout to resume auto-sliding after 5 seconds of inactivity
    resumeTimeout.current = setTimeout(() => {
      if (isPaused) {
        setIsPaused(false);
      }
    }, 5000); // 5 seconds delay before resuming
  };

  // Auto-advance slides with smooth progress
  useEffect(() => {
    // Clear any existing interval
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    if (isPaused) {
      return;
    }

    // Update progress every 50ms for smoother animation (30s total = 100%)
    progressInterval.current = setInterval(() => {
      setProgressBars(prev => {
        const newProgress = [...prev];
        const currentProgress = newProgress[currentSlide] + (100 / 600); // 0.167% every 50ms = 100% in 30s

        if (currentProgress >= 100) {
          // Move to next slide when current progress reaches 100%
          const nextSlide = (currentSlide + 1) % SLIDES.length;
          setCurrentSlide(nextSlide);
          return newProgress.fill(0); // Reset all progress bars
        }

        // Only update the current slide's progress
        newProgress[currentSlide] = currentProgress;
        return newProgress;
      });
    }, 50);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPaused, currentSlide]);

  // Handle slide change with smooth transition
  useEffect(() => {
    if (sliderRef.current) {
      // Force reflow to ensure smooth transition
      sliderRef.current.style.transition = 'transform 500ms ease-in-out';
    }

    // Cleanup function
    return () => {
      if (sliderRef.current) {
        sliderRef.current.style.transition = 'none';
      }
    };
  }, [currentSlide]);

  return (
    <div className="relative">
      {/* Hero Carousel */}
      <div className="relative w-full overflow-hidden group" style={{ zIndex: 1 }}>
        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="hidden md:flex absolute left-4 top-[55%] -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white hover:bg-white text-gray-800 items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-all duration-200 opacity-100 focus:outline-none"
          aria-label="Previous slide"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={nextSlide}
          className="hidden md:flex absolute right-4 top-[55%] -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white hover:bg-white text-gray-800 items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-all duration-200 opacity-100 focus:outline-none"
          aria-label="Next slide"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div
          ref={sliderRef}
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentSlide * 100}%)`,
            cursor: 'grab'
          }}
          onMouseDown={() => {
            // Pause auto-scroll when user starts dragging
            setIsPaused(true);
            // Schedule auto-resume after interaction
            scheduleAutoResume();
          }}
          onTouchStart={() => {
            // Pause auto-scroll when user starts swiping
            setIsPaused(true);
            // Schedule auto-resume after interaction
            scheduleAutoResume();
          }}
          onTouchEnd={() => {
            // Reset the auto-resume timer on touch end
            scheduleAutoResume();
          }}
          onMouseUp={() => {
            // Reset the auto-resume timer on mouse up
            scheduleAutoResume();
          }}
        >
          {SLIDES.map((slide, index) => (
            <div key={index} className="w-full flex-shrink-0">
              <HeroSlide
                title={slide.title}
                description={slide.description}
                ctaText={slide.ctaText}
                ctaLink={slide.isSecondSlide ? (user ? '/events/create' : '/login?redirect=/events/create') : slide.ctaLink}
                videoSrc={slide.videoSrc}
                videoSources={slide.videoSources}
                shadowColor={slide.shadowColor}
                backgroundImage={slide.backgroundImage}
                bgColor={slide.bgColor}
                isFirstSlide={slide.isFirstSlide}
                isSecondSlide={slide.isSecondSlide}
                onSwipeLeft={prevSlide}
                onSwipeRight={nextSlide}
                videoClassName={slide.videoClassName}
                isActive={index === currentSlide}
                eyebrow={slide.eyebrow}
                eyebrowColor={slide.eyebrowColor}
              />
            </div>
          ))}
        </div>

        {/* Progress Bar - Moved inside hero section but at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div
            className="h-full bg-white transition-all duration-1000 ease-linear"
            style={{
              width: isPaused ? '0%' : '100%',
              transitionDuration: isPaused ? '0s' : '30s',
              transitionTimingFunction: 'linear'
            }}
          />
        </div>
      </div>

      {/* Carousel Controls */}
      <div className="mt-4 flex items-center justify-center">
        {/* Play/Pause Button */}
        <button
          onClick={togglePause}
          className="group flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-black transition-all duration-200 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-black/50 focus:ring-opacity-50 mr-3"
          aria-label={isPaused ? 'Play' : 'Pause'}
        >
          {isPaused ? (
            <svg
              className="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </button>

        {/* Progress Bars */}
        <div className="flex items-center space-x-1">
          {SLIDES.map((_, index) => {
            const isActive = index === currentSlide;

            return (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className="relative h-1 w-16 overflow-hidden rounded-full bg-gray-200"
                aria-label={`Go to slide ${index + 1}`}
              >
                <div className="relative h-full w-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full transition-all duration-100 ease-linear"
                    style={{
                      backgroundColor: 'black',
                      width: isActive ? `${progressBars[index]}%` : '0%',
                      transitionDuration: isPaused || !isActive ? '0s' : '50ms',
                      transitionTimingFunction: 'linear',
                      opacity: isActive ? 1 : 0.5
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events Section */}
      <div className="w-[95vw] mx-auto mt-8 mb-4 bg-white px-4 py-6 sm:mt-12 sm:mb-6 sm:px-6 sm:py-8">
        <div className="flex justify-between items-center mb-5 sm:mb-8">
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="group inline-flex items-center gap-2 text-xl md:text-2xl font-bold text-black"
          >
            Upcoming Events
            <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5" />
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Previous events"
              onClick={() => scrollUpcomingEvents('left')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:h-11 sm:w-11"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next events"
              onClick={() => scrollUpcomingEvents('right')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-black transition-colors hover:bg-gray-200 sm:h-11 sm:w-11"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="hidden" ref={filterRef}>
            <button
              onClick={toggleFilter}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
              </svg>
              <span className="text-sm font-medium">Filter</span>
            </button>



            {/* Upcoming Events Filter Panel */}
            {isFilterOpen && (
              <div className="fixed inset-0 z-50 flex justify-end backdrop-blur-sm" onClick={() => setIsFilterOpen(false)}>
                <div
                  className="h-full w-full md:w-[380px] md:h-[95vh] bg-white flex flex-col overflow-y-auto md:rounded-2xl md:mt-[2.5vh] md:mr-4 md:drop-shadow-[-4px_0_15px_rgba(0,0,0,0.1)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header with search and close button */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <form className="relative flex-1 mr-2">
                      <input
                        type="text"
                        className="w-full px-4 py-2 pl-10 text-sm text-gray-700 bg-gray-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent"
                        placeholder="Search for events..."
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-search absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                      </svg>
                    </form>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFilterOpen(false);
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700"
                      aria-label="Close menu"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-x w-6 h-6"
                      >
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                      </svg>
                    </button>
                  </div>

                  <div className="py-4 bg-white px-4 space-y-4">
                    <h3 className="text-lg font-semibold mb-3">Country</h3>
                    <div className="relative">
                      <div className="relative group">
                        <div className="relative">
                          <select
                            value={filters.country}
                            onChange={(e) => handleFilterChange('country', e.target.value)}
                            className="w-full pl-4 pr-10 py-3 text-sm bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer shadow-sm hover:border-gray-300"
                          >
                            <option value="" className="text-gray-700">Select a country</option>
                            <option value="Amptive" className="text-gray-700">Amptive App</option>
                            <option value="Nigeria" className="text-gray-700">Nigeria</option>
                            <option value="United States" className="text-gray-700">United States</option>
                            <option value="United Kingdom" className="text-gray-700">United Kingdom</option>
                            <option value="Canada" className="text-gray-700">Canada</option>
                            <option value="Ghana" className="text-gray-700">Ghana</option>
                            <option value="South Africa" className="text-gray-700">South Africa</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price Range Filter */}
                    <div className="border-t border-gray-100 pt-4">
                      <h3 className="text-lg font-semibold mb-3">Price Range</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Min</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500">₦</span>
                            </div>
                            <input
                              type="number"
                              placeholder="Min"
                              value={filters.priceRange.min}
                              onChange={(e) => handleFilterChange('priceRange', { min: e.target.value })}
                              className="pl-8 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Max</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500">₦</span>
                            </div>
                            <input
                              type="number"
                              placeholder="Max"
                              value={filters.priceRange.max}
                              onChange={(e) => handleFilterChange('priceRange', { max: e.target.value })}
                              className="pl-8 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="border-t border-gray-100 pt-4">
                      <h3 className="text-lg font-semibold mb-3">Status</h3>
                      <div className="inline-flex p-1 bg-gray-100 rounded-full">
                        {['ALL', 'Ticket on sale'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleFilterChange('status', status)}
                            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${filters.status === status
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                              }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Range Filter */}
                    <div className="border-t border-gray-100 pt-4">
                      <h3 className="text-lg font-semibold mb-3">Date</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                          <div className="relative">
                            <div className="relative w-full">
                              <input
                                type="date"
                                value={filters.dateRange.start}
                                onChange={(e) => handleFilterChange('dateRange', { start: e.target.value })}
                                className="w-full pl-4 pr-10 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-text shadow-sm hover:border-gray-300 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <Calendar className="w-4 h-4 text-gray-500" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                          <div className="relative">
                            <div className="relative w-full">
                              <input
                                type="date"
                                value={filters.dateRange.end}
                                onChange={(e) => handleFilterChange('dateRange', { end: e.target.value })}
                                min={filters.dateRange.start}
                                className="w-full pl-4 pr-10 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-text shadow-sm hover:border-gray-300 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <Calendar className="w-4 h-4 text-gray-500" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer with action buttons */}
                  <div className="p-4 space-y-3 border-t border-gray-100">
                    <button
                      onClick={clearFilters}
                      className="w-full px-4 py-2.5 text-center text-base font-medium text-gray-800 hover:bg-gray-50 rounded-full border border-gray-200"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={applyFilters}
                      className="w-full px-4 py-2.5 text-center text-base font-bold text-white bg-black hover:bg-gray-800 rounded-full"
                    >
                      Show Results
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Events Grid - Horizontal scroll on desktop, single row */}
        <div className="relative">
          {/* Desktop/Tablet - Single row with horizontal scroll */}
          <div className="hidden sm:block">
            <div className="relative">
              {/* Left padding gradient */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-white/70 to-transparent z-10 pointer-events-none"></div>

              {/* Scrollable content */}
              <div ref={upcomingEventsScrollRef} className="hide-scrollbar overflow-x-auto pb-6">
                <div className="flex space-x-6 w-max min-w-full pr-4">
                  {loadingEvents ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={`desktop-skeleton-${i}`} className="w-72 flex-shrink-0">
                        <EventCardSkeleton />
                      </div>
                    ))
                  ) : filteredEvents.length > 0 ? (
                    filteredEvents.slice(0, 5).map(event => (
                      <div
                        key={event.id}
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="w-72 flex-shrink-0 cursor-pointer"
                      >
                        <EventCard
                          title={event.title}
                          location={event.location}
                          status={event.ticket_status}
                          price={event.price}
                          date={event.date}
                          media={event.media}
                          hasEarlyBirdOnSale={event.hasEarlyBirdOnSale}
                          isAlmostSoldOut={event.isAlmostSoldOut}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="w-full flex flex-col items-center justify-center py-12 col-span-full">
                      <div className="bg-gray-100 p-6 rounded-full mb-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No events found</h3>
                      <p className="text-gray-500 text-center max-w-md">Try adjusting your filters or check back later for new events.</p>
                      <button
                        onClick={clearFilters}
                        className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right padding gradient */}
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
            </div>

          </div>

          {/* Mobile Layout */}
          <div className="sm:hidden">
            {loadingEvents ? (
              <div className="-mx-2 hide-scrollbar overflow-x-auto px-4 pb-4">
                <div className="flex space-x-3 w-max">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`mob-skeleton-${i}`} className="w-[calc(50vw-1.5rem)] flex-shrink-0">
                      <EventCardSkeleton />
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredEvents.length > 0 ? (
              <>
                {/* Horizontal Scrollable Cards */}
                <div ref={upcomingMobileEventsScrollRef} className="-mx-4 hide-scrollbar overflow-x-auto px-4 pb-2">
                  <div className="flex space-x-3 w-max">
                    {filteredEvents.slice(0, 5).map((event, index) => (
                      <div
                        key={index}
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="w-[calc(50vw-1.5rem)] flex-shrink-0 cursor-pointer"
                      >
                        <EventCard
                          title={event.title}
                          location={event.location}
                          status={event.ticket_status}
                          price={event.price}
                          date={event.date}
                          media={event.media}
                          hasEarlyBirdOnSale={event.hasEarlyBirdOnSale}
                          isAlmostSoldOut={event.isAlmostSoldOut}
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </>
            ) : (
              <div className="p-6 text-center">
                <div className="bg-gray-100 p-6 rounded-full inline-flex mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No events found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or check back later for new events.</p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Events Section - Popular this Week */}
      <div className="w-[95vw] mx-auto mt-4 mb-12 bg-white px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/events?sort=popular')}
            className="group inline-flex items-center gap-2 text-[22px] font-bold text-black md:text-[24px]"
          >
            Popular this Week
            <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5" />
          </button>
          <div className="hidden items-center gap-3 sm:flex">
            <button
              type="button"
              aria-label="Previous events"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next events"
              onClick={() => navigate('/events?sort=popular')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-black transition-colors hover:bg-gray-200"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loadingEvents ? (
          <div className="grid gap-12 md:gap-16 lg:gap-24 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((colIndex) => (
              <div key={`col-skel-${colIndex}`} className="flex flex-col space-y-4">
                {[1, 2, 3].map((rowIndex) => (
                  <div key={`row-skel-${rowIndex}`} className="flex items-center gap-4 animate-pulse">
                    <div className="h-14 w-14 rounded-xl bg-gray-100 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-gray-100" />
                      <div className="h-3 w-1/2 rounded bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-sm font-medium text-gray-500 text-center">
            No upcoming events found
          </div>
        ) : (
          <div className="hide-scrollbar flex gap-6 md:gap-16 lg:gap-24 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0">
            {Array.from({ length: Math.ceil(Math.min(filteredEvents.length, 9) / 3) }).map((_, colIdx) => {
              const colEvents = filteredEvents.slice(colIdx * 3, colIdx * 3 + 3);
              return (
                <div key={`popular-col-${colIdx}`} className="w-[calc(100vw-3rem)] sm:w-auto shrink-0 snap-center flex flex-col justify-between">
                  {colEvents.map((event, rowIdx) => {
                    const globalRank = colIdx * 3 + rowIdx + 1;
                    const priceLabel = Array.isArray(event.price) && event.price.length > 0
                      ? (event.price.length === 1
                          ? (event.price[0].price > 0 ? `₦${event.price[0].price.toLocaleString()}` : 'Free')
                          : `From ₦${Math.min(...event.price.map((t: any) => t.price)).toLocaleString()}`
                        )
                      : (event.price && (event.price as number) > 0 ? `₦${Number(event.price).toLocaleString()}` : 'Free');

                    return (
                      <div key={event.id} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => navigate(`/events/${event.id}`)}
                          className="group flex items-center gap-3 md:gap-4 text-left py-3 px-1 hover:bg-gray-50/80 rounded-xl transition-colors min-w-0 w-full"
                        >
                          {/* Rank Numbering */}
                          <span className="w-6 md:w-7 text-center font-extrabold text-black text-lg md:text-xl shrink-0 select-none">
                            {globalRank}
                          </span>

                          {/* Square Cover Art */}
                          <div className="relative h-20 w-20 md:h-22 md:w-22 shrink-0 overflow-hidden rounded-lg md:rounded-xl bg-gray-100 shadow-xs">
                            {event.media?.src ? (
                              <img
                                src={event.media.src}
                                alt={event.media.alt || event.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-300">
                                <Calendar className="h-6 w-6" />
                              </div>
                            )}
                          </div>

                          {/* Metadata */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h3 className="truncate text-[15px] md:text-[16px] font-bold leading-snug text-gray-900 group-hover:text-black">
                                {event.title}
                              </h3>
                              {/* Early Bird SVG Orange Badge */}
                              {event.hasEarlyBirdOnSale && (
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
                            <p className="mt-0.5 truncate text-[13px] md:text-[14px] font-medium text-gray-500">
                              {event.location} · {priceLabel}
                            </p>
                          </div>
                        </button>

                        {/* Divider Line between items in the column */}
                        {rowIdx < colEvents.length - 1 && (
                          <div className="h-px bg-gray-200/80 my-1 w-[calc(100%+1.5rem)] md:w-[calc(100%+2.5rem)]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>



      {/* 3D Event Spotlight Carousel */}
      <EventSpotlightCarousel events={filteredEvents} loading={loadingEvents} />

      {/* Explore Topics Section */}
      <div className="w-[95vw] mx-auto mt-2 mb-10 bg-white px-4 py-6 sm:mt-4 sm:mb-12 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-center justify-between gap-4 sm:mb-7">
          <h2 className="text-xl font-bold leading-tight text-black md:text-2xl">Explore Communities</h2>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Previous communities"
              onClick={() => scrollCards('left')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:h-11 sm:w-11"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next communities"
              onClick={() => scrollCards('right')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-black transition-colors hover:bg-gray-200 sm:h-11 sm:w-11"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="overflow-hidden">
          <div
            ref={cardsContainerRef}
            className="hide-scrollbar flex gap-4 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {(loadingCommunities ? [
              { name: "Music", image: communityMusicImage },
              { name: "Food & Drink", image: communityFoodImage },
              { name: "Art & Culture", image: communityArtImage },
              { name: "Technology", image: communityTechImage },
              { name: "Sports", image: communitySportsImage },
              { name: "Fashion", image: communityFashionImage },
              { name: "Gaming", image: communityGamingImage },
              { name: "Health & Wellness", image: communityHealthImage },
              { name: "Education", image: communityEducationImage },
              { name: "Travel", image: communityTravelImage }
            ] : communities).slice(0, 10).map((community: any, index: number) => (
              <button
                key={community.community_id || index}
                type="button"
                onClick={() => {
                  if (community.community_id) {
                    navigate(`/community/${community.community_id}`);
                    return;
                  }
                  navigate('/community');
                }}
                className="community-card h-[172px] w-[240px] flex-shrink-0 overflow-hidden rounded-xl bg-white text-left transition-transform duration-200 ease-out hover:-translate-y-0.5 sm:h-[200px] sm:w-[280px]"
                data-index={index}
              >
                <img
                  src={community.image || communityMusicImage}
                  alt={community.name}
                  className="h-full w-full rounded-xl object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trending on Amptive Section */}
      <div className="w-[95vw] mx-auto my-12 bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h2 className="text-xl md:text-3xl font-bold text-gray-900">Trending on Amptive App</h2>
          <div className="flex space-x-1 bg-gray-100 p-0.5 rounded-full w-fit">
            <button
              onClick={() => setActiveTab('shows')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeTab === 'shows' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Shows
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeTab === 'events' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Events
            </button>
          </div>
        </div>

        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0">
          {trendingData[activeTab].map((item) => (
            <TrendingCard
              key={item.id}
              id={item.id}
              title={item.title}
              description={item.description}
              image={item.image}
              gradient={item.gradient}
              avatars={item.avatars}
              type={activeTab}
              buttonText={item.buttonText}
            />
          ))}
        </div>
      </div>

      {/* Latest Events Section - Hidden */}
      <div className="hidden w-[95vw] mx-auto my-12 bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6 px-3">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Latest Events</h2>
          <button
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            <span className="text-sm font-medium">Filter</span>
          </button>
        </div>

        <div className="-mx-4 px-4 overflow-x-auto pb-4">
          <div className="flex space-x-4 md:space-x-8 w-max">
            {/* Card 1 */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg overflow-hidden shadow-sm transition-colors border border-gray-200 hover:border-gray-300 text-sm">
                <div className="relative aspect-square bg-white px-2 pt-2 rounded-t-xl">
                  <img src="/images/kara.png" alt="Karaoke Traffic Vibes" className="w-full h-full object-cover rounded-lg" />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
                    <svg className="w-[1.2em] h-[1.2em] text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                    </svg>
                    <span>July 12, 2025</span>
                  </div>
                  <h3 className="text-[13px] font-semibold text-gray-900 mt-0.5 line-clamp-2">Karaoke Traffic Vibes</h3>
                  <div className="flex flex-col mb-2">
                    <span className="text-xs text-gray-500">Location</span>
                    <span className="font-medium text-sm text-gray-600">Lekki Phase 1, Lagos</span>
                  </div>
                  <div className="mt-1.5 w-full">
                    <div className="bg-blue-50 rounded-full py-1 px-3 text-center w-full">
                      <span className="font-bold text-xs text-blue-800">From ₦5,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg overflow-hidden shadow-sm transition-colors border border-gray-200 hover:border-gray-300 text-sm">
                <div className="relative aspect-square bg-white px-2 pt-2 rounded-t-xl">
                  <img
                    src="https://www.shazam.com/mkimage/image/thumb/AMCArtistImages116/v4/7d/b1/4f/7db14f51-0978-2d7e-9add-f0d205bae318/883bda85-96d8-4515-a288-31e25bd8f216_ami-identity-b4d7093c3e0926436905c4b9df9223c0-2023-03-24T20-43-10.454Z_cropped.png/1552x1552bb.webp"
                    alt="Clinton Flames"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
                    <svg className="w-[1.2em] h-[1.2em] text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                    </svg>
                    <span>July 13, 2025</span>
                  </div>
                  <h3 className="text-[13px] font-semibold text-gray-900 mt-0.5 line-clamp-2">Clinton Flames</h3>
                  <div className="flex flex-col mb-2">
                    <span className="text-xs text-gray-500">Location</span>
                    <span className="font-medium text-sm text-gray-600">Victoria Island, Lagos</span>
                  </div>
                  <div className="mt-1.5 w-full">
                    <div className="bg-blue-50 rounded-full py-1 px-3 text-center w-full">
                      <span className="font-bold text-xs text-blue-800">₦10,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg overflow-hidden shadow-sm transition-colors border border-gray-200 hover:border-gray-300 text-sm">
                <div className="relative aspect-square bg-white px-2 pt-2 rounded-t-xl">
                  <img
                    src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"
                    alt="1analog Girl"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
                    <svg className="w-[1.2em] h-[1.2em] text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                    </svg>
                    <span>July 7, 2025</span>
                  </div>
                  <h3 className="text-[13px] font-semibold text-gray-900 mt-0.5 line-clamp-2">1analog Girl</h3>
                  <div className="flex flex-col mb-2">
                    <span className="text-xs text-gray-500">Location</span>
                    <span className="font-medium text-sm text-gray-600">Ikeja, Lagos</span>
                  </div>
                  <div className="mt-1.5 w-full">
                    <div className="bg-blue-50 rounded-full py-1 px-3 text-center w-full">
                      <span className="font-bold text-xs text-blue-800">Free</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg overflow-hidden shadow-sm transition-colors border border-gray-200 hover:border-gray-300 text-sm">
                <div className="relative aspect-square bg-white px-2 pt-2 rounded-t-xl">
                  <img
                    src="https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1744053819/lv7lfpukvpotznvykopf.webp"
                    alt="Reekado Banks Live In Abuja"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
                    <svg className="w-[1.2em] h-[1.2em] text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                    </svg>
                    <span>Sunday</span>
                  </div>
                  <h3 className="text-[13px] font-semibold text-gray-900 mt-0.5 line-clamp-2">Reekado Banks Live In Abuja</h3>
                  <div className="flex flex-col mb-2">
                    <span className="text-xs text-gray-500">Location</span>
                    <span className="font-medium text-sm text-gray-600">Garki, Abuja</span>
                  </div>
                  <div className="mt-1.5 w-full">
                    <div className="bg-blue-50 rounded-full py-1 px-3 text-center w-full">
                      <span className="font-bold text-xs text-blue-800">From ₦2,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5 */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg overflow-hidden shadow-sm transition-colors border border-gray-200 hover:border-gray-300 text-sm">
                <div className="relative aspect-square bg-white px-2 pt-2 rounded-t-xl">
                  <img
                    src="https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753392091/prxldvke9tzdltz3olxf.webp"
                    alt="Tech Conference"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
                    <svg className="w-[1.2em] h-[1.2em] text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                    </svg>
                    <span>July 7, 2025</span>
                  </div>
                  <h3 className="text-[13px] font-semibold text-gray-900 mt-0.5 line-clamp-2">House Party/Pool Party</h3>
                  <div className="flex flex-col mb-2">
                    <span className="text-xs text-gray-500">Location</span>
                    <span className="font-medium text-sm text-gray-600">Ikoyi, Lagos</span>
                  </div>
                  <div className="mt-1.5 w-full">
                    <div className="bg-blue-50 rounded-full py-1 px-3 text-center w-full">
                      <span className="font-bold text-xs text-blue-800">₦10,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View More Button */}
        <div className="mt-8 hidden sm:block">
          <button className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors duration-200" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
            View more events
          </button>
        </div>
      </div>



      {/* Generate Poster Section */}
      <div className="w-full sm:w-[95vw] mx-auto my-8 sm:my-12 bg-[#299AFC1A] border-y sm:border border-gray-200 rounded-none sm:rounded-2xl pt-14 pb-8 sm:py-12 px-0 sm:px-8 overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-center">
          {/* Left Column - Title and Description */}
          <div className="w-full lg:w-[20%] text-center lg:text-left px-4 sm:px-0 flex flex-col items-center lg:items-start lg:justify-center lg:h-full lg:my-auto">
            <h2 className="text-[32px] md:text-[40px] font-bold text-gray-900 mb-6 leading-tight text-center lg:text-left">
              <span className="lg:hidden">
                <span className="block">Generate a Poster</span>
                <span className="block">for Show or Event</span>
              </span>
              <span className="hidden lg:block">
                Generate a <br />
                Poster for <br />
                Show or <br />
                Event
              </span>
            </h2>
            <Link
              to="/ai-chat"
              className="group relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 w-max mx-auto lg:mx-0"
              style={{
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                color: 'rgb(139, 92, 246)',
                border: '1px solid rgba(168, 85, 247, 0.2)'
              }}
            >
              <span className="relative z-10 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
                </svg>
                <span>Generate with AI</span>
              </span>
            </Link>
          </div>

          {/* Right Column - Cards with Infinite Scroll */}
          <div className="w-full md:w-full lg:w-[80%] overflow-hidden pb-4 relative group">
            <style>{`
              @keyframes marqueeScroll {
                0% { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(-50%, 0, 0); }
              }
              .scroll-container {
                width: 100%;
                overflow: hidden;
                position: relative;
              }
              .scroll-track {
                display: flex;
                width: max-content;
                gap: 1rem;
                animation: marqueeScroll 35s linear infinite;
                will-change: transform;
              }
              .scroll-track:hover {
                animation-play-state: paused;
              }
              .card-item {
                flex: 0 0 auto;
                width: 14rem;
                height: 24rem;
                border-radius: 0.75rem;
                padding: 1rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: transform 0.3s ease;
                margin-right: 0;
              }
              .card-item:hover {
                transform: translateY(-4px);
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
              }
              .card-item img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 0.5rem;
              }
              @media (max-width: 768px) {
                .card-item {
                  width: 12rem;
                  height: 20rem;
                }
              }
            `}</style>
            <div className="scroll-container">
              <div className="scroll-track">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
                  const colors = ['#3267C1', '#0B92B6', '#49B46D', '#43962B', '#3267C1', '#0B92B6', '#49B46D', '#43962B', '#3267C1', '#0B92B6'];
                  const images = [
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1752526724/hnu03jeotewnzbhe7skl.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753392091/prxldvke9tzdltz3olxf.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753378633/x5hnk7bqmaulvixdo7wt.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753095713/ywsj702u8s0tpplm8waa.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1752526724/hnu03jeotewnzbhe7skl.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753392091/prxldvke9tzdltz3olxf.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753378633/x5hnk7bqmaulvixdo7wt.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753095713/ywsj702u8s0tpplm8waa.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1752526724/hnu03jeotewnzbhe7skl.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753392091/prxldvke9tzdltz3olxf.webp'
                  ];
                  const posterPrompts = [
                    'A modern, minimal event ticket design with a dark theme, soft purple gradients, and bold rounded typography.',
                    'Vibrant synthwave music festival poster with glowing neon typography, retro geometric shapes, and deep purple gradient.',
                    'Minimalist tech summit poster with futuristic glassmorphic card overlays, clean Helvetica type, and deep cyan accents.',
                    'Sun-drenched Afrobeats carnival poster with warm golden lighting, tropical palm silhouettes, and energetic typography.',
                    'Sleek gourmet food and cocktail night poster featuring dark moody photography, copper foil accents, and elegant serif titles.',
                    'Modern live audio podcast session flyer with acoustic soundwave graphics, warm studio lighting, and minimal bold lettering.',
                    'Avant-garde contemporary art exhibition poster with abstract 3D geometric shapes, pastel grain textures, and editorial layout.',
                    'High-fashion runway gala poster featuring sleek monochrome contrast, luxury gold accents, and sharp architectural typography.',
                    'Electric underground Warehouse Rave poster with strobe laser beams, glitch distortion effects, and ultra-bold brutalist type.',
                    'Clean executive startup pitch night flyer featuring modern dark mode aesthetics, vibrant blue glow badges, and crisp type.'
                  ];

                  return (
                    <div
                      key={`card-${i}`}
                      className="card-item"
                      style={{
                        backgroundColor: colors[(i - 1) % 10],
                      }}
                    >
                      <div className="aspect-square bg-gray-200 rounded-lg mb-3 overflow-hidden">
                        <img
                          src={images[(i - 1) % 10]}
                          alt={`Event ${i}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-base font-bold text-white mb-1">
                        Prompt:
                      </p>
                      <p className="text-[13px] font-medium leading-5 text-white/90 line-clamp-4">
                        {posterPrompts[(i - 1) % 10]}
                      </p>
                    </div>
                  );
                })}

                {/* Duplicate set for seamless looping */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
                  const colors = ['#3267C1', '#0B92B6', '#49B46D', '#43962B', '#3267C1', '#0B92B6', '#49B46D', '#43962B', '#3267C1', '#0B92B6'];
                  const images = [
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1752526724/hnu03jeotewnzbhe7skl.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753392091/prxldvke9tzdltz3olxf.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753378633/x5hnk7bqmaulvixdo7wt.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753095713/ywsj702u8s0tpplm8waa.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1752526724/hnu03jeotewnzbhe7skl.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753392091/prxldvke9tzdltz3olxf.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753378633/x5hnk7bqmaulvixdo7wt.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753095713/ywsj702u8s0tpplm8waa.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1752526724/hnu03jeotewnzbhe7skl.webp',
                    'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1753392091/prxldvke9tzdltz3olxf.webp'
                  ];
                  const posterPrompts = [
                    'A modern, minimal event ticket design with a dark theme, soft purple gradients, and bold rounded typography.',
                    'Vibrant synthwave music festival poster with glowing neon typography, retro geometric shapes, and deep purple gradient.',
                    'Minimalist tech summit poster with futuristic glassmorphic card overlays, clean Helvetica type, and deep cyan accents.',
                    'Sun-drenched Afrobeats carnival poster with warm golden lighting, tropical palm silhouettes, and energetic typography.',
                    'Sleek gourmet food and cocktail night poster featuring dark moody photography, copper foil accents, and elegant serif titles.',
                    'Modern live audio podcast session flyer with acoustic soundwave graphics, warm studio lighting, and minimal bold lettering.',
                    'Avant-garde contemporary art exhibition poster with abstract 3D geometric shapes, pastel grain textures, and editorial layout.',
                    'High-fashion runway gala poster featuring sleek monochrome contrast, luxury gold accents, and sharp architectural typography.',
                    'Electric underground Warehouse Rave poster with strobe laser beams, glitch distortion effects, and ultra-bold brutalist type.',
                    'Clean executive startup pitch night flyer featuring modern dark mode aesthetics, vibrant blue glow badges, and crisp type.'
                  ];

                  return (
                    <div
                      key={`duplicate-${i}`}
                      className="card-item"
                      style={{
                        backgroundColor: colors[(i - 1) % 10],
                      }}
                    >
                      <div className="aspect-square bg-gray-200 rounded-lg mb-3 overflow-hidden">
                        <img
                          src={images[(i - 1) % 10]}
                          alt={`Event ${i}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-base font-bold text-white mb-1">
                        Prompt:
                      </p>
                      <p className="text-[13px] font-medium leading-5 text-white/90 line-clamp-4">
                        {posterPrompts[(i - 1) % 10]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blog Section */}
      <div className="w-[95vw] mx-auto my-12 bg-orange-50 border border-orange-100 rounded-2xl pt-6 pb-12 px-8">
        <div className="flex justify-between items-center">
          <h2 className="text-xl md:text-[24px] font-bold text-gray-900">Blog</h2>
          <Link to="/blog" className="flex items-center text-gray-900 hover:text-gray-700 font-medium">
            View all posts
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 text-gray-900" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        <div className="border-b border-gray-200 mt-4 mb-6"></div>

        <div className="flex flex-col lg:flex-row justify-between gap-8">
          {/* First Column - Original size */}
          {blogPosts[0] && (
            <div className="space-y-8 pt-2">
              {/* First Blog Post */}
              <div className="group w-full max-w-[700px] flex flex-col gap-6">
                <Link to={`/blog/${blogPosts[0].slug || blogPosts[0].id}`} className="block w-full overflow-hidden lg:max-w-[800px] lg:mx-auto" style={{ aspectRatio: '16/9' }}>
                  <img
                    src={blogPosts[0].image}
                    alt={blogPosts[0].title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </Link>
                <div className="w-full">
                  <span className="text-[15px] font-medium uppercase" style={{ color: blogPosts[0].color }}>{blogPosts[0].category}</span>
                  <Link to={`/blog/${blogPosts[0].slug || blogPosts[0].id}`} className="block mt-2">
                    <h3 className="text-[24px] lg:text-[40px] leading-[30px] lg:leading-[44px] font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">{blogPosts[0].title}</h3>
                    <p className="hidden lg:block text-gray-600 text-[18px] font-medium mt-3 leading-relaxed">
                      {blogPosts[0].excerpt || blogPosts[0].content?.slice(0, 150) || 'Read more about this post.'}...
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Mobile-only divider between first and second posts */}
          <div className="block sm:hidden w-full border-t border-gray-200 my-4"></div>

          {/* Second Column - Aligned to right edge */}
          <div className="lg:ml-auto space-y-8">
            {blogPosts.slice(1, 6).map((post, idx) => (
              <React.Fragment key={post.id}>
                {idx > 0 && <div className="border-t border-gray-200 my-6"></div>}
                <div className="group w-full max-w-[600px] flex flex-col sm:flex-row-reverse gap-4 sm:gap-6 items-start">
                  <Link to={`/blog/${post.slug || post.id}`} className="hidden md:block w-full sm:w-48 flex-shrink-0 overflow-hidden ml-4" style={{ aspectRatio: '16/9' }}>
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </Link>
                  <div className="flex-1 py-2">
                    <span className="text-[15px] font-medium uppercase" style={{ color: post.color }}>{post.category}</span>
                    <Link to={`/blog/${post.slug || post.id}`} className="block mt-1">
                      <h3 className="text-[22px] leading-[28px] font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">{post.title}</h3>
                    </Link>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#1f2937',
            padding: '14px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
            marginTop: '20px',
            border: '1px solid #e5e7eb',
            animation: 'slideIn 0.3s ease-out forwards',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#ffffff',
            },
          },
          loading: {
            iconTheme: {
              primary: '#3B82F6',
              secondary: '#ffffff',
            },
          },
        }}
      />

      {/* Global styles for toast notifications */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideIn {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          .toast {
            animation: slideIn 0.3s ease-out forwards !important;
          }
        `
      }} />

      {/* Newsletter Signup Section */}
      <div className="w-[95vw] mx-auto my-12 relative">
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <GeometricPattern />
        </div>
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 p-10 rounded-xl min-h-[240px] bg-blue-100/90 backdrop-blur-sm">
          {/* Left Column - Text */}
          <div className="w-full lg:w-1/2 text-left">
            <h3 className="text-[32px] font-semibold text-gray-900">Never miss out</h3>
            <p className="text-[32px] font-semibold text-gray-900/60 -mt-1">Get the latest updates</p>
          </div>

          {/* Right Column - Email Form */}
          <div className="w-full lg:w-1/2">
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const email = (form.elements.namedItem('email') as HTMLInputElement).value;

              // Basic email validation
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(email)) {
                toast.error('Please enter a valid email address');
                return;
              }

              // Show loading state
              const loadingToast = toast.loading('Subscribing...');

              // Simulate API call
              setTimeout(() => {
                // Here you would typically send the email to your server
                console.log('Submitting email:', email);

                // On success
                toast.dismiss(loadingToast);
                toast.success('Thanks for subscribing!');
                form.reset();

                // In a real app, you would handle errors like this:
                // .catch(error => {
                //   toast.dismiss(loadingToast);
                //   toast.error('Failed to subscribe. Please try again.');
                // });
              }, 1000);
            }} className="w-full">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="flex-1 max-w-md pl-6 pr-4 py-4 bg-black/5 border border-transparent rounded-full hover:border-black/40 focus:border-black/60 focus:outline-none placeholder-gray-500 text-sm transition-all"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors whitespace-nowrap"
                >
                  Send me updates
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 max-w-md">
                Stay updated on the latest events, exclusive shows, and community happenings. Unsubscribe anytime with a single click.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
