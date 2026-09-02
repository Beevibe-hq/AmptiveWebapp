import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QrCode, Share2, MoreHorizontal, Youtube, Twitch, Heart, Check, ArrowLeft, Star, Briefcase, Eye, Settings, CreditCard, Users, Coffee, Crown, Zap, Gift, Loader2, Copy, Link } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import SupportCard from '@/components/SupportCard';
import DownloadCardModal from '@/components/DownloadCardModal';
import Navbar from '@/components/Navbar';
import SupportEditModal from '@/components/SupportEditModal';
import { getCurrentUser } from '@/lib/api/auth';
import { getSupportProfile, getSupportProfileByUsername, mergeSupportProfileIdentity, paySupportCreator, getSupportHistory, getSupportActivity, SupportProfile as SupportProfileType, SupportHistoryItem } from '@/lib/api/support';
import { toPng, toBlob } from 'html-to-image';
import Confetti from 'react-confetti';
import { extractDominantColors } from '@/utils/colorExtractor';
import { playSwoosh, playSuccessChime } from '@/utils/audio';
import { AmptiveSplash } from '@/components/AmptiveSpinner';
import { useSEO } from '@/hooks/useSEO';
import { formatSupportUrl, getSupportDomainPrefix } from '@/utils/supportUrl';
import { toast } from 'sonner';

/** Cap on the note a supporter leaves, so it stays readable in the activity list. */
const SUPPORT_MESSAGE_LIMIT = 200;

/**
 * Shows enough of a supporter's address for the creator to recognise them, without
 * putting a full contact address on screen: `jac•••@gmail.com`.
 */
