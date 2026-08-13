import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {  Calendar, MapPin, Image as ImageIcon, Ticket, Upload, Sparkles, Globe, RefreshCw, X, Plus, Edit2, Trash2 , Loader2, ChevronDown, Users, Search, Wallet } from "lucide-react";
import { toastError, toastSuccess } from '@/lib/ui/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { getEvent, createEvent as createNewEvent, updateEvent, publishEvent } from '@/lib/api/events';
import { getTicketsForEvent, createTicket as createNewTicket, updateTicket, deleteTickets, EventTicket, TicketTheme } from '@/lib/api/tickets';
import { createVenue, type VenueCreateRequest } from '@/lib/api/venues';
import { getCurrentUser, refreshSession } from '@/lib/api/auth';
import { getMyCommunities, listCommunities, type Community } from '@/lib/api/communities';
import RichTextEditor from '@/components/RichTextEditor';
import VenueSelector from '@/components/VenueSelector';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api/client';
import { uploadImage } from '@/lib/api/storage';
import { AmptiveSplash } from '@/components/AmptiveSpinner';


const TICKET_THEMES: Record<TicketTheme, {
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



type AvailabilityStatus = 'Available' | 'Almost Sold Out' | 'Limited Spots' | 'Sold Out';

type FormState = {
  title: string;
  summary: string;
  description: string;
  startDateTime: string | null;
  endDateTime: string | null;
  venue: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  coverImage: string;
  locationType: 'physical' | 'online';
  venueId: string | null;
  venueType?: 'physical' | 'virtual' | null;
  draftVenue: VenueCreateRequest | null;
  tickets: EventTicket[];
  showType: 'free' | 'paid';
  price: number;
  handRaising: boolean;
  allowWhispers: boolean;
  communityId: string | null;
};

const GALLERY_IMAGES = [
  '/images/2684.jpg',
  '/images/merrychristmas.jpg',
  '/images/Darkangel.jpg',
  '/images/DriveVice.jpg',
  '/images/clouds.jpg',
  '/images/love.jpg',
  '/images/render.jpg',
  'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800',
];

const LUMA_GALLERY_CATEGORIES = [
  {
    name: 'Featured',
    images: [
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/de/a12a3146-d8ca-4e7d-865b-772a559a0a14',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/xi/9ab80c47-70bf-4d4d-8b76-f983b49b7c71.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/rr/9368bcbe-4579-46d3-b341-b5330215ebee',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/z8/63471081-717f-4230-8d6c-6d76aeab5e08',
    ],
  },
  {
    name: 'Business',
    images: [
      '/images/gallery/business/money-flower.png',
      '/images/gallery/business/watering-money-growth.png',
      '/images/gallery/business/growth-chart-hands.png',
      '/images/gallery/business/strategy-notes-head.png',
      '/images/gallery/business/team-lightbulb.png',
      '/images/gallery/business/team-pie-chart.png',
      '/images/gallery/business/build-letters.png',
      '/images/gallery/business/network-person.png',
      '/images/gallery/business/upward-arrow-breakthrough.png',
      '/images/gallery/business/strategy-mountain.png',
      '/images/gallery/business/coin-stair-growth.png',
    ],
  },
  {
    name: 'Tech',
    images: [
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/yd/c8ded50f-24e7-4af0-aeb2-9bac97712e4c.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/x4/232b7986-33f1-4753-928d-84910cd55dd8.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/sx/81dcf961-c47a-4474-a332-2640c211ac3e.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/ve/ab94b70b-d954-410a-b686-1a32c74a4d75.png',
    ],
  },
  {
    name: 'Party',
    images: [
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/vt/318de18d-3cb8-4b4e-ae3b-60e03f671ee2.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/qk/a33323fb-d69b-45c5-9362-3a49dc9b4cbc.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/di/5eed6028-6641-4564-8544-731c4d29371e.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/u1/3ad47c7f-bae0-4396-aa9f-29522aab4084.png',
    ],
  },
  {
    name: 'Music',
    images: GALLERY_IMAGES.slice(7, 12),
  },
  {
    name: 'Sports',
    images: [
      '/images/gallery/sports/football-classic.png',
      '/images/gallery/sports/run-with-us.png',
      '/images/gallery/sports/formula-watch-party.png',
      '/images/gallery/sports/speed-is-everything.png',
      '/images/gallery/sports/f1-speed.png',
      '/images/gallery/sports/f1-front-dark.png',
      '/images/gallery/sports/f1-distant-dark.png',
      '/images/gallery/sports/f1-red-line.png',
      '/images/gallery/sports/f1-red-glow.png',
      '/images/gallery/sports/race-weekend.png',
      '/images/gallery/sports/goal-green.png',
      '/images/gallery/sports/game-day.png',
      '/images/gallery/sports/football-neon.png',
    ],
  },
  {
    name: 'School',
    images: [
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/qz/95e54594-3503-4a28-96be-a84452f1d13b.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/an/1a84247d-82e8-4605-867d-5231fd102404.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/6s/4151ebf4-08f7-454f-ad5f-a584cdda0619.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/45/c841ec5a-04b9-4ea4-9bc1-6c6d94b1ae48',
    ],
  },
  {
    name: 'Invitations',
    images: [
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/1y/9ba31350-4f83-4d92-b6af-adfc0da51d82.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/17/53eb7aa8-96be-4ea7-b52e-da82c82c445c.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/mn/1f9bb9ed-4d81-47da-b62e-74320ef3b85a.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/iy/34245b63-83d8-4645-bade-2b92ba69bd79.gif',
    ],
  },
  {
    name: 'Women',
    images: [
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/3b/bb4d566a-1780-43d2-ade8-ca82fa8b9986.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/02/7f5096be-e7ee-4631-b699-d215d4f3818d.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/yf/e6c839a1-a1f9-4187-afca-5a539862338d.png',
      'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,anim=false,background=white,quality=75,width=600,height=600/gallery-images/nn/8ce964b2-0ce2-4cfd-b26e-2a9c25ce2695.png',
    ],
  },
];

const buildInitialFormState = (): FormState => {
  return {
    title: '',
    summary: '',
    description: '',
    startDateTime: null,
    endDateTime: null,
    venue: '',
    city: '',
    latitude: null,
    longitude: null,
    coverImage: '',
    locationType: 'physical',
    venueId: null,
    venueType: null,
    draftVenue: null,
    tickets: [],
    showType: 'free',
    price: 0,
    handRaising: false,
    allowWhispers: false,
    communityId: null,
  };
};

// Helper functions for tickets
const formatTicketPrice = (price: number, currency: string = 'NGN'): string => {
  if (price === 0) return 'Free';
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
  });
  return formatter.format(price);
};

const formatCompactPrice = (price: number, currency: string = 'NGN'): string => {
  if (price === 0) return 'Free';

  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  if (price >= 1000000) {
    return formatter.format(price / 1000000).replace(currency, '').trim() + 'M';
  }
  if (price >= 100000) {
    return formatter.format(price / 1000).replace(currency, '').trim() + 'K';
  }

  return formatTicketPrice(price, currency);
};

const deriveEventPrice = (tickets: EventTicket[]): number => {
  if (tickets.length === 0) return 0;  
  return Math.min(...tickets.map(t => t.price));
};

const deriveTicketBenefits = (ticket: EventTicket): string[] => {
  if (ticket.benefits && ticket.benefits.length > 0) {
    return ticket.benefits;
  }

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

  if (label.includes('general') || label.includes('standard') || label.includes('regular') || benefits.size === 0) {
    benefits.add('Guaranteed entry to the event');
    benefits.add('Access to all main stage performances');
  }

  if (ticket.price === 0) {
    benefits.add('No payment required at entry');
  }

  return Array.from(benefits);
};

