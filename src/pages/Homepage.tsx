import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Star, Calendar, DollarSign } from 'lucide-react';
import QRCodeGenerator from '../components/QRCodeGenerator';
import EventCard from '../components/EventCard';
import brewhouseImage from '../assets/brewhouse.png';
import promoGif from '../assets/GIF promo (1mouth analog) v2.gif';
import karaImage from '../assets/kara.png';

interface HeroSlideProps {
  title: string;
  mobileTitle?: string;
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
  mobileTitle,
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
  isSecondSlide = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  return (
    <div 
      className={`relative rounded-2xl w-[95vw] max-w-[95vw] md:w-[92vw] md:max-w-[92vw] lg:w-[95vw] lg:max-w-[95vw] flex items-start justify-center overflow-hidden bg-gray-100 mt-20 mx-auto py-0 md:py-16 lg:py-20 xl:py-24 ${className}`}
    >
      {/* Background - Image for all slides */}
      <div className="absolute inset-0 w-full h-full">
        {isFirstSlide ? (
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url(${new URL('../assets/OC 11.png', import.meta.url).href})`,
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
                  backgroundImage: `url(${new URL(`../assets/${backgroundImage}`, import.meta.url).href})`,
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
                <div className="flex items-center gap-4 mb-8 p-4 bg-black/10 rounded-lg">
                  <div>
                    <div className="bg-white p-1.5 rounded flex items-center justify-center" style={{ width: '85px', height: '85px' }}>
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=undefined" 
                        alt="QR Code" 
                        width="80" 
                        height="80"
                        className="w-20 h-20"
                      />
                    </div>
                  </div>
                  <div>
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
    backgroundImage: 'OC 12.png',
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
        </div>
        
        {/* Events Grid - 2 rows max on desktop/tablet, horizontal scroll on mobile */}
        <div className="relative">
          {/* Desktop/Tablet Grid (2 rows, 5 cards per row) */}
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-h-[900px] overflow-hidden">
          {/* Example Event Card 1 - Video */}
          <EventCard
            title="Karaoke Traffic Vibes"
            location="Lekki Phase 1, Lagos"
            status="Upcoming"
            price={[
              { type: 'Regular', price: 5000 },
              { type: 'VIP', price: 10000 },
              { type: 'VVIP', price: 20000 }
            ]}
            date="2025-07-12T20:00:00"
            media={{
              type: 'image',
              src: karaImage,
              alt: 'Karaoke Traffic Vibes'
            }}
          />
          
          {/* Example Event Card 2 - GIF */}
          <EventCard
            title="Clinton Flames"
            location="Victoria Island, Lagos"
            status="Upcoming"
            price={10000}
            date="2025-07-13T19:30:00"
            media={{
              type: 'image',
              src: 'https://www.shazam.com/mkimage/image/thumb/AMCArtistImages116/v4/7d/b1/4f/7db14f51-0978-2d7e-9add-f0d205bae318/883bda85-96d8-4515-a288-31e25bd8f216_ami-identity-b4d7093c3e0926436905c4b9df9223c0-2023-03-24T20-43-10.454Z_cropped.png/1552x1552bb.webp',
              alt: 'Clinton Flames'
            }}
          />
          
          {/* Example Event Card 3 - Local Image */}
          <EventCard
            title="1analog Girl"
            location="Ikeja, Lagos"
            status="Live Now"
            price={0}
            date="2025-07-07T22:00:00"
            media={{
              type: 'gif',
              src: promoGif,
              alt: '1analog Girl',
              autoplay: true,
              loop: true
            }}
          />
          
          {/* Example Event Card 4 - Remote Image */}
          <EventCard
            title="Reekado Banks Live In Abuja"
            location="Garki, Abuja"
            status="Registration Open"
            price={[
              { type: 'Early Bird', price: 2000 },
              { type: 'Regular', price: 5000 },
              { type: 'VIP', price: 10000 }
            ]}
            date="2025-07-20T21:00:00"
            media={{
              type: 'image',
              src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1744053819/lv7lfpukvpotznvykopf.webp',
              alt: 'Reekado Banks Live In Abuja'
            }}
          />
          
          {/* Example Event Card 5 - Another Video */}
          <EventCard
            title="House Party/pool Party"
            location="Ikoyi, Lagos"
            status="Live Now"
            price={10000}
            date="2025-07-07T23:30:00"
            media={{
              type: 'image',
              src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751906823/yflortvspnhc5idiol9t.webp',
              alt: 'House Party/pool Party'
            }}
          />
          
          {/* Second Row - New Events */}
          <EventCard
            title="Afrobeat Night Live"
            location="Yaba, Lagos"
            status="Upcoming"
            price={[
              { type: 'Early Bird', price: 3000 },
              { type: 'Regular', price: 5000 },
              { type: 'VIP', price: 8000 }
            ]}
            date="2025-07-25T21:00:00"
            media={{
              type: 'image',
              src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1752002405/mgoz620c4yjyeb0xa6hd.webp',
              alt: 'Afrobeat Night Live',
            }}
          />
          
          <EventCard
            title="Tech Conference 2025"
            location="Maitama, Abuja"
            status="Registration Open"
            price={15000}
            date="2025-08-05T09:00:00"
            media={{
              type: 'image',
              src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751984779/nlhtme0suacdfjyypc8s.webp',
              alt: 'Tech Conference 2025',
            }}
          />
          
          <EventCard
            title="Art Exhibition"
            location="Wuse, Abuja"
            status="Upcoming"
            price={0}
            date="2025-07-30T10:00:00"
            media={{
              type: 'image',
              src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751961673/yzh40wdpkykt96kogcam.webp',
              alt: 'Art Exhibition',
            }}
          />
          
          <EventCard
            title="Food Festival"
            location="GRA, Port Harcourt"
            status="Live Now"
            price={[
              { type: 'Tasting Pass', price: 5000 },
              { type: 'VIP Experience', price: 15000 }
            ]}
            date="2025-07-10T12:00:00"
            media={{
              type: 'image',
              src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751961662/ltctlgwlgfma1hzlfs1q.webp',
              alt: 'Food Festival',
            }}
          />
          
          <EventCard
            title="Jazz Night"
            location="GRA, Ilorin"
            status="Upcoming"
            price={[
              { type: 'Standard', price: 7000 },
              { type: 'VIP', price: 12000 }
            ]}
            date="2025-08-15T20:00:00"
            media={{
              type: 'image',
              src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751666040/dzit74ibwfmtpuwfexme.webp',
              alt: 'Jazz Night',
            }}
          />
          
          {/* Third row removed as per user request */}
          </div>
          
          {/* Show More Button for Desktop/Tablet */}
          <div className="mt-10 w-full hidden sm:block">
            <button className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors duration-200" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
              View more events
            </button>
          </div>
          
          {/* Mobile Layout */}
          <div className="sm:hidden">
            {/* Horizontal Scrollable Cards */}
            <div className="-mx-4 px-4 overflow-x-auto pb-4">
              <div className="flex space-x-4 w-max">
                {[
                  /* First 10 events */
                  {
                    title: "Karaoke Traffic Vibes",
                    location: "Lekki Phase 1, Lagos",
                    status: "Upcoming",
                    price: [
                      { type: 'Regular', price: 5000 },
                      { type: 'VIP', price: 10000 },
                      { type: 'VVIP', price: 20000 }
                    ],
                    date: "2025-07-12T20:00:00",
                    media: {
                      type: 'image',
                      src: karaImage,
                      alt: 'Karaoke Traffic Vibes'
                    }
                  },
                  {
                    title: "Clinton Flames",
                    location: "Victoria Island, Lagos",
                    status: "Upcoming",
                    price: 10000,
                    date: "2025-07-13T19:30:00",
                    media: {
                      type: 'image',
                      src: 'https://www.shazam.com/mkimage/image/thumb/AMCArtistImages116/v4/7d/b1/4f/7db14f51-0978-2d7e-9add-f0d205bae318/883bda85-96d8-4515-a288-31e25bd8f216_ami-identity-b4d7093c3e0926436905c4b9df9223c0-2023-03-24T20-43-10.454Z_cropped.png/1552x1552bb.webp',
                      alt: 'Clinton Flames'
                    }
                  },
                  {
                    title: "1analog Girl",
                    location: "Ikeja, Lagos",
                    status: "Live Now",
                    price: 0,
                    date: "2025-07-07T22:00:00",
                    media: {
                      type: 'gif',
                      src: promoGif,
                      alt: '1analog Girl',
                      autoplay: true,
                      loop: true
                    }
                  },
                  {
                    title: "Reekado Banks Live In Abuja",
                    location: "Garki, Abuja",
                    status: "Registration Open",
                    price: [
                      { type: 'Early Bird', price: 2000 },
                      { type: 'Regular', price: 5000 },
                      { type: 'VIP', price: 10000 }
                    ],
                    date: "2025-07-20T21:00:00",
                    media: {
                      type: 'image',
                      src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1744053819/lv7lfpukvpotznvykopf.webp',
                      alt: 'Reekado Banks Live In Abuja'
                    }
                  },
                  {
                    title: "House Party/pool Party",
                    location: "Ikoyi, Lagos",
                    status: "Live Now",
                    price: 10000,
                    date: "2025-07-07T23:30:00",
                    media: {
                      type: 'image',
                      src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751906823/yflortvspnhc5idiol9t.webp',
                      alt: 'House Party/pool Party'
                    }
                  },
                  {
                    title: "Afrobeat Night Live",
                    location: "Yaba, Lagos",
                    status: "Upcoming",
                    price: [
                      { type: 'Early Bird', price: 3000 },
                      { type: 'Regular', price: 5000 },
                      { type: 'VIP', price: 8000 }
                    ],
                    date: "2025-07-25T21:00:00",
                    media: {
                      type: 'image',
                      src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1752002405/mgoz620c4yjyeb0xa6hd.webp',
                      alt: 'Afrobeat Night Live'
                    }
                  },
                  {
                    title: "Tech Conference 2025",
                    location: "Maitama, Abuja",
                    status: "Registration Open",
                    price: 15000,
                    date: "2025-08-05T09:00:00",
                    media: {
                      type: 'image',
                      src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751984779/nlhtme0suacdfjyypc8s.webp',
                      alt: 'Tech Conference 2025'
                    }
                  },
                  {
                    title: "Art Exhibition",
                    location: "Wuse, Abuja",
                    status: "Upcoming",
                    price: 0,
                    date: "2025-07-30T10:00:00",
                    media: {
                      type: 'image',
                      src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751961673/yzh40wdpkykt96kogcam.webp',
                      alt: 'Art Exhibition'
                    }
                  },
                  {
                    title: "Food Festival",
                    location: "GRA, Port Harcourt",
                    status: "Live Now",
                    price: [
                      { type: 'Tasting Pass', price: 5000 },
                      { type: 'VIP Experience', price: 15000 }
                    ],
                    date: "2025-07-10T12:00:00",
                    media: {
                      type: 'image',
                      src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751961662/ltctlgwlgfma1hzlfs1q.webp',
                      alt: 'Food Festival'
                    }
                  },
                  {
                    title: "Jazz Night",
                    location: "GRA, Ilorin",
                    status: "Upcoming",
                    price: [
                      { type: 'Standard', price: 7000 },
                      { type: 'VIP', price: 12000 }
                    ],
                    date: "2025-08-15T20:00:00",
                    media: {
                      type: 'image',
                      src: 'https://res.cloudinary.com/tix-africa/image/upload/f_webp,fl_lossy,q_70/v1751666040/dzit74ibwfmtpuwfexme.webp',
                      alt: 'Jazz Night'
                    }
                  }
                ].map((event, index) => (
                  <div key={index} className="w-64 flex-shrink-0">
                    <EventCard
                      title={event.title}
                      status={event.status}
                      price={event.price}
                      date={event.date}
                      media={event.media}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Show More Button for Mobile - Now outside the scrollable area */}
            <div className="mt-6 w-full px-4">
              <button className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors duration-200">
                View more events
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of the homepage content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Add your homepage sections here */}
      </div>
    </div>
  );
};

export default Homepage;