function maskEmail(email?: string | null): string | null {
  if (!email || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return null;
  const head = local.slice(0, 3);
  return local.length > head.length ? `${head}•••@${domain}` : `${local}@${domain}`;
}

const AVATAR_PALETTES = [
  { bg: 'from-violet-500 to-indigo-600', text: 'text-white', heartColor: 'text-violet-500' },
  { bg: 'from-rose-500 to-pink-500', text: 'text-white', heartColor: 'text-rose-500' },
  { bg: 'from-emerald-500 to-teal-600', text: 'text-white', heartColor: 'text-emerald-500' },
  { bg: 'from-amber-500 to-orange-500', text: 'text-white', heartColor: 'text-amber-500' },
  { bg: 'from-sky-500 to-blue-600', text: 'text-white', heartColor: 'text-sky-500' },
  { bg: 'from-fuchsia-500 to-purple-600', text: 'text-white', heartColor: 'text-fuchsia-500' },
];

function getSupporterPalette(idStr: string) {
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

function getSupportActionWord(profileType?: string | null): string {
  const t = (profileType || '').toLowerCase();
  if (t === 'creator') return 'Gift';
  if (t === 'business') return 'Tip';
  if (t === 'organizer' || t === 'event_organizer' || t === 'event') return 'Support';
  return 'Gift';
}

function SupportShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.1 7.92939L11.4851 13.1596L11.485 9.6728C11.485 9.6728 11.2298 9.67282 10.8045 9.59358C10.3791 9.51433 9.86865 9.43508 9.18805 9.43508C8.50746 9.35583 7.82686 9.35584 7.06119 9.51433C6.63582 9.51433 6.2955 9.67281 5.87013 9.75205C5.44476 9.91054 5.10446 9.98979 4.67909 10.1483C4.25379 10.3067 3.91354 10.5444 3.57329 10.7821C3.23282 11.02 2.89253 11.2577 2.63731 11.5747C2.29689 11.8918 2.04173 12.1295 1.78657 12.4464C1.53134 12.7634 1.27613 13.0011 1.10598 13.3181C0.93585 13.635 0.765712 13.8727 0.595578 14.1105C0.510457 14.3483 0.340313 14.586 0.255239 14.7445C0.08509 15.1407 0 15.2992 0 15.2992C0 15.2992 5.19007e-06 15.0615 0.0850796 14.6652C0.0850796 14.5068 0.170164 14.1898 0.255239 13.952C0.340268 13.7144 0.425287 13.3977 0.510316 13.0809C0.595526 12.7634 0.765675 12.3671 0.935824 12.0501C1.10597 11.6539 1.27613 11.2577 1.53135 10.8615C1.7015 10.4653 2.0418 10.069 2.3821 9.6728C2.72243 9.27654 3.0627 8.88034 3.48806 8.56338L4.76417 7.61245C5.18954 7.37472 5.7 7.13696 6.21045 6.89923C7.14627 6.503 8.08206 6.26527 8.84773 6.10678C9.6134 5.94829 10.294 5.86905 10.7194 5.78981C11.1448 5.71056 11.4851 5.70859 11.4851 5.70859V2.69922L17.1 7.92939Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function SupportProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<SupportProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'all' | '7' | '30' | '90'>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [supporterCount, setSupporterCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'tip-card'>('tip-card');
  const [payments, setPayments] = useState<any[]>([]);
  const [publicActivity, setPublicActivity] = useState<SupportHistoryItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);

  const [selectedTier, setSelectedTier] = useState<number | 'custom' | null>(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('pending_support_data') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.amount) return parsed.amount;
      }
    } catch {}
    return null;
  });
  const [customAmount, setCustomAmount] = useState<string>('');
  const [supportMessage, setSupportMessage] = useState<string>(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('pending_support_data') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.message) return parsed.message;
      }
    } catch {}
    return '';
  });
  const [supporterName, setSupporterName] = useState<string>(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('pending_support_data') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.supporterName) return parsed.supporterName;
      }
    } catch {}
    return '';
  });
  const [supporterEmail, setSupporterEmail] = useState<string>(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('pending_support_data') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.supporterEmail) return parsed.supporterEmail;
      }
    } catch {}
    return '';
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentChannel, setPaymentChannel] = useState<string>('paystack');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>(() => {
    if (typeof window === 'undefined') return 'idle';
    const searchParams = new URLSearchParams(window.location.search);
    const reference = searchParams.get('reference') || searchParams.get('trxref') || searchParams.get('tx_ref');
    const statusParam = searchParams.get('status')?.toLowerCase();
    const isSuccessful =
      statusParam === 'successful' ||
      statusParam === 'success' ||
      statusParam === 'completed' ||
      (Boolean(reference) && statusParam !== 'cancelled' && statusParam !== 'failed');

    if (isSuccessful) return 'processing';

    try {
      const raw = sessionStorage.getItem('pending_support_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (!parsed.initiatedAt || Date.now() - parsed.initiatedAt < 15 * 60 * 1000)) {
          return 'processing';
        }
      }
    } catch {}

    return 'idle';
  });
  const [isRedirectingToGateway, setIsRedirectingToGateway] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingSuccessRef = useRef(false);
  const [shadowColor, setShadowColor] = useState<string | null>(null);
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [windowSize, setWindowSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1200, 
    height: typeof window !== 'undefined' ? window.innerHeight : 800 
  });

  const queryParams = new URLSearchParams(window.location.search);
  const viewAs = queryParams.get('viewAs');
  const isOwner = Boolean(currentUserId && profile?.user_id && currentUserId === profile.user_id && viewAs !== 'public');
  const actionWord = getSupportActionWord(profile?.profile_type);
  const seoDisplayName = profile?.full_name || profile?.name || profile?.username || 'Amptive Creator';
  const seoAction = getSupportActionWord(profile?.profile_type).toLowerCase();
  const seoDescription = profile
    ? (profile.support_message || profile.support_tagline || `Show your appreciation for ${seoDisplayName} with a ${seoAction} on Amptive.`)
        .replace(/<[^>]*>/g, '')
        .slice(0, 155)
    : 'Support creators, businesses, and event organizers on Amptive.';

  useSEO({
    title: profile ? `${actionWord} ${seoDisplayName}` : 'Support on Amptive',
    description: seoDescription,
    image: profile?.support_banner_url || profile?.support_avatar_url || profile?.avatar_url,
    url: formatSupportUrl(profile, profile?.username || profile?.user_id || id),
    type: 'profile',
  });

  const handleCopySupportLink = async () => {
    const linkSlug = profile?.username || profile?.user_id || id;
    const link = formatSupportUrl(profile, linkSlug);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch (e) {
        alert(`Your support link is: ${link}`);
      }
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSupportNow = async () => {
    setPaymentError(null);
    const amountNum = selectedTier === 'custom' ? Number(customAmount) : Number(selectedTier);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      setPaymentError('Please select or enter a valid amount.');
      return;
    }

    const trimmedEmail = supporterEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setPaymentError('Please enter a valid email address to receive your payment confirmation.');
      return;
    }

    const trimmedName = supporterName.trim();

    const primaryUsername = profile?.username || (profile as any)?.user?.username || id;
    const targets = Array.from(new Set([primaryUsername].filter(Boolean) as string[]));

    if (targets.length === 0) {
      setPaymentError('Unable to resolve creator username.');
      return;
    }

    setIsRedirectingToGateway(true);

    // Save pending support details so after payment gateway redirects back,
    // the amount, message, and creator are accurately displayed in the success confirmation.
    try {
      const pendingData = {
        amount: amountNum,
        message: supportMessage.trim(),
        username: primaryUsername || id,
        supporterName: trimmedName,
        supporterEmail: trimmedEmail,
        actionWord: actionWord,
        initiatedAt: Date.now(),
      };
      sessionStorage.setItem('pending_support_data', JSON.stringify(pendingData));
    } catch {}

    // Paystack returns here first so the callback can preserve ticket flows while
    // routing support payments back to this profile's animation sequence.
    const callbackUrl = `${window.location.origin}/verify`;

    // Try flutterwave first (paystack may not be configured for all creators)
    const channelsToTry = Array.from(new Set([paymentChannel, 'flutterwave', 'paystack']));

    try {
      let lastError = 'Payment initialization failed. Please try again.';

      for (const target of targets) {
        for (const channel of channelsToTry) {
          const result = await paySupportCreator(target, {
            amount: amountNum,
            message: supportMessage.trim() || undefined,
            payment_channel: channel,
            email: trimmedEmail,
            supporter_name: trimmedName || undefined,
            callback_url: callbackUrl,
            redirect_url: callbackUrl,
          });

          if (result.ok && result.data) {
            if (result.data.payment_url) {
              // Direct straight to payment gateway
              window.location.href = result.data.payment_url;
              return;
            }
            // Simulated/immediate completion fallback: show paper plane illustration, then success
            setIsRedirectingToGateway(false);
            setPaymentStatus('processing');
            playSwoosh();
            setTimeout(() => {
              setPaymentStatus('success');
              playSuccessChime();
            }, 2500);
            return;
          }

          lastError = result.error || lastError;
          // If the error is 404 (user not found), stop channel iterations for this target and try next target
          if (lastError.toLowerCase().includes('not found')) {
            break;
          }
          if (lastError.toLowerCase().includes('validation') || lastError.toLowerCase().includes('must contain')) {
            setIsRedirectingToGateway(false);
            setPaymentError(lastError);
            return;
          }
        }
      }

      setIsRedirectingToGateway(false);
      setPaymentError(lastError);
    } catch (err: any) {
      setIsRedirectingToGateway(false);
      setPaymentError(err?.message || 'An unexpected error occurred during checkout.');
    }
  };

  const getCaptureElement = (): HTMLElement | null => {
    return document.getElementById('support-card-export-target') || document.getElementById('support-card-target');
  };

  const handleDownloadCard = async () => {
    const element = getCaptureElement();
    if (!element) {
      console.error('Support card target element not found');
      return;
    }

    setIsDownloadingCard(true);

    try {
      // Use pixelRatio 7 to generate a true 4K Ultra HD PNG (3920px vertical resolution)
      const dataUrl = await toPng(element, {
        pixelRatio: 7,
        cacheBust: true,
        backgroundColor: undefined,
        style: {
          transform: 'none',
        },
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${profile?.username || 'support'}-card.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download card primary error, trying blob fallback:', err);
      try {
        const blob = await toBlob(element, { pixelRatio: 2, cacheBust: true });
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `${profile?.username || 'support'}-card.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        }
      } catch (fallbackErr) {
        console.error('Download card fallback error:', fallbackErr);
        alert('Could not download card image. Please try taking a screenshot instead.');
      }
    } finally {
      setIsDownloadingCard(false);
    }
  };

  const handleShareCard = async () => {
    const element = getCaptureElement();
    if (!element) return;
    try {
      const blob = await toBlob(element, { pixelRatio: 2, cacheBust: true });
      if (!blob) return;
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'support-card.png', { type: 'image/png' })] })) {
        const file = new File([blob], 'support-card.png', { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: `${profile?.full_name}'s Amptive Support Card`,
          text: `Check out my Amptive Support Profile: ${formatSupportUrl(profile, profile?.username || id)}`,
        });
      } else {
        await navigator.clipboard.writeText(formatSupportUrl(profile, profile?.username || id));
        alert('Profile link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share card error:', err);
    }
  };

  const handleShareProfile = async () => {
    const url = window.location.href;
    const title = `${profile?.full_name || 'Creator'}'s Amptive Support Profile`;
    const text = `Support ${profile?.full_name || 'Creator'} on Amptive!`;

    if (navigator.share && navigator.canShare && navigator.canShare({ url, title, text })) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
      } catch (err) {
        console.error('Error sharing profile:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Profile link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  /*
   * For the owner: the private /history endpoint reports payments they received.
   * For guests: the public /activity endpoint shows the creator's successful
   * supports for the current month — no auth required.
   */
  const fetchActivity = useCallback(async () => {
    if (!profile?.user_id) {
      setPayments([]);
      setSupporterCount(0);
      return;
    }

    const username = (profile.username || id || '').toLowerCase();
    // Clean up any stale artificial localStorage entries
    try {
      localStorage.removeItem(`amptive_local_supports_${username}`);
    } catch {}

    if (isOwner) {
      const historyRes = await getSupportHistory({
        date_filter: timeRange === '7' ? 'last_7_days' : timeRange === '30' ? 'last_30_days' : timeRange === '90' ? 'last_90_days' : 'all_time',
        page: 1,
        page_size: 50,
      });

      if (historyRes.ok) {
        setPayments(historyRes.items || []);
        setSupporterCount(historyRes.total || historyRes.items.length || 0);
      }
    } else {
      // Public activity for guests
      if (!username) return;
      setActivityLoading(true);
      const activityRes = await getSupportActivity(username, {
        page: activityPage,
        page_size: 10,
      });

      if (activityRes.ok) {
        setPublicActivity(activityRes.items || []);
        setSupporterCount(activityRes.total || activityRes.items.length || 0);
        setActivityTotalPages(activityRes.total_pages || 1);
      }
      setActivityLoading(false);
    }
  }, [profile?.user_id, profile?.username, isOwner, timeRange, activityPage, id]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      if (!profile) {
        setLoading(true);
      }
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user?.user_id || user?.id || null);
        if (user?.email) {
          setSupporterEmail(user.email);
        }
        if (user?.full_name || user?.name || user?.username) {
          setSupporterName(user.full_name || user.name || user.username);
        }

        // Retrieve support profile by username or user ID
        let profileData: SupportProfileType | null = await getSupportProfileByUsername(id);
        if (!profileData) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          if (isUuid) {
            profileData = await getSupportProfile(id);
          }
        }

        // The support response intentionally contains support settings only. For the
        // owner, hydrate identity fields from the already-loaded authenticated user.
        if (profileData && user) {
          const userId = user.user_id || user.id;
          if (profileData.user_id === userId) {
            profileData = mergeSupportProfileIdentity(
              profileData,
              user as unknown as Record<string, unknown>
            );
          }
        }

        setProfile(profileData);
      } catch (error) {
        console.error('Error loading support profile:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    if (profile && loading) {
      setLoading(false);
    }
  }, [profile, loading]);

  useEffect(() => {
    if (paymentStatus === 'processing' || paymentStatus === 'success') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [paymentStatus]);

  const triggerSuccessFlow = useCallback((refFromUrl?: string) => {
    if (isProcessingSuccessRef.current) return;
    isProcessingSuccessRef.current = true;

    const raw = sessionStorage.getItem('pending_support_data');
    sessionStorage.removeItem('pending_support_data');

    let parsedRef = refFromUrl || '';

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        parsedRef = parsed.reference || parsedRef || `ref-${Date.now()}`;

        if (parsed.amount) {
          setSelectedTier(parsed.amount);
        }
        if (parsed.message) {
          setSupportMessage(parsed.message);
        }
      } catch {}
    }

    // Check if this specific payment was already processed in this session
    const processedKey = 'amptive_processed_support_refs';
    let processedRefs: string[] = [];
    try {
      const savedRefs = JSON.parse(sessionStorage.getItem(processedKey) || '[]');
      processedRefs = Array.isArray(savedRefs) ? savedRefs : [];
    } catch {}

    if (parsedRef && processedRefs.includes(parsedRef)) {
      // A previous event already completed this payment. Do not repeat its activity
      // work, but never leave this return route stranded in an invisible loader.
      setPaymentStatus('success');
      isProcessingSuccessRef.current = false;
      return;
    }
    if (parsedRef) {
      processedRefs.push(parsedRef);
      sessionStorage.setItem(processedKey, JSON.stringify(processedRefs));
    }

    setIsRedirectingToGateway(false);
    setPaymentStatus('processing');
    playSwoosh();

    // Refresh live activity data from backend
    fetchActivity();

    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }

    successTimerRef.current = setTimeout(() => {
      setPaymentStatus('success');
      playSuccessChime();
      fetchActivity();
      isProcessingSuccessRef.current = false;
    }, 3800);
  }, [fetchActivity]);

  // Handle return from payment gateway (Paystack / Flutterwave) & modal events
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const reference = searchParams.get('reference') || searchParams.get('trxref') || searchParams.get('tx_ref');
    const statusParam = searchParams.get('status')?.toLowerCase();

    const isSuccessful =
      statusParam === 'successful' ||
      statusParam === 'success' ||
      statusParam === 'completed' ||
      (Boolean(reference) && statusParam !== 'cancelled' && statusParam !== 'failed');

    const isFailed = statusParam === 'cancelled' || statusParam === 'failed';

    if (isSuccessful) {
      triggerSuccessFlow(reference || undefined);
      const cleanUrl = window.location.pathname + (searchParams.get('viewAs') ? `?viewAs=${searchParams.get('viewAs')}` : '');
      window.history.replaceState({}, '', cleanUrl);
    } else if (isFailed) {
      sessionStorage.removeItem('pending_support_data');
      setIsRedirectingToGateway(false);
      setPaymentStatus('idle');
      setPaymentError('Payment was not completed. Please try again.');
      toast.error('Payment was not completed. Please try again.');
      const cleanUrl = window.location.pathname + (searchParams.get('viewAs') ? `?viewAs=${searchParams.get('viewAs')}` : '');
      window.history.replaceState({}, '', cleanUrl);
    }

    // Also handle postMessage events (when Paystack/Flutterwave communicates success via iframe/modal)
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      const isPaystackSuccess =
        data === 'paystack:success' ||
        data?.event === 'successful' ||
        data?.event === 'charge.success' ||
        data?.status === 'success';

      if (isPaystackSuccess) {
        triggerSuccessFlow();
      }
    };

    // When the supporter finishes on Paystack and returns/focuses back on this tab
    const handleWindowFocusOrVisibility = () => {
      try {
        const raw = sessionStorage.getItem('pending_support_data');
        if (raw) {
          const parsed = JSON.parse(raw);
          // If initiated within the last 15 minutes, trigger the success animation flow
          if (parsed && (!parsed.initiatedAt || Date.now() - parsed.initiatedAt < 15 * 60 * 1000)) {
            triggerSuccessFlow(parsed.reference);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('focus', handleWindowFocusOrVisibility);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleWindowFocusOrVisibility();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('focus', handleWindowFocusOrVisibility);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [id, triggerSuccessFlow]);

  const hexToRgba = (hex: string, alpha: number) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (_m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const uploadedAvatar = profile?.support_avatar_url || profile?.avatar_url;
      if (!uploadedAvatar) {
        setShadowColor(null);
        return;
      }
      try {
        const [color] = await extractDominantColors(uploadedAvatar, 1);
        if (!cancelled) setShadowColor(color);
      } catch (e) {
        if (!cancelled) setShadowColor(null);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [profile?.support_avatar_url, profile?.avatar_url]);

  const topTintStyle = React.useMemo(() => {
    if (!shadowColor) return undefined;
    const c12 = hexToRgba(shadowColor, 0.12);
    const c08 = hexToRgba(shadowColor, 0.08);
    const c04 = hexToRgba(shadowColor, 0.04);
    return {
      background: `linear-gradient(to bottom, ${c12} 0%, ${c08} 20%, ${c04} 40%, rgba(255,255,255,0) 60%)`
    } as React.CSSProperties;
  }, [shadowColor]);

  const filteredPayments = React.useMemo(() => {
    return payments.filter((payment) => {
      if (timeRange === 'all') return true;
      const date = new Date(payment.created_at);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
      return diffDays <= Number(timeRange);
    });
  }, [payments, timeRange]);

  if (loading && paymentStatus === 'idle') {
    return (
      <AmptiveSplash />
    );
  }

  const displayName = profile?.full_name || profile?.name || profile?.username || 'Amptive Creator';

  // The owner can switch their page offline without losing any of its settings.
  // While it is off the page is unreachable for everyone — the record still exists,
  // so this is deliberately distinct from "not found". Absent flag = on, so pages
  // predating the toggle are unaffected.
  const supportIsOffline =
    Boolean(profile) && (profile?.support_enabled ?? profile?.accept_tips ?? true) === false;

  if (supportIsOffline && paymentStatus === 'idle' && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="text-6xl mb-4">🌙</div>
        <h1 className="text-2xl font-bold text-gray-900">This page is not accepting support</h1>
        <p className="text-gray-500 mb-6 max-w-sm">
          {isOwner
            ? 'Your support page is switched off, so no one else can open it. Your settings, card design and images are all saved.'
            : `${displayName} has turned off their support page for now. Check back later.`}
        </p>
        <button
          onClick={() => navigate(isOwner ? '/profile/support-setup' : '/')}
          className="px-6 py-2 bg-black text-white rounded-full font-bold shadow-lg"
        >
          {isOwner ? 'Turn it back on' : 'Go Home'}
        </button>
      </div>
    );
  }

  if (!profile && paymentStatus === 'idle' && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="text-6xl mb-4">🏜️</div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Not Found</h1>
        <p className="text-gray-500 mb-6">The creator you're looking for doesn't exist yet.</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-black text-white rounded-full font-bold shadow-lg"
        >
          Go Home
        </button>
      </div>
    );
  }

  const profileAvatarUrl = profile?.support_avatar_url || profile?.avatar_url;
  const avatarInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

  return (
    <div className={paymentStatus === 'success' ? "min-h-screen overflow-x-hidden font-sans selection:bg-blue-100 selection:text-blue-900 bg-transparent" : "min-h-screen overflow-x-hidden bg-white font-sans selection:bg-blue-100 selection:text-blue-900"}>
      {/* Ambient blurred avatar wash (success page only).
          `filter` (not `backdrop-filter`) is what blurs this layer's own background image;
          backdrop-filter only blurs what sits behind the element, which left the photo
          sharp. The scale hides the soft transparent edges the blur creates, and the scrim
          on top keeps page and footer text readable over any avatar. */}
      {paymentStatus === 'success' && (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              filter: 'blur(140px)',
              transform: 'scale(1.3)',
              backgroundImage: profileAvatarUrl ? `url("${profileAvatarUrl}")` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div className="absolute inset-0 bg-white/70" />
        </div>
      )}
      {viewAs === 'public' && currentUserId === profile.user_id && (
        <div className="bg-indigo-600 text-white py-3 px-4 flex items-center justify-center gap-6 sticky top-0 z-[100] shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Eye size={16} /> <span>You are previewing your profile as a supporter</span>
          </div>
          <button 
            onClick={() => navigate(`/support/${profile.username || profile.user_id}`)}
            className="px-4 py-1.5 bg-white text-indigo-600 rounded-full text-xs font-black hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
          >
            Exit Preview
          </button>
        </div>
      )}
      {!(viewAs === 'public' && currentUserId === profile.user_id) && (
        <Navbar hideMenu={true} forceSupportMode={true} />
      )}
      
      {/* Banner Section */}
      {paymentStatus === 'idle' && (
        <div 
          className="relative w-full h-[280px] md:h-[350px] overflow-hidden transition-colors duration-1000"
          style={{ 
            backgroundColor: shadowColor || '#4F46E5',
            backgroundImage: !profile.support_banner_url ? `linear-gradient(135deg, ${shadowColor ? hexToRgba(shadowColor, 0.8) : 'rgba(255,255,255,0.2)'} 0%, transparent 100%)` : undefined
          }}
        >
          <div className="absolute inset-0 z-0">
            {profile.support_banner_url ? (
              <img 
                src={profile.support_banner_url} 
                alt="Support Banner" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full opacity-20 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0MDAnIGhlaWdodD0nNDAwJz48ZmlsdGVyIGlkPSduJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC44JyBzdGl0Y2hUaWxlcz0nc3RpdGNoJy8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgZmlsdGVyPSd1cmwoI24pJy8+PC9zdmc+')] bg-repeat" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={paymentStatus === 'idle' ? "relative -mt-20 z-20 pb-24" : "py-24"}>
        {paymentStatus === 'idle' && (
          <>
        {/* Action Buttons Floating Right */}
        <div className="absolute top-24 right-4 md:right-12 flex items-center gap-3">
          {isOwner ? (
            <>
              <button 
                onClick={() => navigate(`/support/${profile.username || profile.user_id}?viewAs=public`)}
                className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all hover:text-blue-600 group relative"
                title="View as public"
              >
                <Eye size={20} />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">View Public</span>
              </button>
              <button 
                onClick={() => navigate('/profile/support-setup')}
                className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all hover:text-black group relative"
                title="Support Settings"
              >
                <Settings size={20} />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Settings</span>
              </button>
              <button 
                onClick={handleCopySupportLink} 
                className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors duration-200 ease-out shadow-sm group relative"
                title="Copy link"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={copiedLink ? 'copied' : 'copy'}
                    initial={{ opacity: 0, scale: 0.72, rotate: -12 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.72, rotate: 12 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24, mass: 0.55 }}
                    className="block text-black"
                  >
                    {copiedLink ? <Check size={20} /> : <Copy size={20} />}
                  </motion.span>
                </AnimatePresence>
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {copiedLink ? 'Copied!' : 'Copy'}
                </span>
              </button>
              <button onClick={handleShareProfile} className="p-2.5 rounded-full bg-white border border-gray-100 text-black hover:bg-gray-50 transition-colors duration-200 shadow-sm" title="Share profile"><SupportShareIcon /></button>
            </>
          ) : (
            <>
              <button 
                onClick={handleCopySupportLink} 
                className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors duration-200 ease-out shadow-sm group relative"
                title="Copy link"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={copiedLink ? 'copied' : 'copy'}
                    initial={{ opacity: 0, scale: 0.72, rotate: -12 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.72, rotate: 12 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24, mass: 0.55 }}
                    className="block text-black"
                  >
                    {copiedLink ? <Check size={20} /> : <Copy size={20} />}
                  </motion.span>
                </AnimatePresence>
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {copiedLink ? 'Copied!' : 'Copy'}
                </span>
              </button>
              <button onClick={handleShareProfile} className="p-2.5 rounded-full bg-white border border-gray-100 text-black hover:bg-gray-50 transition-colors duration-200 shadow-sm" title="Share profile"><SupportShareIcon /></button>
            </>
          )}
        </div>

        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center">
              <div className="relative group">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-40 h-40 md:w-48 md:h-48 rounded-[40px] border-[6px] border-white/80 backdrop-blur-sm overflow-hidden bg-white"
                >
                  {profileAvatarUrl ? (
                    <img
                      src={profileAvatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-4xl font-bold text-gray-500">
                      {avatarInitials}
                    </div>
                  )}
                </motion.div>
              </div>

            <div className="mt-8 text-center space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                    {displayName}
                  </h2>
                  {profile.profile_type && (
                    <div className="relative flex-shrink-0 cursor-help group">
                      <div className="relative w-6 h-6 flex items-center justify-center">
                        <svg viewBox="0 0 22 22" aria-label="Verified account" role="img" className={`w-full h-full fill-current ${profile.profile_type === 'creator' ? 'text-[#FFD700]' : 'text-purple-900'}`} data-testid="icon-verified">
                          <g><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z"></path></g>
                        </svg>
                        <img src="/amptivelogo.svg" alt="Amptive Logo" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[52%] w-[13px] h-auto brightness-0 invert" />
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-50">
                        <div className="relative">
                          Verified {profile.profile_type === 'creator' ? 'Creator' : 'Business'}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-gray-500 font-medium">
                  {profile.support_message || profile.support_tagline || (profile.profile_type === 'creator' ? 'Professional Content Creator + Educator' : 'Premium Business Partner')}
                </p>
                <div className="flex flex-col items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-black/5 rounded-full text-xs font-semibold text-gray-500 mt-1.5 shadow-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      className="w-3.5 h-3.5 text-gray-400"
                      aria-hidden="true"
                    >
                      <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875V3H9.375ZM12.75 3v3.75h1.875a1.875 1.875 0 1 0 0-3.75H12.75Z" />
                      <path fillRule="evenodd" d="M1.5 7.5a1.5 1.5 0 0 1 1.5-1.5h18a1.5 1.5 0 0 1 1.5 1.5v3.75a1.5 1.5 0 0 1-1.5 1.5h-18a1.5 1.5 0 0 1-1.5-1.5V7.5ZM12 6.75a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M3.75 14.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 .75.75v3.75a3 3 0 0 1-3 3h-9.75a3 3 0 0 1-3-3v-3.75Zm8.25.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                    </svg>
                    <span>
                      {supporterCount !== null ? (supporterCount >= 1000 ? `${(supporterCount / 1000).toFixed(1)}k` : supporterCount) : '0'} Monthly Supporters
                    </span>
                  </div>

                  {/* Copy Support Link Pill */}
                  <button 
                    onClick={handleCopySupportLink}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gray-50/90 border border-gray-200/80 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-100 transition-all shadow-xs group active:scale-95 mt-1 cursor-pointer"
                  >
                    <span className="text-gray-400 font-normal">{getSupportDomainPrefix(profile)}/</span>
                    <span className="font-bold text-gray-900">{profile.username || 'creator'}</span>
                    <span className="w-px h-3 bg-gray-200 mx-0.5" />
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={copiedLink ? 'copied' : 'copy'}
                        initial={{ opacity: 0, x: -4, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 4, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 25, mass: 0.5 }}
                        className={`flex items-center gap-1 font-bold ${copiedLink ? 'text-black' : 'text-gray-400 group-hover:text-black transition-colors'}`}
                      >
                        {copiedLink ? <><Check size={13} /> Copied!</> : <Copy size={13} />}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              {isOwner && (
                <div className="pt-4">
                  <button onClick={() => setIsEditModalOpen(true)} className="bg-black text-white px-10 py-3 rounded-full text-sm font-bold hover:bg-gray-800 transition-all hover:scale-105 active:scale-95">
                    Edit page
                  </button>
                </div>
              )}

              <div className={`flex items-center justify-center gap-8 ${isOwner ? 'pt-4' : 'pt-2'}`}>
                {profile.support_socials?.x && (
                  <a href={profile.support_socials.x.startsWith('http') ? profile.support_socials.x : `https://${profile.support_socials.x}`} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-400 hover:text-black transition-colors cursor-pointer">
                      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.487h2.039L6.486 3.24H4.298l13.311 17.4z" />
                    </svg>
                  </a>
                )}
                {profile.support_socials?.instagram && (
                  <a href={profile.support_socials.instagram.startsWith('http') ? profile.support_socials.instagram : `https://${profile.support_socials.instagram}`} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-gray-400 hover:text-black transition-colors cursor-pointer">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </a>
                )}
                {profile.support_socials?.youtube && (
                  <a href={profile.support_socials.youtube.startsWith('http') ? profile.support_socials.youtube : `https://${profile.support_socials.youtube}`} target="_blank" rel="noopener noreferrer">
                    <Youtube className="text-gray-400 hover:text-black transition-colors cursor-pointer" size={28} />
                  </a>
                )}
                {profile.support_socials?.website && (
                  <a href={profile.support_socials.website.startsWith('http') ? profile.support_socials.website : `https://${profile.support_socials.website}`} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-gray-400 hover:text-black transition-colors cursor-pointer">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  </a>
                )}
                {isOwner && !profile.support_socials?.x && !profile.support_socials?.instagram && !profile.support_socials?.youtube && !profile.support_socials?.website && (
                  <button onClick={() => setIsEditModalOpen(true)} className="transition-all group scale-125 hover:scale-135">
                    <div className="flex -space-x-3">
                      <div className="w-8 h-8 rounded-full bg-black border-2 border-white flex items-center justify-center p-2 text-white shadow-sm group-hover:-translate-y-0.5 transition-transform"><svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.487h2.039L6.486 3.24H4.298l13.311 17.4z" /></svg></div>
                      <div className="w-8 h-8 rounded-full bg-[#E4405F] border-2 border-white flex items-center justify-center p-2 text-white shadow-sm group-hover:-translate-y-0.5 transition-transform delay-75"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></div>
                      <div className="w-8 h-8 rounded-full bg-[#FF0000] border-2 border-white flex items-center justify-center p-2 text-white shadow-sm group-hover:-translate-y-0.5 transition-transform delay-100"><Youtube className="w-full h-full" /></div>
                      <div className="w-8 h-8 rounded-full bg-[#0066FF] border-2 border-white flex items-center justify-center p-2 text-white shadow-sm group-hover:-translate-y-0.5 transition-transform delay-150"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg></div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Dynamic Content Based on Role & Tab */}
        <div className="mt-12">
          {paymentStatus === 'processing' ? (
            <div className="fixed inset-0 z-[80] flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4 text-center">
              <motion.img 
                src="/images/paper_plane.png"
                alt="Sending support illustration"
                className="w-48 h-48 md:w-64 md:h-64 drop-shadow-2xl object-contain"
                initial={{ x: -220, y: 90, opacity: 0, scale: 0.7, rotate: -20 }}
                animate={{ 
                  x: [ -220, 0, 0, 0, 220 ], 
                  y: [ 90, 0, -15, 15, -120 ], 
                  opacity: [ 0, 1, 1, 1, 0 ], 
                  rotate: [ -20, 0, -6, 6, 25 ],
                  scale: [ 0.6, 1, 1.08, 0.96, 0.5 ]
                }}
                transition={{ 
                  duration: 3.8, 
                  times: [0, 0.22, 0.55, 0.82, 1],
                  ease: "easeInOut" 
                }}
              />
              <motion.h3
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: [0, 1, 1, 1, 0], y: [12, 0, 0, 0, -12] }}
                transition={{ duration: 3.8, times: [0, 0.2, 0.55, 0.85, 1] }}
                className="text-2xl md:text-3xl font-bold text-gray-900 drop-shadow-sm"
              >
                Sending your {actionWord.toLowerCase()}...
              </motion.h3>
            </div>
          ) : paymentStatus === 'success' ? (
            <div className="relative z-[81] max-w-4xl mx-auto px-4 md:px-0 flex flex-col items-center justify-center text-center space-y-6 py-12">
              <Confetti
                width={windowSize.width}
                height={windowSize.height}
                recycle={false}
                numberOfPieces={500}
                tweenDuration={180}
                style={{ position: 'fixed', inset: 0, zIndex: 90, pointerEvents: 'none' }}
              />
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                <motion.div 
                  className="relative w-24 h-24 mb-6 perspective-[1000px]"
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: [0, 0, 180, 180, 360] }}
                  transition={{ duration: 4.5, times: [0, 0.2, 0.3, 0.85, 1], ease: "easeInOut" }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front Side (Avatar) */}
                  <div className="absolute inset-0 w-full h-full" style={{ backfaceVisibility: 'hidden' }}>
                    {profileAvatarUrl ? (
                      <img
                        src={profileAvatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover rounded-full shadow-xl shadow-black/10 border-4 border-white"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full border-4 border-white bg-gray-100 text-2xl font-bold text-gray-500 shadow-xl shadow-black/10">
                        {avatarInitials}
                      </div>
                    )}
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.1 }}
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm"
                    >
                      <motion.svg 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth={4}
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="w-4 h-4"
                      >
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.45, delay: 0.2, ease: "easeOut" }}
                          d="M4 12L9 17L20 6"
                        />
                      </motion.svg>
                    </motion.div>
                  </div>

                  {/* Back Side (Smile Emoji) */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-[#fde047] rounded-full shadow-xl border-4 border-white flex items-center justify-center text-4xl"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], rotate: [0, -15, 15, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      😊
                    </motion.div>
                  </div>
                </motion.div>
                <h1 className="text-3xl font-bold text-gray-900 mt-2 mb-4">
                  {actionWord === 'Gift' ? 'Gift Sent!' : `${actionWord} Successful!`}
                </h1>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Thank you for {actionWord === 'Gift' ? 'gifting' : actionWord === 'Tip' ? 'tipping' : 'supporting'} {displayName}. Your contribution of <strong className="text-gray-900">₦{Number(selectedTier === 'custom' ? customAmount : selectedTier).toLocaleString()}</strong> means a lot!
                </p>
                <button
                  onClick={() => setPaymentStatus('idle')}
                  className="px-8 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                  {actionWord} Again
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              {/* Tabs Section */}
              <div className="mb-12 border-b border-gray-100 flex justify-center gap-12">
                <button 
                  onClick={() => setActiveTab('tip-card')} 
                  className={`pb-4 border-b-2 font-bold transition-all ${activeTab === 'tip-card' ? 'border-black text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  {isOwner ? 'Tip card' : actionWord}
                </button>
                <button 
                  onClick={() => setActiveTab('activity')} 
                  className={`pb-4 border-b-2 font-bold transition-all ${activeTab === 'activity' ? 'border-black text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Activity
                </button>
              </div>

              {activeTab === 'activity' ? (
                isOwner ? (
                  <div className="max-w-4xl mx-auto space-y-8 px-4 md:px-0">
                    {/* Earnings Overview */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-gray-100 p-8 rounded-[32px] shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">Earnings</h3>
                        <div className="relative">
                          <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-100 transition-all text-gray-900"
                          >
                            {timeRange === 'all' ? 'All time' : `Last ${timeRange} days`} <MoreHorizontal size={14} className="rotate-90" />
                          </button>
                          <AnimatePresence>
                            {isDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5 origin-top-right"
                                >
                                  {[
                                    { key: 'all', label: 'All time' },
                                    { key: '7', label: 'Last 7 days' },
                                    { key: '30', label: 'Last 30 days' },
                                    { key: '90', label: 'Last 90 days' }
                                  ].map((range) => (
                                    <button
                                      key={range.key}
                                      onClick={() => {
                                        setTimeRange(range.key as any);
                                        setIsDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${timeRange === range.key ? 'bg-gray-50 text-black font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                      {range.label}
                                    </button>
                                  ))}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      
                      <div className="text-4xl font-bold text-gray-900 tracking-normal">
                        ₦{filteredPayments
                          .reduce((acc, curr) => acc + Number(curr.amount), 0)
                          .toLocaleString()}
                      </div>
                    </motion.div>

                    {/* Recent Activity Feed */}
                    <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                      <div className="p-8 border-b border-gray-50">
                        <h3 className="text-2xl font-bold text-gray-900">Recent</h3>
                        <div className="flex items-center gap-2 mt-2 text-indigo-600 font-bold text-sm">
                          <span>
                            {filteredPayments.length} recent donations
                          </span>
                        </div>
                      </div>
                      
                      <div className="divide-y divide-gray-50">
                        {filteredPayments.length > 0 ? (
                          filteredPayments.map((payment) => (
                            <motion.div 
                              key={payment.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="p-6 hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  {/* Avatar */}
                                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                      className="w-5 h-5"
                                      aria-hidden="true"
                                    >
                                      <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875V3H9.375ZM12.75 3v3.75h1.875a1.875 1.875 0 1 0 0-3.75H12.75Z" />
                                      <path fillRule="evenodd" d="M1.5 7.5a1.5 1.5 0 0 1 1.5-1.5h18a1.5 1.5 0 0 1 1.5 1.5v3.75a1.5 1.5 0 0 1-1.5 1.5h-18a1.5 1.5 0 0 1-1.5-1.5V7.5ZM12 6.75a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                      <path fillRule="evenodd" d="M3.75 14.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 .75.75v3.75a3 3 0 0 1-3 3h-9.75a3 3 0 0 1-3-3v-3.75Zm8.25.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    {(() => {
                                      const date = new Date(payment.created_at);
                                      const now = new Date();
                                      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
                                      let timeStr = '';
                                      if (diffSec < 60) timeStr = 'now';
                                      else if (diffSec < 3600) timeStr = `${Math.floor(diffSec / 60)}m`;
                                      else if (diffSec < 86400) timeStr = `${Math.floor(diffSec / 3600)}h`;
                                      else timeStr = `${Math.floor(diffSec / 86400)}d`;

                                      return (
                                        <>
                                          <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-900 text-base truncate whitespace-nowrap">
                                              {payment.supporter_name || payment.sender_name || (payment as any).name || (payment as any).full_name || (payment as any).supporterName || 'A supporter'}
                                            </h4>
                                            <span className="text-gray-300 font-bold text-xs hidden sm:inline">•</span>
                                            <span className="text-gray-400 text-sm font-bold hidden sm:inline">
                                              {timeStr}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-gray-400 text-xs font-bold sm:hidden shrink-0">
                                              {timeStr}
                                            </span>
                                            {isOwner && (
                                              <>
                                                <span className="text-gray-300 font-bold text-[10px] sm:hidden">•</span>
                                                <p className="text-gray-400 text-xs truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
                                                  {maskEmail(payment.supporter_email || payment.sender_email) || 'No email on record'}
                                                </p>
                                              </>
                                            )}
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>

                                <div className="text-right shrink-0 ml-4">
                                  <span className="font-black text-gray-900 text-xl tracking-normal">₦{Number(payment.amount).toLocaleString()}</span>
                                </div>
                              </div>

                              {payment.message && (
                                <div className="mt-4">
                                  <div className="text-gray-600 text-sm leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                                    {payment.message}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-24 bg-gray-50/30 rounded-[40px] border border-dashed border-gray-100">
                            <div className="w-20 h-20 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-6">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                className="w-10 h-10 text-gray-200"
                                aria-hidden="true"
                              >
                                <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875V3H9.375ZM12.75 3v3.75h1.875a1.875 1.875 0 1 0 0-3.75H12.75Z" />
                                <path fillRule="evenodd" d="M1.5 7.5a1.5 1.5 0 0 1 1.5-1.5h18a1.5 1.5 0 0 1 1.5 1.5v3.75a1.5 1.5 0 0 1-1.5 1.5h-18a1.5 1.5 0 0 1-1.5-1.5V7.5ZM12 6.75a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M3.75 14.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 .75.75v3.75a3 3 0 0 1-3 3h-9.75a3 3 0 0 1-3-3v-3.75Zm8.25.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 tracking-tight">No activity yet</h3>
                            <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">When people support your work, their contributions and messages will appear here.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Public Recent Activity Feed */
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-4xl mx-auto px-4 md:px-0"
                  >
                    <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                      <div className="p-8 border-b border-gray-50">
                        <h3 className="text-2xl font-bold text-gray-900">Recent</h3>
                        <div className="flex items-center gap-2 mt-2 text-indigo-600 font-bold text-sm">
                          <span>
                            {(supporterCount !== null ? supporterCount : publicActivity.length)} recent {actionWord === 'Gift' ? 'gifts' : actionWord === 'Tip' ? 'tips' : 'donations'}
                          </span>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-50">
                        {publicActivity.length > 0 ? (
                          publicActivity.map((item, idx) => {
                            const date = new Date(item.created_at);
                            const now = new Date();
                            const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
                            let timeStr = '';
                            if (diffSec < 60) timeStr = 'now';
                            else if (diffSec < 3600) timeStr = `${Math.floor(diffSec / 60)}m`;
                            else if (diffSec < 86400) timeStr = `${Math.floor(diffSec / 3600)}h`;
                            else timeStr = `${Math.floor(diffSec / 86400)}d`;

                            const email = (item as any).supporter_email || (item as any).sender_email;

                            return (
                              <div
                                key={item.id || idx}
                                className="p-6 hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                        className="w-5 h-5"
                                        aria-hidden="true"
                                      >
                                        <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875V3H9.375ZM12.75 3v3.75h1.875a1.875 1.875 0 1 0 0-3.75H12.75Z" />
                                        <path fillRule="evenodd" d="M1.5 7.5a1.5 1.5 0 0 1 1.5-1.5h18a1.5 1.5 0 0 1 1.5 1.5v3.75a1.5 1.5 0 0 1-1.5 1.5h-18a1.5 1.5 0 0 1-1.5-1.5V7.5ZM12 6.75a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                        <path fillRule="evenodd" d="M3.75 14.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 .75.75v3.75a3 3 0 0 1-3 3h-9.75a3 3 0 0 1-3-3v-3.75Zm8.25.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-900 text-base truncate whitespace-nowrap">
                                          {item.supporter_name || 'A supporter'}
                                        </h4>
                                        <span className="text-gray-300 font-bold text-xs hidden sm:inline">•</span>
                                        <span className="text-gray-400 text-sm font-bold hidden sm:inline">
                                          {timeStr}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-gray-400 text-xs font-bold sm:hidden shrink-0">
                                          {timeStr}
                                        </span>
                                        {email && (
                                          <>
                                            <span className="text-gray-300 font-bold text-[10px] sm:hidden">•</span>
                                            <p className="text-gray-400 text-xs truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
                                              {maskEmail(email)}
                                            </p>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 ml-4">
                                    <span className="font-black text-gray-900 text-xl tracking-normal">
                                      ₦{Number(item.amount).toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {item.message && (
                                  <div className="mt-4">
                                    <div className="text-gray-600 text-sm leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                                      {item.message}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-24 bg-gray-50/30 rounded-[40px] border border-dashed border-gray-100">
                            <div className="w-20 h-20 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-6">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                className="w-10 h-10 text-gray-200"
                                aria-hidden="true"
                              >
                                <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875V3H9.375ZM12.75 3v3.75h1.875a1.875 1.875 0 1 0 0-3.75H12.75Z" />
                                <path fillRule="evenodd" d="M1.5 7.5a1.5 1.5 0 0 1 1.5-1.5h18a1.5 1.5 0 0 1 1.5 1.5v3.75a1.5 1.5 0 0 1-1.5 1.5h-18a1.5 1.5 0 0 1-1.5-1.5V7.5ZM12 6.75a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M3.75 14.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 .75.75v3.75a3 3 0 0 1-3 3h-9.75a3 3 0 0 1-3-3v-3.75Zm8.25.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 tracking-tight">No activity yet</h3>
                            <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">When people support your work, their contributions and messages will appear here.</p>
                          </div>
                        )}
                      </div>

                      {/* Pagination Bar */}
                      {activityTotalPages > 1 && (
                        <div className="p-4 bg-gray-50/40 border-t border-gray-50 flex items-center justify-between">
                          <button
                            onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                            disabled={activityPage <= 1 || activityLoading}
                            className="px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            ← Prev
                          </button>
                          <span className="text-xs text-gray-500 font-medium tabular-nums">
                            Page <strong className="text-gray-900">{activityPage}</strong> of {activityTotalPages}
                          </span>
                          <button
                            onClick={() => setActivityPage((p) => Math.min(activityTotalPages, p + 1))}
                            disabled={activityPage >= activityTotalPages || activityLoading}
                            className="px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              ) : (
                isOwner ? (
                  <motion.div 
                    key="owner-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-xl mx-auto py-4 space-y-6"
                  >
                    <div id="support-card-target" className="p-4 md:p-8 -m-4 md:-m-8">
                      <SupportCard 
                        name={displayName}
                        username={profile.username} 
                        avatarUrl={profile.support_avatar_url || profile.avatar_url} 
                        message={profile.support_message || profile.support_tagline || "Level up your journey with me."} 
                        isDisplayOnly={true}
                        variant={profile.support_card_variant || 0}
                        profileType={profile.profile_type}
                      />
                    </div>
                    <div className="flex justify-center gap-3 mt-6">
                      <button 
                        onClick={() => setIsDownloadModalOpen(true)}
                        className="px-4 py-2.5 md:px-6 md:py-3 bg-black text-white rounded-full font-bold text-xs md:text-sm hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2 hover:scale-105 active:scale-95"
                      >
                        <span>Download PNG</span>
                      </button>
                      <button 
                        onClick={handleShareCard}
                        className="px-4 py-2.5 md:px-6 md:py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-full font-bold text-xs md:text-sm hover:bg-gray-100 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                      >
                        <Share2 size={14} className="md:w-4 md:h-4" /> Share Card
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="tip-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-2xl mx-auto px-4 md:px-0 relative"
                  >
                    <div className="text-center mb-10">
                      <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight pb-1">
                        {actionWord} {displayName}
                      </h3>
                      <p className="text-gray-500 text-sm md:text-base font-medium mt-1">
                        Choose an amount to show your appreciation
                      </p>
                    </div>
                    
                    <div className="mx-auto grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
                      {(profile.support_amounts || [500, 1000, 2500, 5000]).map((amount, index) => {
                        const TierIcon = [Coffee, Gift, Zap, Heart][index % 4];
                        const chip = [
                          'bg-orange-50 text-orange-500',
                          'bg-purple-50 text-purple-500',
                          'bg-amber-50 text-amber-500',
                          'bg-rose-50 text-rose-500',
                        ][index % 4];
                        const isSelected = selectedTier === amount;

                        return (
                          <motion.button
                            key={amount}
                            whileTap={{ scale: 0.99 }}
                            role="radio"
                            aria-checked={isSelected}
                            className={`relative flex h-full min-h-[132px] flex-col items-start rounded-2xl border p-5 text-left transition-colors ${
                              isSelected
                                ? 'border-gray-900 bg-white'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedTier(amount)}
                          >
                            <span
                              className={`absolute right-4 top-4 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition-colors ${
                                isSelected ? 'border-gray-900' : 'border-gray-200'
                              }`}
                            >
                              {isSelected && <span className="h-2 w-2 rounded-full bg-gray-900" />}
                            </span>

                            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${chip}`}>
                              <TierIcon size={16} />
                            </span>

                            <span className="mt-auto flex items-baseline pt-4 text-gray-900">
                              <span className="self-start pt-1 text-[13px] font-semibold text-gray-400">₦</span>
                              <span className="text-2xl font-bold tracking-tight">{amount.toLocaleString()}</span>
                            </span>
                          </motion.button>
                        );
                      })}
                      
                      {/* Custom Tier */}
                      <motion.button
                        whileTap={{ scale: 0.99 }}
                        role="radio"
                        aria-checked={selectedTier === 'custom'}
                        className={`relative flex h-full min-h-[132px] flex-col items-start rounded-2xl border p-5 text-left transition-colors ${
                          selectedTier === 'custom'
                            ? 'border-gray-900 bg-white'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedTier('custom')}
                      >
                        <span
                          className={`absolute right-4 top-4 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition-colors ${
                            selectedTier === 'custom' ? 'border-gray-900' : 'border-gray-200'
                          }`}
                        >
                          {selectedTier === 'custom' && <span className="h-2 w-2 rounded-full bg-gray-900" />}
                        </span>

                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                          <CreditCard size={16} />
                        </span>

                        <span className="mt-auto pt-4 text-2xl font-bold tracking-tight text-gray-900">Custom</span>
                      </motion.button>
                    </div>

                    {/* Custom Amount Input */}
                    <AnimatePresence>
                      {selectedTier === 'custom' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          className="mt-6"
                        >
                          <div className="mx-auto max-w-xl text-left">
                            <label htmlFor="custom-amount" className="mb-1.5 block text-[13px] font-bold text-gray-600">
                              Custom amount
                            </label>
                            <div className="relative flex items-center">
                              <span className="pointer-events-none absolute left-4 text-base font-bold text-gray-400">₦</span>
                              <input
                                id="custom-amount"
                                type="number"
                                inputMode="decimal"
                                min="1"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                placeholder="Enter custom amount"
                                className="w-full rounded-2xl border border-gray-200/80 bg-white/80 pl-9 pr-4 py-3.5 text-[15px] font-semibold text-gray-900 transition-all placeholder:text-gray-400 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 shadow-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                autoFocus
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Supporter Details & Message Inputs */}
                    <AnimatePresence>
                      {selectedTier && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -20 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -20 }}
                          className="mt-6"
                        >
                          <div className="mx-auto max-w-xl space-y-5 text-left">
                            {!currentUserId && (
                              <div>
                                <label htmlFor="supporter-name" className="mb-1.5 block text-[13px] font-bold text-gray-600">
                                  Name <span className="text-gray-400 font-medium">· optional</span>
                                </label>
                                <input
                                  id="supporter-name"
                                  type="text"
                                  value={supporterName}
                                  onChange={(e) => setSupporterName(e.target.value)}
                                  placeholder="Your name"
                                  autoComplete="name"
                                  className="w-full rounded-2xl border border-gray-200/80 bg-white/80 px-4 py-3.5 text-[15px] font-medium text-gray-900 transition-all placeholder:text-gray-400 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 shadow-sm"
                                />
                              </div>
                            )}

                            <div>
                              <label htmlFor="supporter-email" className="mb-1.5 block text-[13px] font-bold text-gray-600">
                                Email address
                              </label>
                              <input
                                id="supporter-email"
                                type="email"
                                value={supporterEmail}
                                onChange={(e) => {
                                  setSupporterEmail(e.target.value);
                                  if (paymentError) setPaymentError(null);
                                }}
                                placeholder="Where we'll send your receipt"
                                autoComplete="email"
                                className="w-full rounded-2xl border border-gray-200/80 bg-white/80 px-4 py-3.5 text-[15px] font-medium text-gray-900 transition-all placeholder:text-gray-400 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 shadow-sm"
                                required
                              />
                            </div>

                            <div>
                              <label htmlFor="supporter-message" className="mb-1.5 block text-[13px] font-bold text-gray-600">
                                Add a message <span className="text-gray-400 font-medium">· optional</span>
                              </label>
                              <div className="relative">
                                <textarea
                                  id="supporter-message"
                                  value={supportMessage}
                                  onChange={(e) => setSupportMessage(e.target.value)}
                                  placeholder="Say something nice — they'll see this with your support."
                                  rows={3}
                                  maxLength={SUPPORT_MESSAGE_LIMIT}
                                  className="w-full resize-none rounded-2xl border border-gray-200/80 bg-white/80 px-4 pb-10 pt-4 text-[15px] font-medium leading-relaxed text-gray-900 transition-all placeholder:text-gray-400 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 shadow-sm"
                                />
                                <span className="pointer-events-none absolute bottom-3 right-4 text-xs font-bold tabular-nums text-gray-400">
                                  {supportMessage.length}/{SUPPORT_MESSAGE_LIMIT}
                                </span>
                              </div>
                            </div>
                          </div>

                          {paymentError && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }} 
                              animate={{ opacity: 1, scale: 1 }} 
                              className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm font-semibold text-center flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {paymentError}
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Button */}
                    <div className="mt-8 flex flex-col items-center">
                      <button 
                        onClick={handleSupportNow}
                        className="w-full max-w-md py-4 rounded-full bg-black font-bold text-white text-[15px] sm:text-base hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 cursor-pointer shadow-md" 
                        disabled={!selectedTier || (selectedTier === 'custom' && !customAmount) || !supporterEmail || isRedirectingToGateway || paymentStatus === 'processing'}
                      >
                        {isRedirectingToGateway ? (
                          <>
                            <Loader2 className="animate-spin w-5 h-5" />
                            <span>Connecting to payment gateway...</span>
                          </>
                        ) : (
                          <span>{actionWord} with ₦{Number(selectedTier === 'custom' ? customAmount || 0 : selectedTier || 0).toLocaleString()}</span>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )
              )}
            </>
          )}
        </div>
      </div>


      {/* Edit Modal */}
      {profile && (
        <SupportEditModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onSave={(updated) => setProfile(updated)}
        />
      )}

      {/* Download Card Modal with Background Selection */}
      {profile && (
        <DownloadCardModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          profile={profile}
          displayName={displayName}
        />
      )}
    </div>
  );
}