const deriveAvailabilityStatus = (ticket: EventTicket, index: number): AvailabilityStatus => {
  const total = ticket.quantity_total;
  const sold = ticket.quantity_sold ?? 0;
  const remaining = ticket.quantity_remaining ?? (ticket.quantity !== undefined ? ticket.quantity : null);
  
  if (remaining !== null && remaining <= 0) return 'Sold Out';
  if (total !== null && total <= 0) return 'Sold Out';
  if (total !== null && sold >= total) return 'Sold Out';

  const label = ticket.label?.toLowerCase() ?? '';
  if (label.includes('sold out')) return 'Sold Out';
  if (ticket.price === 0 || label.includes('free') || label.includes('general') || label.includes('standard') || label.includes('regular')) {
    return 'Available';
  }
  if (label.includes('vip') || label.includes('table') || ticket.price >= 200) {
    return 'Limited Spots';
  }
  if (label.includes('early') || label.includes('pre-sale')) {
    return 'Almost Sold Out';
  }
  const AVAILABILITY_SEQUENCE: AvailabilityStatus[] = ['Available', 'Limited Spots', 'Almost Sold Out'];
  return AVAILABILITY_SEQUENCE[index % AVAILABILITY_SEQUENCE.length];
};

const AVAILABILITY_BADGE_CLASSES: Record<AvailabilityStatus, string> = {
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Almost Sold Out': 'border-amber-200 bg-amber-50 text-amber-700',
  'Limited Spots': 'border-orange-200 bg-orange-50 text-orange-700',
  'Sold Out': 'border-rose-200 bg-rose-50 text-rose-700',
};

