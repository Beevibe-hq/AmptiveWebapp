import React, { useState, useEffect } from 'react';

type MediaType = 'video' | 'gif' | 'image';

// Format date to show day of week if within current week, otherwise show full date
const formatEventDate = (dateString?: string): string => {
  if (!dateString) return '';
  
  const eventDate = new Date(dateString);
  const today = new Date();
  const currentDate = new Date(); // Get current date for comparison
  
  const currentDay = today.getDay();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Calculate start of current week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(currentDate.getDate() - currentDay);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Calculate end of current week (next Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  // Check if event is in current week
  if (eventDate >= startOfWeek && eventDate <= endOfWeek) {
    // Return day name if it's in current week
    return eventDate.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    // Return full date if it's not in current week
    return eventDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
};

interface MediaSource {
  type: MediaType;
  src: string;
  alt?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string; // For video poster image
}

// Format price with Naira symbol and thousand separators
const formatPrice = (price: number): string => {
  return `₦${price.toLocaleString()}`;
};

// Generate a random price between min and max (in thousands)
const generateRandomPrice = (min: number, max: number): number => {
  const random = Math.floor(Math.random() * (max - min + 1)) + min;
  // Round to nearest 500
  return Math.round(random / 500) * 500;
};

interface TicketPrice {
  type: string; // e.g., 'Regular', 'VIP', 'VVIP'
  price: number;
}

interface EventCardProps {
  title: string;
  location: string; // The physical or virtual location where the event will be held
  status?: string; // Status of the event (e.g., 'Upcoming', 'Live Now', 'Registration Open')
  price?: number | TicketPrice[]; // Single price or array of ticket types with prices
  media: MediaSource | string; // Allow string for backward compatibility
  date?: string; // ISO date string (e.g., '2025-07-15T20:00:00')
}

// Fallback SVG when media fails to load
const FallbackImage = () => (
  <div className="aspect-video bg-gray-100 relative items-center justify-center">
    <svg
      className="w-12 h-12 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  </div>
);

const MediaRenderer: React.FC<{ media: MediaSource | string | undefined }> = ({ media }) => {
  const [error, setError] = useState(false);
  const [mediaSource, setMediaSource] = useState<MediaSource | null>(null);

  useEffect(() => {
    // Reset error state when media changes
    setError(false);
    
    // Handle different media input types
    if (!media) {
      setMediaSource(null);
    } else if (typeof media === 'string') {
      // If media is a string, treat it as an image source
      setMediaSource({
        type: 'image',
        src: media,
        alt: 'Event media'
      });
    } else {
      setMediaSource(media);
    }
  }, [media]);

  if (error || !mediaSource) {
    return <FallbackImage />;
  }

  const { type, src, alt = 'Event media', autoplay, loop, muted = true, poster } = mediaSource;
  const videoProps = { autoPlay: autoplay, loop, muted, playsInline: true };

  try {
    switch (type) {
      case 'video':
        return (
          <video
            {...videoProps}
            className="w-full h-full object-cover rounded-lg"
            poster={poster}
            onError={() => setError(true)}
          >
            <source src={src} type={`video/${src.split('.').pop()?.toLowerCase()}`} />
            Your browser does not support the video tag.
          </video>
        );
      case 'gif':
      case 'image':
        return (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover rounded-lg"
            onError={() => setError(true)}
          />
        );
      default:
        return <FallbackImage />;
    }
  } catch (e) {
    console.error('Error rendering media:', e);
    return <FallbackImage />;
  }
};

// List of popular Nigerian locations
const nigerianLocations = [
  'Lekki Phase 1, Lagos',
  'Victoria Island, Lagos',
  'Ikeja, Lagos',
  'Ikoyi, Lagos',
  'Yaba, Lagos',
  'Garki, Abuja',
  'Maitama, Abuja',
  'Wuse, Abuja',
  'GRA, Port Harcourt',
  'GRA, Ilorin',
  'Bodija, Ibadan',
  'GRA, Benin',
  'GRA, Enugu',
  'GRA, Owerri',
  'GRA, Calabar'
];

// Function to get a random Nigerian location
const getRandomLocation = () => {
  const randomIndex = Math.floor(Math.random() * nigerianLocations.length);
  return nigerianLocations[randomIndex];
};

const EventCard: React.FC<EventCardProps> = ({
  title,
  location: propLocation,
  price: propPrice,
  media,
  date
}) => {
  // Use the provided location or get a random one if not provided
  const [location] = React.useState(propLocation || getRandomLocation());
  
  // Format the price or show 'Free' if price is 0 or not provided
  const priceDisplay = React.useMemo(() => {
    // Handle no price or free event
    if (propPrice === undefined || propPrice === 0) {
      return 'Free';
    }
    
    // Handle array of ticket prices
    if (Array.isArray(propPrice) && propPrice.length > 0) {
      const prices = propPrice.map(t => t.price);
      const minPrice = Math.min(...prices);
      return `From ${formatPrice(minPrice)}`;
    }
    
    // Handle single price
    return formatPrice(propPrice as number);
  }, [propPrice]);
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm transition-colors border border-gray-200 hover:border-gray-300 text-sm">
      {/* Media Thumbnail */}
      <div className="relative aspect-square bg-white px-2 pt-2 rounded-t-xl">
        <MediaRenderer media={media} />
      </div>

      {/* Card Content */}
      <div className="p-3">
        {/* Date */}
        {date && (
          <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
            <svg 
              className="w-[1.2em] h-[1.2em] mr-1 text-red-500 -mt-0.5" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
            </svg>
            <span>{formatEventDate(date)}</span>
          </div>
        )}
        
        {/* Title */}
        <h3 className="text-[13px] font-semibold text-gray-900 mt-0.5 line-clamp-2">{title}</h3>
        
        {/* Location */}
        <div className="flex flex-col mb-2">
          <span className="text-xs text-gray-500">Location</span>
          <span className="font-medium text-sm text-gray-600">{location}</span>
        </div>
        
        {/* Price */}
        <div className="mt-1.5 w-full">
          <div className="bg-blue-50 rounded-full py-1 px-3 text-center w-full">
            <span className="font-bold text-xs text-blue-800">
              {priceDisplay}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
