import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Calendar, MapPin, Image as ImageIcon, StickyNote, Ticket, Clock, Upload, Sparkles, Wand2, Globe, RefreshCw, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toastError, toastSuccess } from '@/lib/ui/toast';
import { useTheme } from '@/contexts/ThemeContext';
import RichTextEditor from '@/components/RichTextEditor';
import LocationPicker from '@/components/LocationPicker';

type FormState = {
  title: string;
  summary: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  venue: string;
  city: string;
  coverImage: string;
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
    coverImage: '',
  };
};

const CreateEvent = () => {
  const navigate = useNavigate();
  const supabase = useMemo(() => createClient(), []);

  const [form, setForm] = useState<FormState>(() => buildInitialFormState());
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
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
      const insertPayload = {
        title: trimmedTitle,
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        start_time: startTime.toISOString(),
        end_time: endTimeIso,
        venue: form.venue.trim() || null,
        city: form.city.trim() || null,
        cover_image: form.coverImage.trim() || null,
        user_id: userId,
        details_url: null,
        manage_url: null,
      } as const;

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

      toastSuccess('Event created successfully!');
      setForm(buildInitialFormState());
      setActiveTheme(0);
      navigate(`/events/${data.id}`);
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

  if (!ready) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none transition-opacity duration-1000">
        <div
          className="absolute top-0 left-0 w-full h-full transition-colors duration-1000"
          style={{
            background: dominantColor
              ? `radial-gradient(circle at 50% 0%, rgba(${dominantColor.r},${dominantColor.g},${dominantColor.b},0.15), transparent 50%)`
              : 'radial-gradient(circle at 50% 0%, rgba(120,119,198,0.1), transparent 50%)'
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-full h-full transition-colors duration-1000"
          style={{
            background: dominantColor
              ? `radial-gradient(circle at 100% 100%, rgba(${dominantColor.r},${dominantColor.g},${dominantColor.b},0.25), transparent 50%)`
              : 'radial-gradient(circle at 100% 100%, rgba(74,222,128,0.25), transparent 50%)'
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl animate-pulse transition-colors duration-1000"
          style={{
            animationDuration: '8s',
            background: dominantColor
              ? `linear-gradient(to top right, rgba(${dominantColor.r},${dominantColor.g},${dominantColor.b},0.25), rgba(${dominantColor.r},${dominantColor.g},${dominantColor.b},0.15))`
              : 'linear-gradient(to top right, rgba(224, 231, 255, 0.3), rgba(255, 228, 230, 0.3))'
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12 pt-20 lg:pt-24">


        <header className="relative mb-4 lg:mb-12">
          <h1 className="flex items-center gap-3 text-2xl lg:text-[32px] font-bold tracking-tight text-gray-900">
            <Sparkles className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" style={{ fill: 'currentColor' }} />
            Create your Event
          </h1>
        </header>

        <div className="flex flex-col-reverse lg:flex-row gap-6 lg:gap-24 items-start">
          {/* Left column - Form Fields */}
          <main className="flex-1 max-w-2xl w-full">
            <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom-4 duration-700 fade-in">

              <div className="space-y-10">

                {/* Basic Info */}
                <section className="group space-y-6 rounded-3xl p-1 transition-all duration-500">
                  {/* Header removed */}

                  <div className="space-y-6 px-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={form.title}
                        onChange={handleChange('title')}
                        className="block w-full rounded-2xl px-5 py-4 text-lg font-medium text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
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
                <section className="group space-y-6 rounded-3xl p-1 transition-all duration-500">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100/50 pb-2 mx-2">
                    <Calendar className="h-4 w-4 text-rose-500" />
                    Schedule
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 px-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
                      <input
                        type="datetime-local"
                        min={nowIsoLocal}
                        value={datetimeValue(form.startDateTime)}
                        onChange={handleChange('startDateTime')}
                        className="block w-full rounded-2xl px-5 py-4 text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End (Optional)</label>
                      <input
                        type="datetime-local"
                        min={datetimeValue(form.startDateTime)}
                        value={datetimeValue(form.endDateTime)}
                        onChange={handleChange('endDateTime')}
                        className="block w-full rounded-2xl px-5 py-4 text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                      />
                    </div>
                  </div>
                  <div className="mx-2 flex items-center gap-2 text-xs text-gray-500 bg-gray-100/50 px-4 py-2 rounded-full w-fit border border-gray-100">
                    <Globe className="h-3.5 w-3.5" />
                    <span>{timeZoneMeta.offsetLabel} · {timeZoneMeta.timeZone}</span>
                  </div>
                </section>

                {/* Location */}
                <section className="group space-y-6 rounded-3xl p-1 transition-all duration-500">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100/50 pb-2 mx-2">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                    Location
                  </div>

                  <div className="px-2">
                    <LocationPicker
                      initialVenue={form.venue}
                      initialCity={form.city}
                      onLocationSelect={(venue, city) => {
                        setForm(prev => ({ ...prev, venue, city }));
                      }}
                    />
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
                      Publishing...
                    </span>
                  ) : (
                    'Create Event'
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

                  <input
                    id={coverInputId}
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleCoverFileChange}
                    className="hidden"
                  />
                </label>

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
        </div>
      </div>

      {/* Mobile Upload Options Modal */}
      {showMobileUploadOptions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-4 animate-in slide-in-from-bottom-10 duration-300">
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
              onClick={() => {
                setShowMobileUploadOptions(false);
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors"
            >
              <div className="p-2 bg-white rounded-full shadow-sm">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              Upload from Device
            </button>

            <button
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
      )}

      {/* Mobile Gallery Modal */}
      {showMobileGallery && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 h-[80vh] flex flex-col animate-in slide-in-from-bottom-10 duration-300">
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
      )}
    </div >
  );
};

export default CreateEvent;