const CreateEvent = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState<FormState>(() => buildInitialFormState());
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<string>('');
  const [coverPreviewError, setCoverPreviewError] = useState(false);
  const [coverPreview, setCoverPreview] = useState('');
  const [activeTheme, setActiveTheme] = useState(0);
  const [requireApproval, setRequireApproval] = useState(false);
  const [visibleGalleryImages, setVisibleGalleryImages] = useState<string[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [communityMenuOpen, setCommunityMenuOpen] = useState(false);
  const { dominantColor, setDominantColor } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const communityMenuRef = useRef<HTMLDivElement | null>(null);
  const filePreviewUrlRef = useRef<string | null>(null);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const coverInputId = useMemo(() => `cover-upload-${Math.random().toString(36).slice(2)}`, []);


  // Mobile modal states
  const [showMobileUploadOptions, setShowMobileUploadOptions] = useState(false);
  const [showMobileGallery, setShowMobileGallery] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [gallerySearch, setGallerySearch] = useState('');
  const [activeGalleryCategory, setActiveGalleryCategory] = useState(LUMA_GALLERY_CATEGORIES[0].name);
  const [mobileTab, setMobileTab] = useState<'details' | 'preview'>('details');

  // Ticket management state
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState<{
    title: string;
    price: string;
    currency: string;
    benefits: string;
    color_theme: TicketTheme;
    quantity: string;
  }>({
    title: '',
    price: '',
    currency: 'NGN',
    quantity: '',
    benefits: '',
    color_theme: 'silver',
  });

  const normalizeTicketEarlyBird = (ticket: EventTicket): EventTicket => {
    const rawTicket = ticket as EventTicket & Record<string, any>;
    const earlyBirdUnits = rawTicket.early_bird_max_count ?? rawTicket.early_bird_units ?? rawTicket.early_bird_quantity ?? rawTicket.earlyBirdUnits ?? rawTicket.earlyBirdQuantity;
    const earlyBirdDiscount = rawTicket.early_bird_discount_percent ?? rawTicket.early_bird_discount_percentage ?? rawTicket.early_bird_discount ?? rawTicket.earlyBirdDiscountPercentage ?? rawTicket.earlyBirdDiscount;
    const hasEarlyBird = Boolean(
      rawTicket.has_early_bird ??
      rawTicket.early_bird_enabled ??
      rawTicket.earlyBirdEnabled ??
      (earlyBirdUnits !== undefined && earlyBirdUnits !== null && Number(earlyBirdUnits) > 0 && earlyBirdDiscount !== undefined && earlyBirdDiscount !== null && Number(earlyBirdDiscount) > 0)
    );

    return {
      ...ticket,
      has_early_bird: hasEarlyBird,
      early_bird_units: earlyBirdUnits !== undefined && earlyBirdUnits !== null ? Number(earlyBirdUnits) : undefined,
      early_bird_discount_percentage: earlyBirdDiscount !== undefined && earlyBirdDiscount !== null ? Number(earlyBirdDiscount) : undefined,
    };
  };

  const buildTicketPayload = (ticket: EventTicket, options: { includePhysical?: boolean } = {}) => {
    const earlyBirdUnits = ticket.has_early_bird && ticket.early_bird_units && ticket.early_bird_units > 0 ? ticket.early_bird_units : null;
    const earlyBirdDiscount = ticket.has_early_bird && ticket.early_bird_discount_percentage && ticket.early_bird_discount_percentage > 0 ? ticket.early_bird_discount_percentage : null;
    const quantityTotal = ticket.quantity !== undefined && ticket.quantity !== null && ticket.quantity !== '' ? Number(ticket.quantity) : null;

    const payload = {
      label: ticket.label || ticket.title,
      price: ticket.price,
      currency: ticket.currency,
      quantity_total: quantityTotal,
      benefits: ticket.benefits,
      color_theme: ticket.color_theme,
      early_bird_discount_percent: earlyBirdDiscount,
      early_bird_max_count: earlyBirdUnits,
    };

    return options.includePhysical ? { ...payload, is_physical: false } : payload;
  };

  // Ticket handlers
  const handleAddTicket = () => {
    setTicketForm({ title: '', price: '', currency: 'NGN', benefits: '', color_theme: 'silver', quantity: '' });
    setEditingTicketId(null);
    setMobileTab('details');
    setShowTicketForm(true);
  };

  const handleEditTicket = (ticket: EventTicket) => {
    setTicketForm({
      title: ticket.label,
      price: ticket.price.toString(),
      currency: ticket.currency,
      benefits: ticket.benefits?.join('\n') ?? "",
      color_theme: ticket.color_theme || 'silver',
      quantity: ticket.quantity?.toString() || '',
    });
    setEditingTicketId(ticket.id);
    setMobileTab('details');
    setShowTicketForm(true);
  };

  const handleSaveTicket = () => {
    if (!ticketForm.title.trim()) {
      toastError('Please enter a ticket title');
      return;
    }

    const price = parseFloat(ticketForm.price) || 0;
    if (price <= 0) {
      toastError('Ticket price must be greater than 0');
      return;
    }
    // Empty quantity means unlimited inventory.
    const quantity = ticketForm.quantity ? parseInt(ticketForm.quantity) : undefined;
    const benefits = ticketForm.benefits
      .split('\n')
      .map(b => b.trim())
      .filter(Boolean);

    if (editingTicketId) {
      setForm(prev => ({
        ...prev,
        showType: 'paid',
        tickets: prev.tickets.map(t =>
          t.id === editingTicketId
            ? { ...t, label: ticketForm.title, title: ticketForm.title, price, currency: ticketForm.currency, benefits, color_theme: ticketForm.color_theme, quantity }
            : t
        ),
        price: deriveEventPrice(prev.tickets.map(t =>
          t.id === editingTicketId
            ? { ...t, label: ticketForm.title, title: ticketForm.title, price, currency: ticketForm.currency, benefits, color_theme: ticketForm.color_theme, quantity }
            : t
        )),
      }));
    } else {
      const newTicket: EventTicket = {
        id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        label: ticketForm.title,
        title: ticketForm.title,
        price,
        currency: ticketForm.currency,
        benefits,
        color_theme: ticketForm.color_theme,
        quantity,
        event_id: '',
        quantity_total: quantity ?? null,
        quantity_sold: 0,
        quantity_remaining: quantity ?? 0,
        reserved_quantity: 0,
        is_active: false,
        has_early_bird: false
      };
      setForm(prev => ({ ...prev, showType: 'paid', tickets: [...prev.tickets, newTicket], price: deriveEventPrice([...prev.tickets, newTicket]) }));
    }

    setShowTicketForm(false);
    setTicketForm({ title: '', price: '', currency: 'NGN', benefits: '', color_theme: 'silver', quantity: '' });
    setEditingTicketId(null);
  };

  const handleDeleteTicket = (ticketId: string) => {
    setForm(prev => {
      const remaining = prev.tickets.filter(t => t.id !== ticketId);
      return {
        ...prev,
        showType: remaining.length > 0 ? 'paid' : 'free',
        tickets: remaining,
        price: deriveEventPrice(remaining),
      };
    });
  };

  const handleCancelTicketForm = () => {
    setShowTicketForm(false);
    setTicketForm({ title: '', price: '', currency: 'NGN', benefits: '', color_theme: 'silver', quantity: '' });
    setEditingTicketId(null);
  };

  // Helper to extract average color from image
  const getAverageColor = async (imageUrl: string): Promise<{ r: number; g: number; b: number } | null> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'Anonymous';
      const isExternal = /^https?:\/\//.test(imageUrl);
      img.src = isExternal
        ? api.getProxiedImageUrl(imageUrl)
        : imageUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        canvas.width = 1;
        canvas.height = 1;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        resolve({ r, g, b });
      };
      img.onerror = () => resolve(null);
    });
  };

  useEffect(() => {
    setDominantColor(null);
  }, [setDominantColor]);

  useEffect(() => {
    const shuffled = [...GALLERY_IMAGES].sort(() => 0.5 - Math.random());
    setVisibleGalleryImages(shuffled.slice(0, 5));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.user_id);
          if (!id && !user.is_wallet_setup) {
            setShowWalletPrompt(true);
          }
          setReady(true);
        } else {
          const refreshed = await refreshSession();
          if (!refreshed.data) {
            if (!cancelled) {
              toastError('Please sign in to create an event.');
            }
          } else {
            const u = await getCurrentUser()
            setUserId(u?.user_id || '');
            if (u && !id && !u.is_wallet_setup) {
              setShowWalletPrompt(true);
            }
            setReady(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch session', error);
        if (!cancelled) {
          toastError('We could not verify your session. Please sign in again.');
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    const loadCommunities = async () => {
      setLoadingCommunities(true);
      try {
        const ownedCommunities = await getMyCommunities().catch(() => []);
        const communityData = ownedCommunities.length > 0
          ? ownedCommunities
          : await listCommunities({ page_size: 100 }).catch(() => []);
        if (!cancelled) {
          setCommunities(communityData || []);
        }
      } finally {
        if (!cancelled) setLoadingCommunities(false);
      }
    };

    loadCommunities();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    if (!communityMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!communityMenuRef.current?.contains(event.target as Node)) {
        setCommunityMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [communityMenuOpen]);

  useEffect(() => {
    if (!ready || !id || !userId) return;

    const fetchEventData = async () => {
      // Helper for formatting DB dates to datetime-local input
      const safeFormat = (iso: string | null | undefined) => {
        if (!iso) return '';
        try {
          const d = new Date(iso);
          if (isNaN(d.getTime())) return '';
          // Ensure it's in the correct format for <input type="datetime-local" />
          // Which is YYYY-MM-DDThh:mm (ISO localized)
          const pad = (n: number) => n.toString().padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch (e) {
          return '';
        }
      };

      setLoadingEvent(true);
      try {
        const event = await getEvent(id);
        if (!event) throw new Error('Event not found');

        if (event.host?.user_id !== userId) {
          toastError("You don't have permission to edit this event.");
          navigate('/dashboard/events');
          return;
        }

        const tickets = await getTicketsForEvent(id);        
        
        setForm(prev => ({
          ...prev,
          title: event.title || '',
          description: event.description || '',
          startDateTime: safeFormat(event.scheduled_for),
          endDateTime: safeFormat(event.ended_at),
          coverImage: event.thumbnail_url || '',
          price: deriveEventPrice(tickets || []),
          tickets: (tickets || []).map(t => normalizeTicketEarlyBird({
            ...t,
            quantity: t.quantity_total !== null && t.quantity_total !== undefined ? t.quantity_total : undefined
          })),
          handRaising: event.hand_raising!,
          communityId: event.community?.community_id || null,
          showType: event.show_type!,
          venueId: event.venue?.venue_id || null,
          venueType: event.venue?.venue_type || null,
          draftVenue: null,
          locationType: event.venue?.venue_type === 'virtual' ? 'online' : 'physical'
        }));

        console.log("kkk", form);
        
        setEventStatus(event.status || 'draft');
        setCoverPreview(event.thumbnail_url || '');
      } catch (error) {
        console.error('Error fetching event for edit:', error);
        toastError('Failed to load event data.');
      } finally {
        setLoadingEvent(false);
      }
    };

    fetchEventData();
  }, [id, ready, userId, navigate]);

  useEffect(() => {
    setCoverPreview(form.coverImage);
    setCoverPreviewError(false);
  }, [form.coverImage]);

  useEffect(() => () => {
    if (filePreviewUrlRef.current) {
      URL.revokeObjectURL(filePreviewUrlRef.current);
    }
  }, []);

  const handleChange = (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const [coverFile, setCoverFile] = useState<File | null>(null);

  // ... (existing state)

  const handleCoverFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (filePreviewUrlRef.current) {
      URL.revokeObjectURL(filePreviewUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    filePreviewUrlRef.current = objectUrl;
    setForm(prev => ({ ...prev, coverImage: objectUrl }));
    setCoverPreview(objectUrl);
    setCoverFile(file); // Store the file for upload
    setCoverPreviewError(false);
    setShowImagePicker(false);
    setShowMobileUploadOptions(false);
    setShowMobileGallery(false);
    event.target.value = '';
  };

  const handleCoverKeyDown = (event: React.KeyboardEvent<HTMLLabelElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleRequireApprovalToggle = () => {
    setRequireApproval((current) => !current);
  };

  const handleGallerySelect = (url: string) => {
    setForm(prev => ({ ...prev, coverImage: url }));
    setShowImagePicker(false);
    setShowMobileGallery(false);
  };

  const handleGalleryRefresh = () => {
    const shuffled = [...GALLERY_IMAGES].sort(() => 0.5 - Math.random());
    setVisibleGalleryImages(shuffled.slice(0, 5));
  };

  const handleCoverClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Check if mobile (using simple width check or just always showing options on small screens)
    if (window.innerWidth < 1024) { // lg breakpoint
      setShowMobileUploadOptions(true);
    } else {
      setShowImagePicker(true);
    }
  };

  const timeZoneMeta = useMemo(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    const now = new Date();
    const offsetMinutes = -now.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
    const minutes = String(absMinutes % 60).padStart(2, '0');
    const offsetLabel = `GMT${sign}${hours}:${minutes}`;
    const region = tz.replace('_', ' ');
    return { offsetLabel, timeZone: region };
  }, []);

  const uploadCoverImage = async (file: File): Promise<string> => {

    try {
      const publicUrl = await uploadImage(file, 'livestream-banner');
      console.log('UPLOAD SUCCESS:', publicUrl);
      return publicUrl;
    } catch (err: any) {
      console.error('Upload failed:', err);
      throw new Error(`Upload failed: ${err.message}`);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    if (!form.title.trim()) {
      toastError('Please provide an event title before scheduling.');
      return;
    }
    if (!form.communityId) {
      toastError('Please select a community before scheduling.');
      return;
    }
    if (!form.startDateTime) {
      toastError('Please set a start date and time before publishing.');
      return;
    }
    if (new Date(form.startDateTime) <= new Date()) {
      toastError('Start date and time must be in the future.');
      return;
    }
    if (form.venueType !== 'virtual' && !form.endDateTime) {
      toastError('Please set an end date and time before scheduling this physical event.');
      return;
    }
    setPublishing(true);
    const result = await publishEvent(id, new Date(form.startDateTime).toISOString());
    setPublishing(false);
    if (result.ok) {
      toastSuccess('Event published!');
      setEventStatus('published');
    } else {
      toastError(result.error || 'Failed to publish event');
    }
  };

  const saveEvent = async ({ asDraft = false }: { asDraft?: boolean } = {}) => {
    if (!userId) return;

    const isDraftEdit = !!id && eventStatus.toLowerCase() === 'draft';
    const relaxedDraftSave = asDraft || isDraftEdit;
    const trimmedTitle = form.title.trim() || (relaxedDraftSave ? 'Untitled Event' : '');
    if (!trimmedTitle) {
      toastError('Please provide an event title.');
      return;
    }

    if (!relaxedDraftSave && !form.communityId) {
      toastError('Please select a community.');
      return;
    }

    const isPublished = id && eventStatus.toLowerCase() !== 'draft';

    let startTime: Date | null = null;
    if (form.startDateTime) {
      startTime = new Date(form.startDateTime);
      if (Number.isNaN(startTime.getTime())) {
        toastError('Start time is invalid.');
        return;
      }
    } else if (!relaxedDraftSave && isPublished) {
      toastError('Published events must have a start date. You cannot unset it.');
      return;
    }

    const isPhysicalEvent = form.venueType !== 'virtual';
    if (!relaxedDraftSave && isPhysicalEvent && !form.endDateTime) {
      toastError('Please set an end date and time for physical events.');
      return;
    }

    let endTimeIso: string | undefined = undefined;
    if (form.endDateTime) {
      const endTime = new Date(form.endDateTime);
      if (Number.isNaN(endTime.getTime())) {
        toastError('End time is invalid.');
        return;
      }
      if (startTime && endTime <= startTime) {
        toastError('End time must be after the start time.');
        return;
      }
      endTimeIso = endTime.toISOString();
    }

    if (asDraft) {
      setSavingDraft(true);
    } else {
      setSubmitting(true);
    }
    try {
      let coverImageUrl = form.coverImage;

      if (coverFile) {
        try {
          coverImageUrl = await uploadCoverImage(coverFile);
        } catch (uploadError: any) {
          toastError('Failed to upload cover image. Please try again.');
          if (asDraft) {
            setSavingDraft(false);
          } else {
            setSubmitting(false);
          }
          return;
        }
      }

      let resolvedVenueId = form.venueId;
      if (form.draftVenue && form.venueId?.startsWith('draft-')) {
        const venueResult = await createVenue(form.draftVenue);
        if (venueResult.id) {
          resolvedVenueId = venueResult.id;
        }
      }
      if (form.venueType === 'virtual') {
        resolvedVenueId = null;
      }

      const insertPayload = {
        title: trimmedTitle,
        description: form.description.trim() || undefined,
        thumbnail_url: coverImageUrl.trim() || undefined,
        show_type: form.showType,
        price: form.price,
        scheduled_for: startTime ? startTime.toISOString() : undefined,
        ended_at: endTimeIso,
        hand_raising: form.handRaising,
        allow_whispers: form.allowWhispers,
        community_id: form.communityId || undefined,
        venue_id: resolvedVenueId || null,
      };

      console.log('Submitting event payload:', insertPayload);

      let eventId = id;
      if (id) {
        const result = await updateEvent(id, insertPayload);
        if (!result.ok) {
          console.error('Failed to update event', result.error);
          toastError(result.error || 'We could not update this event. Please try again.');
          return;
        }
      } else {
        const result = await createNewEvent(insertPayload);
        if (!result.id) {
          toastError('Event was created but we could not retrieve its ID.');
          return;
        }
        eventId = result.id;
      }

      // Handle tickets
      if (eventId) {
        const currentTickets = id ? await getTicketsForEvent(eventId) : [];
        const currentTicketIds = (currentTickets || []).map(t => t.id);
        const formTicketIds = new Set(form.tickets.map(t => t.id).filter(id => !id.startsWith('ticket-')));
        const ticketsToDelete = currentTicketIds.filter(tid => !formTicketIds.has(tid));

        if (ticketsToDelete.length > 0) {
          await deleteTickets(ticketsToDelete);
        }
      }

      // Insert or Update tickets
      if (form.tickets.length > 0 && eventId) {
        const newTickets = form.tickets.filter(t => t.id.startsWith('ticket-'));
        const existingTickets = form.tickets.filter(t => !t.id.startsWith('ticket-'));

        // Insert new tickets (one at a time - no bulk)
        if (newTickets.length > 0) {
          for (const ticket of newTickets) {
            const ticketPayload = buildTicketPayload(ticket, { includePhysical: true });

            await createNewTicket(ticketPayload, eventId);
          }
        }

        // Update existing tickets
        if (existingTickets.length > 0) {
          for (const ticket of existingTickets) {
            await updateTicket(ticket.id, buildTicketPayload(ticket));
          }
        }
      }

      toastSuccess(asDraft ? 'Draft saved successfully!' : (id ? 'Event updated successfully!' : 'Event created successfully!'));
      if (!id) {
        if (asDraft && eventId) {
          navigate(`/dashboard/events/${eventId}/edit`);
          return;
        }
        setForm(buildInitialFormState());
        setCoverFile(null);
        setActiveTheme(0);
      }
      if (!asDraft) {
        navigate(`/dashboard/events`);
      }
    } catch (error) {
      console.error('Unexpected error while creating event', error);
      toastError('Something went wrong. Please try again.');
    } finally {
      if (asDraft) {
        setSavingDraft(false);
      } else {
        setSubmitting(false);
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveEvent();
  };

  const handleSaveDraft = async () => {
    await saveEvent({ asDraft: true });
  };

  const datetimeValue = (value: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const nowIsoLocal = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  // Derived state for preview
  const previewDateLabel = useMemo(() => {
    if (!form.startDateTime) return 'Date';
    const date = new Date(form.startDateTime);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  }, [form.startDateTime]);

  const previewTimeLabel = useMemo(() => {
    if (!form.startDateTime) return 'Time';
    const date = new Date(form.startDateTime);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }, [form.startDateTime]);

  const visibleGalleryCategories = useMemo(() => {
    const query = gallerySearch.trim().toLowerCase();
    if (!query) return LUMA_GALLERY_CATEGORIES;
    return LUMA_GALLERY_CATEGORIES.filter(category => category.name.toLowerCase().includes(query));
  }, [gallerySearch]);
  const currentGalleryCategory = LUMA_GALLERY_CATEGORIES.find(category => category.name === activeGalleryCategory) || LUMA_GALLERY_CATEGORIES[0];
  const pickerImages = gallerySearch.trim()
    ? visibleGalleryCategories.flatMap(category => category.images)
    : currentGalleryCategory.images;

  if (!ready || loadingEvent) {
    return (
      <AmptiveSplash />
    );
  }

  const isPublished = !!id && eventStatus.toLowerCase() !== 'draft';
  const selectedCommunity = communities.find(community => community.community_id === form.communityId);

  if (showWalletPrompt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-100/90 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[32px] w-full max-w-[440px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
          
          <div className="mb-8">
            <img
              src="/images/finance/wallet-setup-illustration.svg"
              alt="Wallet Setup"
              className="mx-auto h-[120px] w-auto object-contain"
            />
          </div>
          
          <h2 className="text-[28px] leading-[1.2] tracking-tight mb-8">
            <span className="text-gray-500 font-medium">Seamless payouts for your events. </span>
            <span className="text-black font-bold">Set up your wallet.</span>
          </h2>
          
          <button
            onClick={() => navigate('/dashboard/finance')}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-[15px] font-bold text-white hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] mb-6"
          >
            <svg width="24" height="24" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M27.5 19.7727C27.5 22.9107 24.9562 25.4545 21.8182 25.4545H8.18182C5.04384 25.4545 2.5 22.9107 2.5 19.7727V10.6818C2.5 7.54384 5.04384 5 8.18182 5H21.8182C24.9562 5 27.5 7.54384 27.5 10.6818V19.7727ZM8.18182 7.03409H21.8182C23.8328 7.03409 25.4659 8.66723 25.4659 10.6818V11.8182H21.8182C19.9354 11.8182 18.4091 13.3445 18.4091 15.2273C18.4091 17.1101 19.9354 18.6364 21.8182 18.6364H25.4659V19.7727C25.4659 21.7873 23.8328 23.4205 21.8182 23.4205H8.18182C6.16723 23.4205 4.53409 21.7873 4.53409 19.7727V10.6818C4.53409 8.66723 6.16723 7.03409 8.18182 7.03409ZM25.4659 16.6023V13.8523H21.8182C21.0588 13.8523 20.4432 14.4679 20.4432 15.2273C20.4432 15.9867 21.0588 16.6023 21.8182 16.6023H25.4659Z" fill="white"/>
            </svg>
            Set up Wallet
          </button>
          
          <p className="text-[11px] text-gray-400 leading-relaxed px-4">
            By clicking "Set up Wallet", you will be redirected to the finance dashboard. Or you can <button onClick={() => navigate(-1)} className="underline hover:text-gray-600 transition-colors">Go back</button>.
          </p>
          
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen selection:bg-blue-100 selection:text-blue-900 font-sans relative">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none transition-colors duration-1000"
        style={{
          backgroundColor: dominantColor
            ? `rgba(${dominantColor.r},${dominantColor.g},${dominantColor.b},0.08)`
            : '#ffffff'
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-4 md:px-6 py-4 lg:py-6 pt-20 lg:pt-24">
        <div className="flex flex-col-reverse lg:flex-row gap-6 lg:gap-12 items-start">

          {/* Main Form Area */}
          <main className="flex-1 max-w-2xl w-full">
            <div className="mb-6 lg:px-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {id ? 'Edit Event' : 'Create New Event'}
              </h1>
              <p className="mt-1 text-[15px] text-gray-600">
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom-4 duration-700 fade-in">

              <div className="space-y-6">

                {/* Basic Info */}
                <section className="group space-y-6 rounded-3xl p-1 transition-all duration-500">
                  {/* Header removed */}

                  <div className="space-y-6 lg:px-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={form.title}
                        onChange={handleChange('title')}
                        className="block w-full rounded-2xl px-3.5 py-3 text-base font-medium text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                        placeholder="Event Name"
                        required
                      />
                    </div>

                    <div>
                      <RichTextEditor
                        value={form.description}
                        onChange={(value) => setForm(prev => ({ ...prev, description: value }))}
                        placeholder="Description"
                      />
                    </div>
                  </div>
                </section>

                {/* Community */}
                <section className="group space-y-4 rounded-3xl p-1 transition-all duration-500">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-gray-900 border-b border-gray-100/50 pb-2 lg:mx-2">
                    Community
                  </div>

                  <div ref={communityMenuRef} className="relative lg:px-2">
                      <button
                        type="button"
                        onClick={() => setCommunityMenuOpen(prev => !prev)}
                        disabled={loadingCommunities}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-medium text-gray-900 shadow-sm bg-black/5 transition-all duration-200 hover:bg-black/[0.07] focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/70 text-gray-400">
                            {selectedCommunity?.image || selectedCommunity?.cover_image ? (
                              <img src={selectedCommunity.image || selectedCommunity.cover_image} alt="" className="h-full w-full object-cover object-center" />
                            ) : (
                              <Users className="h-4 w-4" />
                            )}
                          </span>
                          <span className="truncate">
                            {loadingCommunities
                              ? 'Loading communities...'
                              : selectedCommunity?.name || 'Select a community'}
                          </span>
                        </span>
                        <ChevronDown className={`h-4.5 w-4.5 shrink-0 text-gray-400 transition-transform duration-200 ${communityMenuOpen ? 'rotate-180 text-blue-500' : ''}`} />
                      </button>

                      {communityMenuOpen && (
                        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-black/5 bg-white p-1.5 shadow-xl shadow-black/10 animate-in fade-in zoom-in-95 duration-150">
                          {communities.length === 0 && (
                            <div className="px-3 py-3 text-sm font-medium text-gray-400">
                              No communities available
                            </div>
                          )}
                          {communities.map((community) => {
                            const isSelected = form.communityId === community.community_id;
                            return (
                              <button
                                key={community.community_id}
                                type="button"
                                onClick={() => {
                                  setForm(prev => ({ ...prev, communityId: community.community_id }));
                                  setCommunityMenuOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                                  isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <span className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                                  {community.image || community.cover_image ? (
                                    <img src={community.image || community.cover_image} alt="" className="h-full w-full object-cover object-center" />
                                  ) : (
                                    <Users className="h-4 w-4" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{community.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                </section>

                {/* Schedule */}
                <section className="group space-y-4 rounded-3xl p-1 transition-all duration-500">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-gray-900  border-b border-gray-100/50 pb-2 lg:mx-2">
                    Schedule
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:px-2">
                    <div>
                      <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Start</label>
                      <input
                        type="datetime-local"
                        min={nowIsoLocal}
                        value={form.startDateTime ? datetimeValue(form.startDateTime) : ''}
                        onChange={(e) => {
                          if (isPublished && !e.target.value) {
                            toastError('Published events must have a start date.');
                            return;
                          }
                          setForm(prev => ({ ...prev, startDateTime: e.target.value || null }));
                        }}
                        className="block w-full rounded-2xl px-3.5 py-3 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                        required={isPublished}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-gray-700 mb-1.5">End</label>
                      <input
                        type="datetime-local"
                        min={form.startDateTime ? datetimeValue(form.startDateTime) : nowIsoLocal}
                        value={form.endDateTime ? datetimeValue(form.endDateTime) : ''}
                        required={isPublished && form.venueType !== 'virtual'}
                        onChange={(e) => {
                          setForm(prev => ({ ...prev, endDateTime: e.target.value || null }));
                        }}
                        className="block w-full rounded-2xl px-3.5 py-3 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                      />
                    </div>
                  </div>
                  <div className="mx-2 flex items-center gap-2 text-xs text-gray-500 bg-gray-100/50 px-4 py-2 rounded-full w-fit border border-gray-100">
                    <Globe className="h-3.5 w-3.5" />
                    <span>{timeZoneMeta.offsetLabel} · {timeZoneMeta.timeZone}</span>
                  </div>
                </section>


                {/* Location */}
                <section className="group space-y-4 rounded-3xl p-1 transition-all duration-500">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-gray-900  border-b border-gray-100/50 pb-2 lg:mx-2">
                    Location
                  </div>

                  <div className="lg:px-2">
                    <VenueSelector
                      selectedVenueId={form.venueId}
                      deferVenueCreation
                      onDraftVenue={(draft) => {
                        setForm(prev => ({ ...prev, draftVenue: draft }));
                      }}
                      onVenueSelect={(venueId, venueType) => {
                        setForm(prev => ({
                          ...prev,
                          venueId,
                          venueType: venueType ?? null
                        }));
                      }}
                    />
                  </div>
                </section>

                {/* Tickets */}
                <section className="group space-y-6 rounded-3xl p-1 transition-all duration-500">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900  border-b border-gray-100/50 pb-2 lg:mx-2">
                    Tickets
                  </div>

                  <div className="lg:px-2 space-y-4">
                    {/* Tickets List */}
                    {form.tickets.length > 0 && (
                      <div className="grid gap-3">
                        {form.tickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-100 transition-all duration-300"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className={`flex-shrink-0 w-5 h-5 rounded-full border border-black/10 shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.2),inset_2px_2px_4px_rgba(255,255,255,0.7),0_2px_4px_rgba(0,0,0,0.1)] ${TICKET_THEMES[ticket.color_theme || 'silver'].gradient}`} />
                                <h5 className="font-bold text-gray-900">{ticket.label}</h5>
                                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold ">
                                  {formatTicketPrice(ticket.price, ticket.currency)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1 pl-6 line-clamp-1">
                                {deriveTicketBenefits(ticket).join(' • ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleEditTicket(ticket)}
                                className="p-2 rounded-xl text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTicket(ticket.id)}
                                className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Button */}
                    <button
                      type="button"
                      onClick={handleAddTicket}
                      className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 font-medium hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-600 transition-all duration-300 ${form.tickets.length === 0 ? 'py-8' : ''}`}
                    >
                      <div className={`p-2 rounded-full ${form.tickets.length === 0 ? 'bg-gray-100 text-gray-400' : 'bg-transparent'}`}>
                        <Plus className="h-5 w-5" />
                      </div>
                      {form.tickets.length === 0 ? 'Create your first ticket' : 'Add another ticket type'}
                    </button>
                  </div>
                </section>

                {/* Early Bird Settings */}
                {form.tickets.length > 0 && (
                  <section className="group space-y-6 rounded-3xl p-1 transition-all duration-500">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900  border-b border-gray-100/50 pb-2 lg:mx-2">
                      Early Bird Settings
                    </div>

                    <p className="text-sm text-gray-500 lg:mx-2 leading-relaxed">
                      Offer discounted tickets to your first buyers to drive early bookings, build momentum, and secure initial sales for your event.
                    </p>

                    <div className="lg:px-2 space-y-4">
                      {form.tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="group flex flex-col p-5 bg-white rounded-2xl border border-gray-100 hover:border-blue-100 transition-all duration-300 gap-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2.5">
                                <div className={`flex-shrink-0 w-5 h-5 rounded-full border border-black/10 shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.2),inset_2px_2px_4px_rgba(255,255,255,0.7),0_2px_4px_rgba(0,0,0,0.1)] ${TICKET_THEMES[ticket.color_theme || 'silver'].gradient}`} />
                                <h5 className="font-bold text-gray-900">{ticket.label || ticket.title}</h5>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 pl-6">
                                Base Price: {formatTicketPrice(ticket.price, ticket.currency)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setForm(prev => ({
                                  ...prev,
                                  tickets: prev.tickets.map(t =>
                                    t.id === ticket.id
                                      ? { ...t, has_early_bird: !t.has_early_bird }
                                      : t
                                  )
                                }));
                              }}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${ticket.has_early_bird ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${ticket.has_early_bird ? 'translate-x-5' : 'translate-x-0'}`}
                              />
                            </button>
                          </div>

                          {ticket.has_early_bird && (
                            <div className="grid gap-6 sm:grid-cols-2 pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700  mb-2">
                                  Units to be sold
                                </label>
                                <input
                                  type="number"
                                  value={ticket.early_bird_units || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    let parsedVal = val ? parseInt(val) : undefined;
                                    if (parsedVal !== undefined && ticket.quantity !== undefined && parsedVal > ticket.quantity) {
                                      parsedVal = ticket.quantity;
                                    }
                                    setForm(prev => ({
                                      ...prev,
                                      tickets: prev.tickets.map(t =>
                                        t.id === ticket.id
                                          ? { ...t, early_bird_units: parsedVal }
                                          : t
                                      )
                                    }));
                                  }}
                                  placeholder="e.g. 10"
                                  min="1"
                                  max={ticket.quantity}
                                  step="1"
                                  className="block w-full rounded-2xl px-3.5 py-3 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                                />
                                {ticket.quantity !== undefined && (
                                  <p className="mt-1.5 text-xs text-gray-500">
                                    Max limit: {ticket.quantity.toLocaleString()} units
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700  mb-2">
                                  Percentage Drop (%)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={ticket.early_bird_discount_percentage || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setForm(prev => ({
                                        ...prev,
                                        tickets: prev.tickets.map(t =>
                                          t.id === ticket.id
                                            ? { ...t, early_bird_discount_percentage: val ? parseFloat(val) : undefined }
                                            : t
                                        )
                                      }));
                                    }}
                                    placeholder="e.g. 30"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    className="block w-full rounded-2xl px-3.5 py-3 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                                  />
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500 font-medium">
                                    %
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Event Settings */}
                {form.venueType === 'virtual' && (
                  <section className="group space-y-4 rounded-3xl p-1 transition-all duration-500">
                    <div className="flex items-center gap-2 text-[13px] font-bold text-gray-900  border-b border-gray-100/50 pb-2 lg:mx-2">
                      Settings
                    </div>

                    <div className="space-y-4 lg:px-2">
                      {/* Hand Raising Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Hand Raising</p>
                          <p className="text-xs text-gray-500">Attendees can raise hands to speak</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, handRaising: !prev.handRaising }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${form.handRaising ? 'bg-blue-500' : 'bg-gray-200'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${form.handRaising ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>

                      {/* Allow Whispers Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Allow Whispers</p>
                          <p className="text-xs text-gray-500">Private messages between attendees</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, allowWhispers: !prev.allowWhispers }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${form.allowWhispers ? 'bg-purple-500' : 'bg-gray-200'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${form.allowWhispers ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>
                    </div>
                  </section>
                )}

              </div>

              <div className="pt-8 border-t border-gray-100">
                {id && eventStatus.toLowerCase() === 'draft' ? (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                      <button
                        type="submit"
                        disabled={submitting || publishing}
                        className="inline-flex items-center justify-center gap-2 text-lg font-medium text-gray-500 transition-colors hover:text-gray-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={publishing || submitting}
                      className="w-full rounded-full bg-black px-8 py-4 text-lg font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {publishing ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Scheduling...
                        </span>
                      ) : (
                        'Schedule Event'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="w-full mt-3 rounded-full bg-gray-100 px-8 py-4 text-lg font-medium text-gray-900 transition-all hover:bg-gray-200 active:scale-[0.98]"
                    >
                      Cancel Changes
                    </button>
                  </>
                ) : (
                  <>
                    {!id && (
                      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={submitting || savingDraft}
                          className="inline-flex items-center justify-center gap-2 text-lg font-medium text-gray-500 transition-colors hover:text-gray-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingDraft ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Saving draft...
                            </>
                          ) : (
                            'Save as Draft'
                          )}
                        </button>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={submitting || savingDraft}
                      className="w-full rounded-full bg-black px-8 py-4 text-lg font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {id ? 'Saving...' : 'Creating...'}
                        </span>
                      ) : (
                        id ? 'Save Changes' : 'Create Event'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="w-full mt-3 rounded-full bg-gray-100 px-8 py-4 text-lg font-medium text-gray-900 transition-all hover:bg-gray-200 active:scale-[0.98]"
                    >
                      {id ? 'Cancel Changes' : 'Cancel'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </main>

          {/* Right column - Cover Image & Preview */}
          <div className="w-full lg:w-[400px] space-y-8 animate-in slide-in-from-right-8 duration-1000 delay-200 fade-in fill-mode-backwards">
            <div className="space-y-6">
              <div className="relative group/cover w-full aspect-square rounded-3xl overflow-hidden transition-all duration-300">
                <label
                  htmlFor={coverInputId}
                  onClick={handleCoverClick}
                  className={`relative flex flex-col items-center justify-center w-full h-full cursor-pointer transition-colors duration-300 ${dominantColor ? 'bg-white/40 hover:bg-white/60' : 'bg-gray-100 hover:bg-gray-200/80'}`}
                >
                  {form.coverImage ? (
                    <img
                      src={form.coverImage}
                      alt="Cover"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 transition-colors group-hover/cover:text-gray-600">
                      <div className={`w-[52px] h-[52px] flex items-center justify-center rounded-full ${dominantColor ? 'bg-white/50' : 'bg-white'}`}>
                        <img src="/images/upload_icon.png" className="h-[25px] w-[25px] object-contain opacity-60 invert transition-opacity group-hover/cover:opacity-80" alt="Upload" />
                      </div>
                    </div>
                  )}

                  {/* Hover Overlay for existing image (Desktop) */}
                  {form.coverImage && (
                    <div className="hidden lg:flex absolute inset-0 bg-black/0 group-hover/cover:bg-black/20 transition-colors items-center justify-center opacity-0 group-hover/cover:opacity-100">
                      <div className="bg-white/90 backdrop-blur-sm px-5 py-2.5 rounded-full text-sm font-medium text-gray-900 shadow-sm transform translate-y-2 group-hover/cover:translate-y-0 transition-all">
                        Change Photo
                      </div>
                    </div>
                  )}


                </label>

                <input
                  id={coverInputId}
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleCoverFileChange}
                  className="hidden"
                />

                {/* Remove Button - Inside Container */}
                {form.coverImage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening upload dialog
                      setForm(prev => ({ ...prev, coverImage: '' }));
                    }}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:text-red-600 hover:bg-white shadow-sm transition-all transform hover:scale-105"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* URL Input - simplified */}
              <div className="relative mt-4">
                <input
                  type="url"
                  value={form.coverImage}
                  onChange={handleChange('coverImage')}
                  className="block w-full rounded-xl border-none px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 bg-black/5"
                  placeholder="Or paste an image URL..."
                />
              </div>
            </div>

            <div className="hidden lg:block">
              <button
                type="button"
                onClick={() => setShowImagePicker(true)}
                className="w-full rounded-2xl border border-gray-100 bg-white/70 px-5 py-4 text-sm font-semibold text-gray-800 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md active:scale-[0.99]"
              >
                Choose from Gallery
              </button>
            </div>


          </div>
        </div >
      </div >

      {showImagePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
              <h3 className="text-[17px] font-semibold text-gray-950">Choose Image</h3>
              <button
                type="button"
                onClick={() => setShowImagePicker(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-black/5 p-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[86px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center transition-colors hover:border-gray-300 hover:bg-gray-100"
              >
                <span className="text-sm font-semibold text-gray-600">Drag & drop or click here to upload.</span>
                <span className="mt-1 text-xs font-medium text-gray-400">Or choose an image below. The ideal aspect ratio is 1:1.</span>
              </button>
            </div>

            <div className="relative border-b border-black/5 px-4 py-3">
              <Search className="absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={gallerySearch}
                onChange={(event) => setGallerySearch(event.target.value)}
                placeholder="Search for more photos"
                className="h-11 w-full rounded-2xl border border-gray-100 bg-white pl-10 pr-10 text-sm font-medium text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300"
              />
              {gallerySearch && (
                <button
                  type="button"
                  onClick={() => setGallerySearch('')}
                  className="absolute right-7 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[150px_1fr]">
              <aside className="overflow-y-auto border-r border-black/5 p-2">
                {LUMA_GALLERY_CATEGORIES.map(category => {
                  const selected = category.name === activeGalleryCategory && !gallerySearch;
                  return (
                    <button
                      key={category.name}
                      type="button"
                      onClick={() => {
                        setActiveGalleryCategory(category.name);
                        setGallerySearch('');
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                        selected ? 'bg-gray-100 text-gray-950' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </aside>

              <main className="min-h-0 overflow-y-auto p-4">
                {!gallerySearch && activeGalleryCategory === 'Featured' ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {LUMA_GALLERY_CATEGORIES.slice(1).map(category => (
                      <button
                        key={category.name}
                        type="button"
                        onClick={() => setActiveGalleryCategory(category.name)}
                        className="group rounded-2xl border border-gray-100 bg-white p-3 text-left transition-all hover:border-gray-200 hover:shadow-sm"
                      >
                        <div className="relative h-32 overflow-hidden rounded-xl bg-gray-50">
                          {category.images.slice(0, 4).map((image, index) => (
                            <img
                              key={image}
                              src={image}
                              alt=""
                              className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-xl object-cover shadow-sm transition-transform duration-300 group-hover:scale-[1.02]"
                              style={{
                                opacity: index === 0 ? 0.35 : 1,
                                transform: `translate(-50%, calc(-50% + ${index * 8 - 12}px)) scale(${0.76 + index * 0.07})`,
                                zIndex: index,
                              }}
                            />
                          ))}
                        </div>
                        <p className="mt-3 truncate text-center text-sm font-semibold text-gray-600">{category.name}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {pickerImages.map((url, index) => (
                      <button
                        key={`${url}-${index}`}
                        type="button"
                        onClick={() => handleGallerySelect(url)}
                        className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100 transition-transform hover:scale-[1.015] focus:outline-none focus:ring-2 focus:ring-black/20"
                      >
                        <img src={url} alt="Gallery option" className="h-full w-full object-cover" />
                        {form.coverImage === url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                            <span className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Upload Options Modal */}
      {
        showMobileUploadOptions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 animate-in fade-in duration-300 mx-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900">Add Cover Image</h3>
                <button
                  onClick={() => setShowMobileUploadOptions(false)}
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                  setShowMobileUploadOptions(false);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors active:scale-95"
              >
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                Upload from Device
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileUploadOptions(false);
                  setShowMobileGallery(true);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-purple-50 text-purple-700 font-medium hover:bg-purple-100 transition-colors"
              >
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <ImageIcon className="h-5 w-5 text-purple-600" />
                </div>
                Choose from Gallery
              </button>
            </div>
          </div>
        )
      }

      {/* Mobile Gallery Modal */}
      {
        showMobileGallery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 h-[80vh] flex flex-col animate-in fade-in duration-300 mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Cover Gallery</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGalleryRefresh}
                    className="p-2 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setShowMobileGallery(false)}
                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 overflow-y-auto p-1">
                {visibleGalleryImages.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      handleGallerySelect(url);
                      setShowMobileGallery(false);
                    }}
                    className="relative aspect-square overflow-hidden rounded-xl ring-offset-2 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-black/20"
                  >
                    <img
                      src={url}
                      alt="Gallery option"
                      className="h-full w-full object-cover"
                    />
                    {form.coverImage === url && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-white shadow-sm" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }

      {/* Ticket Modal */}
      {showTicketForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-5xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h4 className="text-lg font-bold text-gray-900">
                {editingTicketId ? 'Edit Ticket' : 'New Ticket'}
              </h4>
              <button
                type="button"
                onClick={handleCancelTicketForm}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile Tabs */}
            <div className="flex lg:hidden border-b border-gray-100 mb-6">
              <button
                type="button"
                onClick={() => setMobileTab('details')}
                className={`flex-1 pb-3 text-sm font-medium transition-colors ${mobileTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className={`flex-1 pb-3 text-sm font-medium transition-colors ${mobileTab === 'preview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Preview
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2">
              <div className="grid lg:grid-cols-2 gap-8 h-full">
                {/* Left: Form */}
                <div className={`space-y-6 pb-4 px-2 ${mobileTab === 'details' ? 'block' : 'hidden lg:block'}`}>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ticket Type *
                      </label>
                      <input
                        type="text"
                        value={ticketForm.title}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Regular, VIP, VVIP"
                        className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (₦) *
                      </label>
                      <input
                        type="number"
                        value={ticketForm.price}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0 for free"
                        min="0"
                        step="0.01"
                        className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                      />
                    </div>

                    <div className="w-full sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity Available
                      </label>
                      <input
                        type="number"
                        value={ticketForm.quantity}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, quantity: e.target.value }))}
                        placeholder="Leave empty for unlimited"
                        min="0"
                        step="1"
                        className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[100, 500, 1000, 5000, 10000].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setTicketForm(prev => ({ ...prev, quantity: num.toString() }))}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            {num.toLocaleString()}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Leave empty for unlimited availability, or click a quick number above
                      </p>
                    </div>
                  </div>


                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Ticket Theme
                    </label>
                    <div className="flex flex-wrap gap-3 pb-8">
                      {(Object.entries(TICKET_THEMES) as [TicketTheme, typeof TICKET_THEMES[TicketTheme]][]).map(([key, theme]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTicketForm(prev => ({ ...prev, color_theme: key }))}
                          className={`group relative w-12 h-12 rounded-full transition-all duration-200 ${ticketForm.color_theme === key ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                        >
                          <div className={`absolute inset-0 rounded-full ${theme.gradient} shadow-sm border border-black/5`} />
                          {ticketForm.color_theme === key && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                            </div>
                          )}
                          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {theme.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access & Benefits
                      <span className="text-xs text-gray-500 ml-2">(one per line)</span>
                    </label>
                    <textarea
                      value={ticketForm.benefits}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, benefits: e.target.value }))}
                      placeholder="Priority check-in&#10;Complimentary welcome drink&#10;Exclusive lounge access"
                      rows={4}
                      className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5 resize-none"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Leave empty to auto-generate benefits based on ticket title
                    </p>
                  </div>

                  {/* Physical Ticket Delivery Option */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <input
                      type="checkbox"
                      id="physicalTickets"
                      disabled
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-not-allowed opacity-50"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="physicalTickets" className="text-sm font-medium text-gray-700 cursor-not-allowed flex items-center gap-2 flex-wrap">
                        <span>Enable Physical Ticket Delivery</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold ">
                          Coming Soon
                        </span>
                      </label>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Allow attendees to receive physical tickets at their address
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveTicket}
                      className="flex-1 px-6 py-3.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-transform active:scale-[0.98]"
                    >
                      {editingTicketId ? 'Update Ticket' : 'Save Ticket'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelTicketForm}
                      className="px-6 py-3.5 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* Right: Live Preview */}
                <div className={`flex flex-col items-center justify-center lg:justify-start ${mobileTab === 'preview' ? 'block' : 'hidden lg:flex'} lg:bg-gray-50 lg:rounded-3xl lg:px-6 lg:pb-2 lg:pt-[100px] lg:border lg:border-gray-100`}>
                  <h5 className="hidden text-xs font-bold text-gray-400  mb-6 lg:block">Live Preview</h5>

                  {/* Card Preview */}
                  <div className="group relative w-full max-w-[360px] sm:max-w-[420px] min-h-[15rem] [perspective:1600px]">
                    {(() => {
                      const theme = TICKET_THEMES[ticketForm.color_theme || 'silver'];
                      // Generate preview ticket ID
                      const previewTicketId = `PREVIEW-${Date.now().toString(36).toUpperCase()}`;
                      const qrData = JSON.stringify({
                        ticketId: previewTicketId,
                        eventName: form.title || 'Event Name',
                        ticketType: ticketForm.title || 'Ticket Type',
                        price: parseFloat(ticketForm.price) || 0,
                        preview: true
                      });

                      const previewTicket = {
                        id: 'preview',
                        title: ticketForm.title || 'Ticket Title',
                        price: parseFloat(ticketForm.price) || 0,
                        currency: 'NGN',
                        quantity: 100,
                        sold: 0,
                        status: 'on_sale',
                        benefits: ticketForm.benefits ? ticketForm.benefits.split('\n').filter(Boolean) : [],
                        created_at: new Date().toISOString()
                      };

                      const benefits = previewTicket.benefits.length > 0
                        ? previewTicket.benefits
                        : (ticketForm.title ? ['General Access', 'Event Entry'] : ['Benefit 1', 'Benefit 2']);
                      const hasPreviewEarlyBird = Boolean(editingTicketId && form.tickets.find(t => t.id === editingTicketId)?.has_early_bird);

                      return (
                        <div className="relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                          {/* Front */}
                          <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-[2rem] border ${theme.border} ${theme.gradient} px-6 py-6 backdrop-blur-sm shadow-xl [backface-visibility:hidden]`}>
                            <span className={`pointer-events-none absolute inset-y-6 -right-3 z-0 h-10 w-10 rounded-full border ${theme.border} bg-white/50`} aria-hidden="true" />
                            <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                            <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                            <div className="relative z-10">
                              <div className="space-y-1.5 min-w-0">
                                <p className={`text-xs uppercase tracking-[0.28em] ${theme.text} opacity-60`}>{form.title || 'Event Name'}</p>
                                <p className={`text-lg font-semibold ${theme.text} line-clamp-2 break-words`}>{previewTicket.title}</p>
                              </div>
                            </div>

                            <div className="relative z-10 mt-6">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className={`text-3xl font-bold ${theme.text} truncate`}>
                                  {previewTicket.price === 0 ? 'Free' : formatCompactPrice(previewTicket.price, previewTicket.currency)}
                                </span>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold  ${theme.badge} ${theme.badgeText} flex-shrink-0 opacity-80`}>
                                  {hasPreviewEarlyBird ? 'Early Bird' : 'Per guest'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Back */}
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
                                {previewTicket.price === 0 ? 'Free' : formatCompactPrice(previewTicket.price, previewTicket.currency)}
                              </span>
                            </div>

                            {/* QR Code & Ticket ID - Bottom Right */}
                            <div className={`absolute bottom-4 right-4 z-20 flex flex-col items-end gap-1 ${theme.text}`}>
                              <QRCodeSVG
                                value={qrData}
                                size={72}
                                level="M"
                                includeMargin={false}
                                fgColor="currentColor"
                                bgColor="transparent"
                              />
                              <p className="text-[9px] font-mono opacity-60">{previewTicketId}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <p className="hidden mt-6 text-xs text-gray-400 text-center max-w-[200px] lg:block">
                    Hover over the card to see the back with benefits
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateEvent;
