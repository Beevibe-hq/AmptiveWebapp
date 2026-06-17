import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {  Calendar, MapPin, Image as ImageIcon, Ticket, Upload, Sparkles, Globe, RefreshCw, X, Plus, Edit2, Trash2 , Loader2 } from "lucide-react";
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
import { AmptiveSpinner } from '@/components/AmptiveSpinner';


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
  'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=800', // Concert Crowd
  'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800', // Party Lights
  'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800', // Music Festival
  'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=800', // DJ Performance
  'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800', // Live Concert
  'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=800', // Stage Lights
  'https://images.pexels.com/photos/2114365/pexels-photo-2114365.jpeg?auto=compress&cs=tinysrgb&w=800', // Festival Crowd
  'https://images.pexels.com/photos/1267697/pexels-photo-1267697.jpeg?auto=compress&cs=tinysrgb&w=800', // Night Event
  'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800', // Club Scene
  'https://images.pexels.com/photos/1449791/pexels-photo-1449791.jpeg?auto=compress&cs=tinysrgb&w=800', // Party Celebration
  'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800', // Music Event
  'https://images.pexels.com/photos/2306203/pexels-photo-2306203.jpeg?auto=compress&cs=tinysrgb&w=800', // Colorful Lights
  'https://images.pexels.com/photos/1763067/pexels-photo-1763067.jpeg?auto=compress&cs=tinysrgb&w=800', // Concert Stage
  'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800', // Neon Vibes
  'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800', // Crowd Energy
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
  const { dominantColor, setDominantColor } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const filePreviewUrlRef = useRef<string | null>(null);
  const coverInputId = useMemo(() => `cover-upload-${Math.random().toString(36).slice(2)}`, []);


  // Mobile modal states
  const [showMobileUploadOptions, setShowMobileUploadOptions] = useState(false);
  const [showMobileGallery, setShowMobileGallery] = useState(false);
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
    const earlyBirdUnits = rawTicket.early_bird_units ?? rawTicket.early_bird_quantity ?? rawTicket.earlyBirdUnits ?? rawTicket.earlyBirdQuantity;
    const earlyBirdDiscount = rawTicket.early_bird_discount_percentage ?? rawTicket.early_bird_discount ?? rawTicket.earlyBirdDiscountPercentage ?? rawTicket.earlyBirdDiscount;
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
    const earlyBirdUnits = ticket.has_early_bird ? ticket.early_bird_units : undefined;
    const earlyBirdDiscount = ticket.has_early_bird ? ticket.early_bird_discount_percentage : undefined;
    const quantityTotal = ticket.quantity && ticket.quantity > 0 ? ticket.quantity : null;

    const payload = {
      label: ticket.label || ticket.title,
      price: ticket.price,
      currency: ticket.currency,
      quantity_total: quantityTotal,
      benefits: ticket.benefits,
      color_theme: ticket.color_theme,
      has_early_bird: Boolean(ticket.has_early_bird),
      early_bird_units: earlyBirdUnits,
      early_bird_discount_percentage: earlyBirdDiscount,
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
    // Empty quantity means the ticket starts sold out.
    const quantity = ticketForm.quantity ? parseInt(ticketForm.quantity) : 0;
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
        quantity_total: quantity,
        quantity_sold: 0,
        quantity_remaining: quantity,
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
  };

  const handleGalleryRefresh = () => {
    const shuffled = [...GALLERY_IMAGES].sort(() => 0.5 - Math.random());
    setVisibleGalleryImages(shuffled.slice(0, 5));
  };

  const handleCoverClick = (e: React.MouseEvent) => {
    // Check if mobile (using simple width check or just always showing options on small screens)
    if (window.innerWidth < 1024) { // lg breakpoint
      e.preventDefault();
      setShowMobileUploadOptions(true);
    }
    // On desktop, default behavior (opens file picker) applies via label
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
    if (!form.startDateTime) {
      toastError('Please set a start date and time before publishing.');
      return;
    }
    if (new Date(form.startDateTime) <= new Date()) {
      toastError('Start date and time must be in the future.');
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      toastError('Please provide an event title.');
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
    } else if (isPublished) {
      toastError('Published events must have a start date. You cannot unset it.');
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

    setSubmitting(true);
    try {
      let coverImageUrl = form.coverImage;

      if (coverFile) {
        try {
          coverImageUrl = await uploadCoverImage(coverFile);
        } catch (uploadError: any) {
          toastError('Failed to upload cover image. Please try again.');
          setSubmitting(false);
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
      if (id) {
        const currentTickets = await getTicketsForEvent(id);
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

      toastSuccess(id ? 'Event updated successfully!' : 'Event created successfully!');
      if (!id) {
        setForm(buildInitialFormState());
        setCoverFile(null);
        setActiveTheme(0);
      }
      navigate(`/dashboard/events`);
    } catch (error) {
      console.error('Unexpected error while creating event', error);
      toastError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
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

  if (!ready || loadingEvent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <AmptiveSpinner className="h-8 w-8 animate-spin text-gray-400" aria-label="Loading" />
      </div>
    );
  }

  const isPublished = !!id && eventStatus.toLowerCase() !== 'draft';

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

                    <div>
                      <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Community</label>
                      <select
                        value={form.communityId || ''}
                        onChange={(event) => setForm(prev => ({ ...prev, communityId: event.target.value || null }))}
                        className="block w-full rounded-2xl px-3.5 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={loadingCommunities}
                      >
                        <option value="">
                          {loadingCommunities ? 'Loading communities...' : 'No community'}
                        </option>
                        {communities.map((community) => (
                          <option key={community.community_id} value={community.community_id}>
                            {community.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Schedule */}
                <section className="group space-y-4 rounded-3xl p-1 transition-all duration-500">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100/50 pb-2 lg:mx-2">
                    <Calendar className="h-4 w-4 text-rose-500" />
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
                      <label className="block text-[13px] font-medium text-gray-700 mb-1.5">End (Optional)</label>
                      <input
                        type="datetime-local"
                        min={form.startDateTime ? datetimeValue(form.startDateTime) : nowIsoLocal}
                        value={form.endDateTime ? datetimeValue(form.endDateTime) : ''}
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
                  <div className="flex items-center gap-2 text-[13px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100/50 pb-2 lg:mx-2">
                    <MapPin className="h-4 w-4 text-emerald-500" />
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
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100/50 pb-2 lg:mx-2">
                    <Ticket className="h-4 w-4 text-blue-600" />
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
                                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
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
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100/50 pb-2 lg:mx-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
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
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
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
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
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
                    <div className="flex items-center gap-2 text-[13px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100/50 pb-2 lg:mx-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
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
                <button
                  type="submit"
                  disabled={submitting}
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

                {id && eventStatus.toLowerCase() === 'draft' && (
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={publishing}
                    className="w-full mt-3 rounded-full bg-emerald-500 px-8 py-4 text-lg font-medium text-white transition-transform hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {publishing ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Publishing...
                      </span>
                    ) : (
                      'Schedule Event'
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full mt-3 rounded-full bg-gray-100 px-8 py-4 text-lg font-medium text-gray-900 transition-all hover:bg-gray-200 active:scale-[0.98]"
                >
                  {id ? 'Cancel Changes' : 'Cancel'}
                </button>
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

            {/* Gallery & AI (Desktop Only) */}
            <div className="hidden lg:block rounded-2xl border border-gray-100 bg-white/50 p-5 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Cover Gallery</h3>
                <button
                  type="button"
                  onClick={handleGalleryRefresh}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                  title="Refresh gallery"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-4">
                {visibleGalleryImages.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleGallerySelect(url)}
                    className="relative aspect-square overflow-hidden rounded-lg ring-offset-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black/20"
                  >
                    <img
                      src={url}
                      alt="Gallery option"
                      className="h-full w-full object-cover"
                    />
                    {form.coverImage === url && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="w-full group relative flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-purple-50"
                style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  color: 'rgb(139, 92, 246)',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd"></path>
                  </svg>
                  <span>Generate with AI</span>
                </span>
              </button>
            </div>


          </div>
        </div >
      </div >

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
                        placeholder="Leave empty for sold out"
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
                        Leave empty to mark this ticket as sold out, or click a quick number above
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
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
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
                  <h5 className="hidden text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 lg:block">Live Preview</h5>

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

                      return (
                        <div className="relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                          {/* Front */}
                          <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-[2rem] border ${theme.border} ${theme.gradient} px-6 py-6 backdrop-blur-sm shadow-xl [backface-visibility:hidden]`}>
                            <span className={`pointer-events-none absolute inset-y-6 -right-3 z-0 h-10 w-10 rounded-full border ${theme.border} bg-white/50`} aria-hidden="true" />
                            <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                            <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                            <div className="relative z-10 flex items-start justify-between gap-3">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <p className={`text-xs uppercase tracking-[0.28em] ${theme.text} opacity-60`}>{form.title || 'Event Name'}</p>
                                <p className={`text-lg font-semibold ${theme.text} line-clamp-2 break-words`}>{previewTicket.title}</p>
                              </div>

                            </div>

                            <div className="relative z-10 mt-6">
                              {((editingTicketId && form.tickets.find(t => t.id === editingTicketId)?.has_early_bird) || false) && (
                                <div className="inline-flex items-center gap-1 mb-1 px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-[9px] font-bold uppercase tracking-wider animate-in fade-in zoom-in-95 duration-200">
                                  Early Bird
                                </div>
                              )}
                              <div className="flex items-baseline justify-between gap-2">
                                <span className={`text-3xl font-bold ${theme.text} truncate`}>
                                  {previewTicket.price === 0 ? 'Free' : formatCompactPrice(previewTicket.price, previewTicket.currency)}
                                </span>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${theme.badge} ${theme.badgeText} flex-shrink-0 opacity-80`}>
                                  Per guest
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
