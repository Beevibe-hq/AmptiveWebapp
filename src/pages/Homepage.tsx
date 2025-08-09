import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import QRCodeGenerator from '../components/QRCodeGenerator';


// Type definition for Trending Card
interface TrendingCardProps {
  id: number;
  title: string;
  description: string;
  image: string;
  gradient: string;
  avatars: string[];
  type: 'shows' | 'events';
}

// Trending Card Component
const TrendingCard: React.FC<TrendingCardProps> = ({ 
  title, 
  description, 
  image, 
  gradient, 
  avatars,
  type 
}) => (
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
          className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-900 text-xs font-medium rounded-full transition-colors whitespace-nowrap"
          type="button"
        >
          {type === 'shows' ? 'Subscribe' : 'Get Tickets'}
        </button>
      </div>
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
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
// Images moved to public directory for Netlify
const weCanDoHardThingsImage = '/images/we-can-do-hard-things.jpeg';
import EventCard, { MediaSource } from '../components/EventCard';
import GeometricPattern from '../components/GeometricPattern';

interface EventType {
  id: number;
  title: string;
  location: string;
  country: string;
  status: string;
  price: number | Array<{ type: string; price: number }>;
  date: string;
  media: MediaSource;
}

// Update image paths to use public directory
const karaImage = '/images/kara.png';
const glennonDoyleImage = '/images/Glennon Doyle.jpeg';
const jazzNightsImage = '/images/i-said-what-i-said.jpg';
const stillProcessingImage = '/images/still processing.jpg';
const configImage = '/images/config.jpeg';
const liquidiumImage = '/images/liquidium.jpg';
const honestBunchImage = '/images/honnest bunch.jpeg';
const techConferenceCardStyles = `
  .tech-conference-card p {
    color: white !important;
  }
  .tech-conference-card p.text-gray-500 {
    color: rgba(255, 255, 255, 0.9) !important;
  }
`;

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
  shadowColor?: string;
  bgColor?: string;
  backgroundImage?: string;
  textColor?: string;
  className?: string;
  isFirstSlide?: boolean;
  isSecondSlide?: boolean;
}

