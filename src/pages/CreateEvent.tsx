import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Calendar, MapPin, Image as ImageIcon, StickyNote, Ticket, Clock, Upload, Sparkles, Wand2, Globe, RefreshCw, X, Plus, Edit2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toastError, toastSuccess } from '@/lib/ui/toast';
import { useTheme } from '@/contexts/ThemeContext';
import RichTextEditor from '@/components/RichTextEditor';
import LocationPicker from '@/components/LocationPicker';
import { QRCodeSVG } from 'qrcode.react';

type TicketTheme = 'silver' | 'bronze' | 'gold' | 'platinum' | 'obsidian';

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

type EventTicket = {
  id: string;
  title: string;
  price: number;
  currency: string;
  benefits: string[];
  colorTheme?: TicketTheme;
  quantity?: number;
};

type AvailabilityStatus = 'Available' | 'Almost Sold Out' | 'Limited Spots' | 'Sold Out';

type FormState = {
  title: string;
  summary: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  venue: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  coverImage: string;
  locationType: 'physical' | 'online';
  tickets: EventTicket[];
};

const PREVIEW_GRADIENTS = [
  'from-gray-100 via-orange-50/30 to-gray-100',
  'from-blue-50 via-indigo-50/30 to-slate-50',
  'from-rose-50 via-orange-50/30 to-yellow-50',
  'from-emerald-50 via-teal-50/30 to-cyan-50',
  'from-violet-50 via-fuchsia-50/30 to-purple-50'
];

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

const formatLocalDateTime = (date: Date) => {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return copy.toISOString().slice(0, 16);
};