const HeroSlide: React.FC<HeroSlideProps> = ({ 
  title,
  description, 
  ctaText, 
  ctaLink, 
  videoSrc, 
  shadowColor = 'rgba(0, 0, 0, 0.5)',
  bgColor,
  backgroundImage,
  textColor = '',
  className = '',
  isFirstSlide = false,
  isSecondSlide = false,
  onSwipeLeft,
  onSwipeRight
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const minSwipeDistance = 50; // Minimum distance to consider it a swipe

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
              <div 
                className="absolute inset-0 w-full h-full"
                style={{ 
                  backgroundColor: bgColor,
                  opacity: backgroundImage ? 0.6 : 1 // Slightly transparent if there's a background image
                }}
              />
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
              <div 
                className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-100"
                style={{ 
                  boxShadow: isSecondSlide 
                    ? `0 0 60px ${shadowColor}`  // Larger shadow for second slide
                    : `0 0 40px ${shadowColor}`  // Default shadow for other slides
                }}
              >
                <video 
                  ref={videoRef}
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src={videoSrc} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
          
          {/* Content Column - Fixed max width with min-width */}
          <div className="w-full lg:min-w-[350px] max-w-[550px] lg:max-w-[550px] text-center lg:text-left">
            <h1 className="text-2xl md:text-[36px] font-extrabold mb-4 md:mb-6 leading-tight text-white">
              {isFirstSlide ? (
                <>
                  <span className="md:hidden">Go Live with Amptive</span>
                  <span className="hidden md:inline" dangerouslySetInnerHTML={{
                    __html: title.replace('Audio Show or', 'Audio Show<br/>or')
                  }} />
                </>
              ) : (
                title
              )}
            </h1>
            <p className="text-[14px] md:text-[16px] font-medium text-white/90 mb-6 md:mb-8">
              {isFirstSlide ? (
                <>
                  <span className="md:hidden" dangerouslySetInnerHTML={{
                    __html: 'Create events, sell tickets, track sales and <br> more in real time.'
                  }} />
                  <span className="hidden md:inline" dangerouslySetInnerHTML={{
                    __html: description.replace('host your own,', 'host your own,<br/>')
                  }} />
                </>
              ) : isSecondSlide ? (
                <>
                  <span className="md:hidden" dangerouslySetInnerHTML={{
                    __html: 'Create events, sell tickets, track sales and <br> more in real time.'
                  }} />
                  <span className="hidden md:inline">
                    {description}
                  </span>
                </>
              ) : (
                description
              )}
            </p>
            
            
            {/* Button - Hidden on desktop only for first slide, visible on mobile for all slides */}
            <div className={isFirstSlide ? 'md:hidden' : ''}>
              <div className="flex md:block justify-center">
                <Link
                  to={ctaLink}
                  className="bg-white text-black px-6 md:px-8 py-3 md:py-4 rounded-full font-bold text-sm md:text-base hover:bg-gray-100 transition-all duration-200"
                >
                  {ctaText}
                </Link>
              </div>
            </div>
            
            {/* QR Code - Desktop Only - First Slide */}
            {isFirstSlide && (
              <div className="hidden md:block">
                <div className="flex items-center gap-2 mb-8 p-2 bg-black/10 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="bg-white p-1 rounded flex items-center justify-center" style={{ width: '80px', height: '80px' }}>
                      <QRCodeGenerator 
                      value="https://www.amptiveapp.com/downloads" 
                      size={72}
                      className="w-[72px] h-[72px]"
                    />
                    </div>
                  </div>
                  <div className="ml-1">
                    <div className="text-white text-base font-normal">Get the app</div>
                    <div className="text-white/70 text-sm mb-2">Scan the code with your smart phone camera to download the free app</div>
                  </div>
                </div>
                <div className="mt 2 text-white/80 text-sm">
                  Available on{' '}
                  <a 
                    href="https://apps.apple.com/app/amptivelive/id1234567890" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-white font-medium hover:underline"
                  >
                    iOS
                  </a>{' '}
                  and{' '}
                  <a 
                    href="https://play.google.com/store/apps/details?id=com.amptivelive.app" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-white font-medium hover:underline"
                  >
                    Android
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

// Move slides data outside the component to avoid recreation on each render
const SLIDES = [
  {
    title: "Start a Live Audio Show or Event",
    mobileTitle: "Go Live with Amptive",
    description: "Discover live audio shows & events, host your own, and support creators.",
    ctaText: "Download App",
    ctaLink: "/download",
    videoSrc: new URL('../assets/949_720x60_shots_so.mp4', import.meta.url).href,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    isFirstSlide: true
  },
  {
    title: "Launch Ticketed Events",
    description: "Create events, sell tickets, track sales and more in real time",
    ctaText: "Create event",
    ctaLink: "/events",
    videoSrc: new URL('../assets/The_camera_focus_202507041156.mp4', import.meta.url).href,
    backgroundImage: '/images/OC%2012.webp',
    shadowColor: 'rgba(0, 0, 0, 0.6)',
    isSecondSlide: true
  },
  {
    title: "Monetize Your Content",
    description: "Earn money from your live shows through tickets, donations, and more.",
    ctaText: "Learn more",
    ctaLink: "/monetization",
    videoSrc: new URL('../assets/645_720x60_shots_so.mp4', import.meta.url).href,
    shadowColor: 'rgba(0, 0, 0, 0.5)'
  }
];

const Homepage: React.FC = () => {
  // Add styles for tech-conference-card
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = techConferenceCardStyles;
    document.head.appendChild(styleTag);
    
    return () => {
      document.head.removeChild(styleTag);
    };
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
  const [filteredEvents, setFilteredEvents] = useState<EventType[]>([]);

  // Get user's country on component mount
  useEffect(() => {
    const fetchUserCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
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


  // Data for Trending section
  const trendingData: { [key: string]: any[] } = {
    shows: [
      {
        id: 1,
        title: "We Can Do Hard Things",
        description: "Life is freaking hard. We are hard. Let's get through it together. Join Glennon Doyle and her sister Amanda as they discuss hard things and how to survive them.",
        image: '/images/we-can-do-hard-things.jpeg',
        gradient: 'linear-gradient(135deg, #8B3A3A 0%, #CD5C5C 50%, #D2691E 100%)',
        avatars: ['/images/glennon-doyle.jpeg', 'https://i.pravatar.cc/150?img=2', 'https://i.pravatar.cc/150?img=3']
      },
      {
        id: 2,
        title: "I Said What I Said",
        description: "Unfiltered conversations about life, love, and everything in between. No topic is off limits.",
        image: '/images/i-said-what-i-said.jpg',
        gradient: 'linear-gradient(135deg, #4C1D1D 0%, #7F1D1D 50%, #B91C1C 100%)',
        avatars: ['https://i.pravatar.cc/150?img=32', 'https://i.pravatar.cc/150?img=33']
      },
      {
        id: 3,
        title: "Still Processing",
        description: "Join the conversation about culture, technology, and everything in between with hosts Jenna Wortham and Wesley Morris.",
        image: '/images/still processing.jpg',
        gradient: 'linear-gradient(135deg, #4A2D5A 0%, #6A3F7A 50%, #8A5E9B 100%)',
        avatars: ['https://i.pravatar.cc/150?img=34', 'https://i.pravatar.cc/150?img=35']
      },
      {
        id: 4,
        title: "The Honest Bunch",
        description: "A group of friends having honest conversations about life, relationships, and personal growth.",
        image: '/images/honnest bunch.jpeg',
        gradient: 'linear-gradient(135deg, #556B2F 0%, #6B8E23 100%)',
        avatars: ['https://i.pravatar.cc/150?img=36', 'https://i.pravatar.cc/150?img=37', 'https://i.pravatar.cc/150?img=38']
      }
    ],
    events: [
      {
        id: 5,
        title: "Figma Config 2025",
        description: "The biggest tech conference of the year featuring industry leaders and innovative startups.",
        image: '/images/config.jpeg',
        gradient: 'linear-gradient(135deg, #825B90 0%, #7E41B9 100%)',
        avatars: ['/images/config.jpg']
      },
      {
        id: 6,
        title: "Liquidium Festival",
        description: "A weekend of amazing music, food, and good vibes with your favorite artists.",
        image: '/images/liquidium.jpg',
        gradient: 'linear-gradient(to bottom, #1A4D00 0%, #37A400 100%)',
        avatars: ['https://i.pravatar.cc/150?img=8', 'https://i.pravatar.cc/150?img=9']
      },
      {
        id: 7,
        title: "Food & Wine Expo",
        description: "Experience the finest culinary delights and wines from around the world.",
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
        gradient: 'linear-gradient(135deg, #B91C1C 0%, #F87171 100%)',
        avatars: ['https://i.pravatar.cc/150?img=10', 'https://i.pravatar.cc/150?img=11', 'https://i.pravatar.cc/150?img=12']
      },
      {
        id: 8,
        title: "Startup Pitch Night",
        description: "Witness innovative startups pitch their ideas to a panel of investors.",
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
        gradient: 'linear-gradient(135deg, #047857 0%, #10B981 100%)',
        avatars: ['https://i.pravatar.cc/150?img=13', 'https://i.pravatar.cc/150?img=14']
      }
    ]
  };

  // Sample events data
  const events = [
    {
      id: 1,
      title: "Karaoke Traffic Vibes",
      location: "Lekki Phase 1, Lagos",
      country: "Nigeria",
      status: "Upcoming",
      price: [
        { type: 'Regular', price: 5000 },
        { type: 'VIP', price: 10000 },
        { type: 'VVIP', price: 20000 }
      ],
      date: "2025-07-12T20:00:00",
      media: {
        type: 'image' as const,
        src: karaImage,
        alt: 'Karaoke Traffic Vibes'
      } as MediaSource
    },
    {
      id: 2,
      title: "Clinton Flames",
      location: "Victoria Island, Lagos",
      country: "Nigeria",
      status: "Upcoming",
      price: 10000,
      date: "2025-07-13T19:30:00",
      media: {
        type: 'image' as const,
        src: 'https://www.shazam.com/mkimage/image/thumb/AMCArtistImages116/v4/7d/b1/4f/7db14f51-0978-2d7e-9add-f0d205bae318/883bda85-96d8-4515-a288-31e25bd8f216_ami-identity-b4d7093c3e0926436905c4b9df9223c0-2023-03-24T20-43-10.454Z_cropped.png/1552x1552bb.webp',
        alt: 'Clinton Flames'
      } as MediaSource
    },
    {
      id: 3,
      title: "1analog Girl",
      location: "Ikeja, Lagos",
      country: "Nigeria",
      status: "Sold Out",
      price: 0, // Price is 0 for sold out events
      date: "2025-07-07T22:00:00",
      media: {
        type: 'gif' as const,
        src: 'http://localhost:3000/src/assets/GIF%20promo%20(1mouth%20analog)%20v2.gif',
        alt: '1analog Girl',
        autoplay: true,
        loop: true
      } as MediaSource
    },
    {
      id: 4,
      title: "Reekado Banks Live In Abuja",
      location: "Garki, Abuja",
      country: "Nigeria",
      status: "Registration Open",
      price: [
        { type: 'Early Bird', price: 2000 },
        { type: 'Regular', price: 5000 },
        { type: 'VIP', price: 10000 }
      ],
      date: "2025-07-20T21:00:00",
      media: {
        type: 'image' as const,
        src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1744053819/lv7lfpukvpotznvykopf.webp',
        alt: 'Reekado Banks Live In Abuja'
      } as MediaSource
    },
    {
      id: 5,
      title: "House Party/pool Party",
      location: "Ikoyi, Lagos",
      country: "Nigeria",
      status: "Sold Out",
      price: 0, // Price is 0 for sold out events
      date: "2025-07-07T23:30:00",
      media: {
        type: 'image' as const,
        src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751906823/yflortvspnhc5idiol9t.webp',
        alt: 'House Party/pool Party'
      } as MediaSource
    },
    {
      id: 6,
      title: "Afrobeat Night Live",
      location: "Yaba, Lagos",
      country: "Nigeria",
      status: "Upcoming",
      price: [
        { type: 'Early Bird', price: 3000 },
        { type: 'Regular', price: 5000 },
        { type: 'VIP', price: 8000 }
      ],
      date: "2025-07-25T21:00:00",
      media: {
        type: 'image' as const,
        src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1752002405/mgoz620c4yjyeb0xa6hd.webp',
        alt: 'Afrobeat Night Live',
      } as MediaSource
    },
    {
      id: 7,
      title: "Tech Conference 2025",
      location: "Maitama, Abuja",
      country: "Nigeria",
      status: "Sold Out",
      price: 0, // Price is 0 for sold out events
      date: "2025-08-05T09:00:00",
      media: {
        type: 'image' as const,
        src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751984779/nlhtme0suacdfjyypc8s.webp',
        alt: 'Tech Conference 2025',
      } as MediaSource
    },
    {
      id: 8,
      title: "Art Exhibition",
      location: "Wuse, Abuja",
      country: "Nigeria",
      status: "Upcoming",
      price: 0,
      date: "2025-07-30T10:00:00",
      media: {
        type: 'image' as const,
        src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751961673/yzh40wdpkykt96kogcam.webp',
        alt: 'Art Exhibition',
      } as MediaSource
    },
    {
      id: 9,
      title: "Food Festival",
      location: "GRA, Port Harcourt",
      country: "Nigeria",
      status: "Live Now",
      price: [
        { type: 'Tasting Pass', price: 5000 },
        { type: 'VIP Experience', price: 15000 }
      ],
      date: "2025-07-10T12:00:00",
      media: {
        type: 'image' as const,
        src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751961662/ltctlgwlgfma1hzlfs1q.webp',
        alt: 'Food Festival',
      } as MediaSource
    },
    {
      id: 10,
      title: "Jazz Night",
      location: "GRA, Ilorin",
      country: "Nigeria",
      status: "Upcoming",
      price: [
        { type: 'Standard', price: 7000 },
        { type: 'VIP', price: 12000 }
      ],
      date: "2025-08-15T20:00:00",
      media: {
        type: 'image' as const,
        src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751666040/dzit74ibwfmtpuwfexme.webp',
        alt: 'Jazz Night',
      } as MediaSource
    },
    {
      id: 11,
      title: "Amptive Live Session",
      location: "Amptive",
      country: "Global",
      status: "Live Now",
      price: 0,
      date: "2025-07-17T20:00:00",
      media: {
        type: 'image' as const,
        src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751666040/dzit74ibwfmtpuwfexme.webp',
        alt: 'Amptive Live Session',
      } as MediaSource
    }
  ];

  // Initialize filtered events with all events
  useEffect(() => {
    setFilteredEvents(events);
  }, []);

  // Filter events based on filters
  const applyFilters = () => {
    let result = [...events];
    
    // Filter by status
    if (filters.status === 'Ticket on sale') {
      // Show only events that are not sold out
      result = result.filter(event => event.status !== 'Sold Out');
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
    setFilteredEvents(events);
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressBars, setProgressBars] = useState<number[]>(Array(SLIDES.length).fill(0));
  const sliderRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>();
  
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
    setIsPaused(prev => !prev);
  };
  
  // Auto-advance slides with smooth progress
  useEffect(() => {
    if (isPaused) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      return;
    }
    
    // Update progress every 100ms for smooth animation (30s total = 100%)
    progressInterval.current = setInterval(() => {
      setProgressBars(prev => {
        const newProgress = [...prev];
        const currentProgress = newProgress[currentSlide] + (100 / 300); // 0.33% every 100ms = 100% in 30s
        
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
    }, 100);
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPaused, currentSlide]);

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
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {SLIDES.map((slide, index) => (
            <div key={index} className="w-full flex-shrink-0">
              <HeroSlide
                title={slide.title}
                description={slide.description}
                ctaText={slide.ctaText}
                ctaLink={slide.ctaLink}
                videoSrc={slide.videoSrc}
                shadowColor={slide.shadowColor}
                backgroundImage={slide.backgroundImage}
                isFirstSlide={slide.isFirstSlide}
                isSecondSlide={slide.isSecondSlide}
                onSwipeLeft={prevSlide}
                onSwipeRight={nextSlide}
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
              transitionDuration: isPaused ? '0s' : '10s',
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
      <div className="w-[95vw] mx-auto my-12 bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-black">Upcoming Events</h2>
          <div className="relative" ref={filterRef}>
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
                            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                              filters.status === status
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
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
              
              {/* Scrollable content */}
              <div className="overflow-x-auto pb-6">
                <div className="flex space-x-6 w-max min-w-full pl-4 pr-4">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map(event => (
                    <div key={event.id} className="w-72 flex-shrink-0">
                      <EventCard
                        title={event.title}
                        location={event.location}
                        status={event.status}
                        price={event.price}
                        date={event.date}
                        media={event.media}
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
            
            {/* Show More Button for Desktop */}
            <div className="mt-10 w-full px-6">
              <button className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors duration-200">
                View more events
              </button>
            </div>
          </div>
          
          {/* Mobile Layout */}
          <div className="sm:hidden">
            {filteredEvents.length > 0 ? (
              <>
                {/* Horizontal Scrollable Cards */}
                <div className="-mx-4 px-4 overflow-x-auto pb-4">
                  <div className="flex space-x-4 w-max">
                    {filteredEvents.map((event, index) => (
                      <div key={index} className="w-64 flex-shrink-0">
                        <EventCard
                          title={event.title}
                          location={event.location}
                          status={event.status}
                          price={event.price}
                          date={event.date}
                          media={event.media}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Show More Button for Mobile */}
                <div className="mt-6 w-full px-4">
                  <button className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors duration-200">
                    View more events
                  </button>
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

      {/* Top Events Section */}
      <div className="w-[95vw] mx-auto my-12 bg-white border border-gray-200 rounded-2xl px-6 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-black">Top Events</h2>
          {/* Filter button and modal removed as per user request */}
        </div>
        
        {/* Desktop Table Layout */}
        <div className="hidden sm:block overflow-x-auto">
          <div className="min-w-full">
            {/* Table Header */}
            <div className="grid grid-cols-[40px,minmax(300px,2fr),minmax(180px,1.5fr),minmax(100px,1fr),minmax(120px,1fr),minmax(100px,1fr)] gap-8 text-sm font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
              <div className="w-8 text-center">#</div>
              <div>Event</div>
              <div>Location</div>
              <div>Price</div>
              <div>Status</div>
              <div>Date</div>
            </div>
            
            {/* Table Rows */}
            <div className="space-y-3">
              {events.slice(0, showAllTopEvents ? events.length : 6).map((event, index) => (
                <div key={event.id} className="grid grid-cols-[40px,minmax(300px,2fr),minmax(180px,1.5fr),minmax(100px,1fr),minmax(120px,1fr),minmax(100px,1fr)] gap-8 items-center px-4 py-4 hover:bg-gray-50 rounded-lg">
                  <div className="w-8 text-center text-gray-500 font-medium">{index + 1}</div>
                  <div className="flex items-center space-x-3">
                    {event.media && (event.media.type === 'image' || event.media.type === 'gif') && (
                      <img 
                        src={event.media.src} 
                        alt={event.media.alt || event.title} 
                        className="w-10 h-10 rounded-md object-cover"
                      />
                    )}
                    <span className="font-medium text-gray-900 truncate">{event.title}</span>
                  </div>
                  <div className="text-gray-600 truncate" title={event.location}>{event.location}</div>
                  <div className="font-medium">
                    {Array.isArray(event.price) 
                      ? `₦${Math.min(...event.price.map(p => p.price)).toLocaleString()}+` 
                      : event.price === 0 ? 'Free' : `₦${event.price.toLocaleString()}`}
                  </div>
                  <div>
                    <div className="inline-block">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === 'Sold Out' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-800'
                      }`}>
                        {event.status === 'Sold Out' ? 'Sold out' : 'Ticket on sale'}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Show More Button */}
            {events.length > 6 && (
              <div className="mt-10 w-full hidden sm:block">
                <button 
                  onClick={() => setShowAllTopEvents(!showAllTopEvents)}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors duration-200"
                  style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
                >
                  {showAllTopEvents ? 'Show less' : 'View more events'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile Layout */}
        <div className="sm:hidden">
          <div className="-mx-4 px-4 overflow-x-auto pb-4">
            <div className="flex space-x-4 w-max">
              {events
                .slice(0, showAllTopEvents ? events.length : 5)
                .map((event) => (
                  <div key={event.id} className="w-64 flex-shrink-0">
                    <EventCard
                      title={event.title}
                      location={event.location}
                      status={event.status}
                      price={event.price}
                      date={event.date}
                      media={event.media}
                    />
                  </div>
                ))}
            </div>
          </div>
          
          <div className="mt-6 w-full px-4">
            <button className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors duration-200">
              View more events
            </button>
          </div>
        </div>
      </div>



      {/* Browse by Community Section */}
      <div className={`w-[95vw] mx-auto my-12 border rounded-2xl p-8 min-h-[400px] flex flex-col justify-center relative transition-colors duration-500 ${cardColors[activeCardIndex]}`}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Title Section */}
          <div className="w-full lg:w-1/5 flex flex-col items-start gap-4 px-4">
            <h2 className="text-[28px] lg:text-[32px] font-bold text-black leading-tight">
              Browse by<br />
              Communities
            </h2>
            <button className="px-6 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
              Explore Communities
            </button>
          </div>
          
          {/* Community Cards */}
          <div className="flex-1 w-full overflow-hidden relative lg:pr-4">
            {/* Left Fade Effect */}
            <div className={`absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r ${cardColors[activeCardIndex].replace('bg-', 'from-')} to-transparent z-10 pointer-events-none transition-all duration-300 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`}></div>
            
            {/* Navigation Arrows */}
            {showLeftArrow && (
              <button 
                className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 transition-all duration-300"
                onClick={() => scrollCards('left')}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {showRightArrow && (
              <button 
                className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 transition-all duration-300"
                onClick={() => scrollCards('right')}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
            
            {/* Right Fade Effect */}
            <div className={`absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l ${cardColors[activeCardIndex].replace('bg-', 'from-')} to-transparent z-10 pointer-events-none transition-all duration-300 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`}></div>
            
            {/* Cards Container */}
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 hide-scrollbar px-4" ref={cardsContainerRef} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {[
                { 
                  title: "Music",
                  image: communityMusicImage
                },
                { 
                  title: "Food & Drink",
                  image: communityFoodImage
                },
                { 
                  title: "Art & Culture",
                  image: communityArtImage
                },
                { 
                  title: "Technology",
                  image: communityTechImage
                },
                { 
                  title: "Sports",
                  image: communitySportsImage
                },
                { 
                  title: "Fashion",
                  image: communityFashionImage
                },
                { 
                  title: "Gaming",
                  image: communityGamingImage
                },
                { 
                  title: "Health & Wellness",
                  image: communityHealthImage
                },
                { 
                  title: "Education",
                  image: communityEducationImage
                },
                { 
                  title: "Travel",
                  image: communityTravelImage
                }
              ].map((community, index) => (
                <div 
                  key={index}
                  className="community-card flex-shrink-0 w-[280px] h-[200px] bg-white rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  data-index={index}
                >
                  <img 
                    src={community.image} 
                    alt={community.title}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trending on Amptive Section */}
      <div className="w-[95vw] mx-auto my-12 bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Trending on Amptive App</h2>
          <div className="flex space-x-1 bg-gray-100 p-0.5 rounded-full w-fit">
            <button
              onClick={() => setActiveTab('shows')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeTab === 'shows' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Shows
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeTab === 'events' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
                    <svg className="w-[1.2em] h-[1.2em] mr-1 text-red-500 -mt-0.5" viewBox="0 0 24 24" fill="currentColor">
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
                    <svg className="w-[1.2em] h-[1.2em] mr-1 text-red-500 -mt-0.5" viewBox="0 0 24 24" fill="currentColor">
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
                    src="/images/1mouth-analog-v2.gif" 
                    alt="1analog Girl" 
                    className="w-full h-full object-cover rounded-lg" 
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
                    <svg className="w-[1.2em] h-[1.2em] mr-1 text-red-500 -mt-0.5" viewBox="0 0 24 24" fill="currentColor">
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
                    <svg className="w-[1.2em] h-[1.2em] mr-1 text-red-500 -mt-0.5" viewBox="0 0 24 24" fill="currentColor">
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
                    <svg className="w-[1.2em] h-[1.2em] mr-1 text-red-500 -mt-0.5" viewBox="0 0 24 24" fill="currentColor">
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
        <div className="mt-8">
          <button className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors duration-200" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
            View more events
          </button>
        </div>
      </div>



      {/* Generate Poster Section */}
      <div className="w-[95vw] mx-auto my-12 bg-[#299AFC1A] border border-gray-200 rounded-2xl py-12 px-8">
        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-center">
          {/* Left Column - Title and Description */}
          <div className="w-full lg:w-[20%] text-left lg:flex lg:flex-col lg:justify-center lg:h-full lg:my-auto">
            <h2 className="text-[32px] md:text-[40px] font-bold text-gray-900 mb-6 leading-tight">
              <span className="lg:hidden">
                <span className="block">Generate a poster</span>
                <span className="block">for Show or event</span>
              </span>
              <span className="hidden lg:block">
                Generate a <br />
                poster for <br />
                Show or <br />
                event
              </span>
            </h2>
            <a 
              href="/generate"
              className="group relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 w-max"
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
                <span className="hidden sm:inline">Generate with AI</span>
                <span className="sm:hidden">Generate</span>
              </span>
            </a>
          </div>
          
          {/* Right Column - Cards with Infinite Scroll */}
          <div className="w-full md:w-full lg:w-[80%] overflow-hidden pb-4 relative group">
            <style>{`
              @keyframes scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(calc(-100% / 2)); }
              }
              .scroll-container {
                width: 100%;
                overflow: hidden;
                position: relative;
              }
              .scroll-track {
                display: flex;
                width: 200%;
                animation: scroll 30s linear infinite;
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
                margin-right: 1rem;
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
                  
                  return (
                    <div 
                      key={`card-${i}`}
                      className="card-item"
                      style={{ 
                        backgroundColor: colors[i % 10],
                      }}
                    >
                      <div className="aspect-square bg-gray-200 rounded-lg mb-3 overflow-hidden">
                        <img 
                          src={images[i % 10]}
                          alt={`Event ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-base font-bold text-white mb-1">
                        Prompt:
                      </p>
                      <p className="text-[13px] font-medium leading-5 text-white/90 line-clamp-4">
                        A modern, minimal event ticket design with a dark theme and soft gradients. The layout features a bold, rounded event title.
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
                  
                  return (
                    <div 
                      key={`duplicate-${i}`}
                      className="card-item"
                      style={{ 
                        backgroundColor: colors[i % 10],
                      }}
                    >
                      <div className="aspect-square bg-gray-200 rounded-lg mb-3 overflow-hidden">
                        <img 
                          src={images[i % 10]}
                          alt={`Event ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-base font-bold text-white mb-1">
                        Prompt:
                      </p>
                      <p className="text-[13px] font-medium leading-5 text-white/90 line-clamp-4">
                        A modern, minimal event ticket design with a dark theme and soft gradients. The layout features a bold, rounded event title.
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
          <h2 className="text-[24px] font-bold text-gray-900">Blog</h2>
          <a href="/blog" className="flex items-center text-gray-900 hover:text-gray-700 font-medium">
            View all posts
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 text-gray-900" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
        <div className="border-b border-gray-200 mt-4 mb-6"></div>
        
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          {/* First Column - Original size */}
          <div className="space-y-8 pt-2">
            {/* First Blog Post */}
            <div className="group w-full max-w-[700px] flex flex-col gap-6">
              <a href="/blog/how-to-host-successful-virtual-events" className="block w-full overflow-hidden lg:max-w-[800px] lg:mx-auto" style={{ aspectRatio: '16/9' }}>
                <img 
                  src="/src/assets/Overview (1).png" 
                  alt="Event overview"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </a>
              <div className="w-full">
                <span className="text-[15px] font-medium text-green-600 uppercase">EVENTS</span>
                <a href="/blog/how-to-host-successful-virtual-events" className="block mt-2">
                  <h3 className="text-[24px] lg:text-[40px] leading-[30px] lg:leading-[44px] font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">How to Host Successful Virtual Events</h3>
                  <p className="hidden lg:block text-gray-600 text-[18px] font-medium mt-3 leading-relaxed">
                    Learn the essential strategies and tools needed to create engaging and successful virtual events.
                  </p>
                </a>
              </div>
            </div>
          </div>
          
          {/* Mobile-only divider between first and second posts */}
          <div className="block sm:hidden w-full border-t border-gray-200 my-4"></div>
          
          {/* Second Column - Aligned to right edge */}
          <div className="lg:ml-auto space-y-8">
            {/* Second Blog Post */}
            <div className="group w-full max-w-[600px] flex flex-col sm:flex-row-reverse gap-4 sm:gap-6 items-start">
              <a href="/blog/event-marketing-strategies" className="hidden md:block w-full sm:w-48 flex-shrink-0 overflow-hidden ml-4" style={{ aspectRatio: '16/9' }}>
                <img 
                  src="/src/assets/Overview.png" 
                  alt="Marketing insights"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </a>
              <div className="flex-1 py-2">
                <span className="text-[15px] font-medium text-orange-500 uppercase">INSIGHTS</span>
                <a href="/blog/event-marketing-strategies" className="block mt-1">
                  <h3 className="text-[22px] leading-[28px] font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">Top 5 Event Marketing Strategies for 2024</h3>
                </a>
              </div>
            </div>
            
            <div className="border-t border-gray-200 my-6"></div>
            
            {/* Third Blog Post */}
            <div className="group w-full max-w-[600px] flex flex-col sm:flex-row-reverse gap-4 sm:gap-6 items-start">
              <a href="/blog/audio-quality-tips" className="hidden md:block w-full sm:w-48 flex-shrink-0 overflow-hidden ml-4" style={{ aspectRatio: '16/9' }}>
                <img 
                  src="/src/assets/Overview (2).png" 
                  alt="Amptive platform features"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </a>
              <div className="flex-1 py-2">
                <span className="text-[15px] font-medium text-blue-600 uppercase">AMPTIVE</span>
                <a href="/blog/audio-quality-tips" className="block mt-1">
                  <h3 className="text-[22px] leading-[28px] font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">Essential Tips for Perfect Audio Quality</h3>
                </a>
              </div>
            </div>

            <div className="border-t border-gray-200 my-6"></div>
            
            {/* Fourth Blog Post */}
            {/* Fourth Blog Post */}
            <div className="group w-full max-w-[600px] flex flex-col sm:flex-row-reverse gap-4 sm:gap-6 items-start">
              <a href="/blog/future-of-live-audio" className="hidden md:block w-full sm:w-48 flex-shrink-0 overflow-hidden ml-4" style={{ aspectRatio: '16/9' }}>
                <img 
                  src="/src/assets/Overview.png" 
                  alt="Audio insights"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </a>
              <div className="flex-1 py-2">
                <span className="text-[15px] font-medium text-orange-500 uppercase">INSIGHTS</span>
                <a href="/blog/future-of-live-audio" className="block mt-1">
                  <h3 className="text-[22px] leading-[28px] font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">The Future of Live Audio Experiences</h3>
                </a>
              </div>
            </div>
            
            <div className="border-t border-gray-200 my-6"></div>
            
            {/* Fifth Blog Post */}
            <div className="group w-full max-w-[600px] flex flex-col sm:flex-row-reverse gap-4 sm:gap-6 items-start">
              <a href="/blog/engaging-audience" className="hidden md:block w-full sm:w-48 flex-shrink-0 overflow-hidden ml-4" style={{ aspectRatio: '16/9' }}>
                <img 
                  src="/src/assets/Overview.png" 
                  alt="Audience engagement insights"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </a>
              <div className="flex-1 py-2">
                <span className="text-[15px] font-medium text-orange-500 uppercase">INSIGHTS</span>
                <a href="/blog/engaging-audience" className="block mt-1">
                  <h3 className="text-[22px] leading-[28px] font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">How to Keep Your Audience Engaged</h3>
                </a>
              </div>
            </div>
            
            <div className="border-t border-gray-200 my-6"></div>
            
            {/* Sixth Blog Post */}
            <div className="group w-full max-w-[600px] flex flex-col sm:flex-row-reverse gap-4 sm:gap-6 items-start">
              <a href="/blog/monetization-strategies" className="hidden md:block w-full sm:w-48 flex-shrink-0 overflow-hidden ml-4" style={{ aspectRatio: '16/9' }}>
                <img 
                  src="/src/assets/Overview (2).png" 
                  alt="Amptive monetization"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </a>
              <div className="flex-1 py-2">
                <span className="text-[15px] font-medium text-blue-600 uppercase">AMPTIVE</span>
                <a href="/blog/monetization-strategies" className="block mt-1">
                  <h3 className="text-[22px] leading-[28px] font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">Monetization Strategies for Creators</h3>
                </a>
              </div>
            </div>
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