const buildInitialFormState = (): FormState => {
  const now = new Date();
  const start = formatLocalDateTime(now);
  const end = formatLocalDateTime(new Date(now.getTime() + 60 * 60 * 1000));
  return {
    title: '',
    summary: '',
    description: '',
    startDateTime: start,
    endDateTime: end,
    venue: '',
    city: '',
    latitude: null,
    longitude: null,
    coverImage: '',
    locationType: 'physical',
    tickets: [],
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

const deriveTicketBenefits = (ticket: EventTicket): string[] => {
  if (ticket.benefits && ticket.benefits.length > 0) {
    return ticket.benefits;
  }

  const label = ticket.title?.toLowerCase() ?? '';
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
  const label = ticket.title?.toLowerCase() ?? '';
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
  const supabase = useMemo(() => createClient(), []);

  const [form, setForm] = useState<FormState>(() => buildInitialFormState());
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [coverPreviewError, setCoverPreviewError] = useState(false);
  const [coverPreview, setCoverPreview] = useState('');
  const [activeTheme, setActiveTheme] = useState(0);
  const [requireApproval, setRequireApproval] = useState(false);
  const [visibleGalleryImages, setVisibleGalleryImages] = useState<string[]>([]);
  const { dominantColor, setDominantColor } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const filePreviewUrlRef = useRef<string | null>(null);
  const coverInputId = useMemo(() => `cover-upload-${Math.random().toString(36).slice(2)}`, []);

  // Animation state for preview card
  const [isHoveringPreview, setIsHoveringPreview] = useState(false);

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
    colorTheme: TicketTheme;
    quantity: string;
  }>({
    title: '',
    price: '',
    currency: 'NGN',
    quantity: '',
    benefits: '',
    colorTheme: 'silver',
  });

  // Ticket handlers
  const handleAddTicket = () => {
    setTicketForm({ title: '', price: '', currency: 'NGN', benefits: '', colorTheme: 'silver', quantity: '' });
    setEditingTicketId(null);
    setMobileTab('details');
    setShowTicketForm(true);
  };

  const handleEditTicket = (ticket: EventTicket) => {
    setTicketForm({
      title: ticket.title,
      price: ticket.price.toString(),
      currency: ticket.currency,
      benefits: ticket.benefits.join('\n'),
      colorTheme: ticket.colorTheme || 'silver',
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
    // Parse quantity - undefined means unlimited
    const quantity = ticketForm.quantity ? parseInt(ticketForm.quantity) : undefined;
    const benefits = ticketForm.benefits
      .split('\n')
      .map(b => b.trim())
      .filter(Boolean);

    if (editingTicketId) {
      // Update existing ticket
      setForm(prev => ({
        ...prev,
        tickets: prev.tickets.map(t =>
          t.id === editingTicketId
            ? { ...t, title: ticketForm.title, price, currency: ticketForm.currency, benefits, colorTheme: ticketForm.colorTheme, quantity }
            : t
        ),
      }));
    } else {
      // Add new ticket
      const newTicket: EventTicket = {
        id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: ticketForm.title,
        price,
        currency: ticketForm.currency,
        benefits,
        colorTheme: ticketForm.colorTheme,
        quantity,
      };
      setForm(prev => ({ ...prev, tickets: [...prev.tickets, newTicket] }));
    }

    setShowTicketForm(false);
    setTicketForm({ title: '', price: '', currency: 'NGN', benefits: '', colorTheme: 'silver', quantity: '' });
    setEditingTicketId(null);
  };

  const handleDeleteTicket = (ticketId: string) => {
    setForm(prev => ({
      ...prev,
      tickets: prev.tickets.filter(t => t.id !== ticketId),
    }));
  };

  const handleCancelTicketForm = () => {
    setShowTicketForm(false);
    setTicketForm({ title: '', price: '', currency: 'NGN', benefits: '' });
    setEditingTicketId(null);
  };


  // Helper to extract average color from image
  const getAverageColor = async (imageUrl: string): Promise<{ r: number; g: number; b: number } | null> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'Anonymous';
      img.src = imageUrl;
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
    const updateDominantColor = async () => {
      if (form.coverImage) {
        const color = await getAverageColor(form.coverImage);
        if (color) setDominantColor(color);
      } else {
        setDominantColor(null);
      }
    };
    updateDominantColor();
  }, [form.coverImage, setDominantColor]);

  useEffect(() => {
    const shuffled = [...GALLERY_IMAGES].sort(() => 0.5 - Math.random());
    setVisibleGalleryImages(shuffled.slice(0, 5));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session) {
          setUserId(session.user.id);
          setReady(true);
        } else {
          // If no session, try to refresh or redirect
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshed.session) {
            if (!cancelled) {
              toastError('Please sign in to create an event.');
              navigate('/login');
            }
          } else {
            setUserId(refreshed.session.user.id);
            setReady(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch session', error);
        if (!cancelled) {
          toastError('We could not verify your session. Please sign in again.');
          navigate('/login');
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [navigate, supabase]);

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
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('*, event_tickets(*)')
          .eq('id', id)
          .single();

        if (eventError) throw eventError;

        if (event) {
          if (event.user_id !== userId) {
            toastError("You don't have permission to edit this event.");
            navigate('/dashboard/events');
            return;
          }

          setForm({
            title: event.title || '',
            summary: event.summary || '',
            description: event.description || '',
            startDateTime: safeFormat(event.start_time),
            endDateTime: safeFormat(event.end_time),
            venue: event.venue || '',
            city: event.city || '',
            latitude: event.latitude,
            longitude: event.longitude,
            coverImage: event.cover_image || '',
            locationType: event.location_type || 'physical',
            tickets: (event.event_tickets || []).map((t: any) => ({
              id: t.id,
              title: t.label,
              price: t.price,
              currency: t.currency,
              benefits: t.benefits || [],
              colorTheme: t.color_theme,
              quantity: t.quantity
            }))
          });
          setCoverPreview(event.cover_image || '');
        }
      } catch (error) {
        console.error('Error fetching event for edit:', error);
        toastError('Failed to load event data.');
      } finally {
        setLoadingEvent(false);
      }
    };

    fetchEventData();
  }, [id, ready, userId, supabase, navigate]);

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
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('Upload Path:', filePath);

    // Timeout Promise using a function so we can recreate it
    const createTimeout = () => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timed out after 20 seconds')), 20000);
    });

    // Probe
    console.log('Probing bucket access...');
    try {
      const listPromise = supabase.storage.from('event-covers').list();
      const probeTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Probe timed out')), 5000));
      const { data: listData, error: listError } = await Promise.race([listPromise, probeTimeout]) as any;

      if (listError) {
        console.error('PROBE FAILED:', listError);
        throw new Error(`Bucket probe failed: ${listError.message}`);
      }
      console.log('PROBE SUCCESS. Found', listData?.length, 'files.');
    } catch (error) {
      console.error('Probe Exception:', error);
      // Continue to upload attempt anyway
    }

    // Retry Loop
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Starting upload attempt ${attempts} of ${maxAttempts}...`);

      try {
        const uploadPromise = supabase.storage
          .from('event-covers')
          .upload(filePath, file, {
            upsert: false
          });

        // Race upload vs timeout
        const result = await Promise.race([uploadPromise, createTimeout()]) as any;

        if (result.error) {
          console.error(`Attempt ${attempts} Supabase error:`, result.error);
          throw result.error;
        }

        console.log('UPLOAD SUCCESS:', result.data);
        const { data } = supabase.storage.from('event-covers').getPublicUrl(filePath);
        return data.publicUrl;

      } catch (err: any) {
        console.error(`Attempt ${attempts} Exception:`, err);

        if (attempts >= maxAttempts) {
          throw new Error(`Upload failed after ${maxAttempts} attempts: ${err.message}`);
        }

        console.log('Waiting 1s before retry...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Upload failed unexpectedly');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      toastError('Please provide an event title.');
      return;
    }

    if (!form.startDateTime) {
      toastError('Please select a start date and time.');
      return;
    }

    const startTime = new Date(form.startDateTime);
    if (Number.isNaN(startTime.getTime())) {
      toastError('Start time is invalid.');
      return;
    }

    let endTimeIso: string | null = null;
    if (form.endDateTime) {
      const endTime = new Date(form.endDateTime);
      if (Number.isNaN(endTime.getTime())) {
        toastError('End time is invalid.');
        return;
      }
      if (endTime <= startTime) {
        toastError('End time must be after the start time.');
        return;
      }
      endTimeIso = endTime.toISOString();
    }

    setSubmitting(true);
    try {
      let coverImageUrl = form.coverImage;

      // Upload image if a new file is selected
      if (coverFile) {
        try {
          coverImageUrl = await uploadCoverImage(coverFile);
        } catch (uploadError: any) {
          toastError('Failed to upload cover image. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      const insertPayload = {
        title: trimmedTitle,
        description: form.description.trim() || null,
        start_time: startTime.toISOString(),
        end_time: endTimeIso,
        location_type: form.locationType,
        venue: form.locationType === 'online' ? null : (form.venue.trim() || null),
        city: form.locationType === 'online' ? null : (form.city.trim() || null),
        latitude: form.locationType === 'online' ? null : form.latitude,
        longitude: form.locationType === 'online' ? null : form.longitude,
        cover_image: coverImageUrl.trim() || null,
        user_id: userId,
        status: 'published',
      };

      console.log('Submitting event payload:', insertPayload);

      let eventId = id;
      if (id) {
        const { error } = await supabase
          .from('events')
          .update(insertPayload)
          .eq('id', id);

        if (error) {
          console.error('Failed to update event', error);
          toastError(error.message || 'We could not update this event. Please try again.');
          return;
        }
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert(insertPayload)
          .select('id')
          .maybeSingle();

        if (error) {
          console.error('Failed to create event', error);
          toastError(error.message || 'We could not create this event. Please try again.');
          return;
        }

        if (!data?.id) {
          toastError('Event was created but we could not retrieve its ID.');
          return;
        }
        eventId = data.id;
      }

      // Handle tickets
      if (id) {
        // In edit mode, first remove old tickets
        const { error: deleteError } = await supabase
          .from('event_tickets')
          .delete()
          .eq('event_id', id);

        if (deleteError) {
          console.error('Failed to clean up old tickets', deleteError);
        }
      }

      // Insert tickets if any
      if (form.tickets.length > 0) {
        const ticketInserts = form.tickets.map(ticket => ({
          event_id: eventId,
          label: ticket.title,
          price: ticket.price,
          currency: ticket.currency,
          quantity: ticket.quantity,
          benefits: ticket.benefits,
          color_theme: ticket.colorTheme,
          is_physical: false,
        }));

        const { error: ticketError } = await supabase
          .from('event_tickets')
          .insert(ticketInserts);

        if (ticketError) {
          console.error('Failed to save tickets', ticketError);
          toastError(id ? 'Event updated but tickets could not be saved.' : 'Event created but tickets could not be saved.');
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

  const datetimeValue = (value: string) => {
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
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-label="Loading" />
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

      <div className="mx-auto w-full max-w-5xl px-4 md:px-6 py-4 lg:py-6 pt-6 lg:pt-8">
        <div className="flex flex-col-reverse lg:flex-row gap-6 lg:gap-16 items-start">
          {/* Left column - Form Fields */}
          <main className="flex-1 max-w-2xl w-full">
            <div className="mb-6 lg:px-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {id ? 'Edit Event' : 'Create New Event'}
              </h1>
              <p className="mt-1 text-[15px] text-gray-600">
                {id ? 'Update your event details and tickets.' : 'Fill in the details below to publish your event.'}
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
                        value={datetimeValue(form.startDateTime)}
                        onChange={handleChange('startDateTime')}
                        className="block w-full rounded-2xl px-3.5 py-3 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-gray-700 mb-1.5">End (Optional)</label>
                      <input
                        type="datetime-local"
                        min={datetimeValue(form.startDateTime)}
                        value={datetimeValue(form.endDateTime)}
                        onChange={handleChange('endDateTime')}
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
                    <div className="flex p-1.5 bg-gray-100/80 rounded-2xl mb-6 relative isolate">
                      {/* Sliding Background */}
                      <div
                        className={`absolute inset-y-1.5 left-1.5 right-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out -z-10 ${form.locationType === 'online' ? 'translate-x-[calc(100%+3px)]' : 'translate-x-0'
                          }`}
                      />

                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, locationType: 'physical' }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors duration-300 ${form.locationType === 'physical' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        <MapPin className={`h-4 w-4 ${form.locationType === 'physical' ? 'text-emerald-500' : 'text-gray-400'}`} />
                        Physical Location
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, locationType: 'online' }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors duration-300 ${form.locationType === 'online' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        <img
                          src="/images/amptive_logo.png"
                          alt="Amptive"
                          className={`h-5 w-5 object-contain transition-opacity filter invert ${form.locationType === 'online' ? 'opacity-100' : 'opacity-40'}`}
                        />
                        Amptive App
                      </button>
                    </div>

                    {form.locationType === 'physical' ? (
                      <LocationPicker
                        initialVenue={form.venue}
                        initialCity={form.city}
                        onLocationSelect={(venue, city, lat, lng) => {
                          setForm(prev => ({
                            ...prev,
                            venue,
                            city,
                            latitude: lat,
                            longitude: lng
                          }));
                        }}
                      />
                    ) : (
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-blue-700 text-sm font-medium flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-2 bg-white rounded-full shadow-sm">
                          <Globe className="h-5 w-5 text-blue-500" />
                        </div>
                        Event will be hosted virtually on the Amptive App
                      </div>
                    )}
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
                            className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-md transition-all duration-300"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h5 className="font-bold text-gray-900">{ticket.title}</h5>
                                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
                                  {formatTicketPrice(ticket.price, ticket.currency)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1 line-clamp-1">
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
                      {id ? 'Saving...' : 'Publishing...'}
                    </span>
                  ) : (
                    id ? 'Save Changes' : 'Create Event'
                  )}
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
                        Quantity Available (Optional)
                      </label>
                      <input
                        type="number"
                        value={ticketForm.quantity}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, quantity: e.target.value }))}
                        placeholder="Leave empty for unlimited"
                        min="1"
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
                        Leave empty for unlimited tickets, or click a quick number above
                      </p>
                    </div>
                  </div>

                  {/* Color Theme Picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Ticket Theme
                    </label>
                    <div className="flex flex-wrap gap-3 pb-8">
                      {(Object.entries(TICKET_THEMES) as [TicketTheme, typeof TICKET_THEMES[TicketTheme]][]).map(([key, theme]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTicketForm(prev => ({ ...prev, colorTheme: key }))}
                          className={`group relative w-12 h-12 rounded-full transition-all duration-200 ${ticketForm.colorTheme === key ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                        >
                          <div className={`absolute inset-0 rounded-full ${theme.gradient} shadow-sm border border-black/5`} />
                          {ticketForm.colorTheme === key && (
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
                      className="flex-1 px-6 py-3.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-transform active:scale-[0.98]"
                    >
                      {editingTicketId ? 'Update Ticket' : 'Save Ticket'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelTicketForm}
                      className="px-6 py-3.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
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
                      const theme = TICKET_THEMES[ticketForm.colorTheme || 'silver'];
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

                            <div className="relative z-10 mt-6 flex items-baseline justify-between gap-2">
                              <span className={`text-3xl font-bold ${theme.text} truncate`}>
                                {previewTicket.price === 0 ? 'Free' : formatCompactPrice(previewTicket.price, previewTicket.currency)}
                              </span>
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${theme.badge} ${theme.badgeText} flex-shrink-0 opacity-80`}>
                                Per guest
                              </span>
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
