import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QrCode, Share2, MoreHorizontal, Youtube, Twitch, Heart, Check, ArrowLeft, Star, Briefcase, Eye, Settings, CreditCard, Users, Coffee, Crown, Zap, Gift, Loader2, Copy, Link } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import SupportCard from '@/components/SupportCard';
import Navbar from '@/components/Navbar';
import SupportEditModal from '@/components/SupportEditModal';
import { getCurrentUser } from '@/lib/api/auth';
import { getSupportProfile, getSupportProfileByUsername, getSupportProfileBySlug, mergeSupportProfileIdentity, paySupportCreator, getSupportHistory, SupportProfile as SupportProfileType } from '@/lib/api/support';
import { toPng, toBlob } from 'html-to-image';
import Confetti from 'react-confetti';
import { extractDominantColors } from '@/utils/colorExtractor';
import { playSwoosh, playSuccessChime } from '@/utils/audio';
import { AmptiveSplash } from '@/components/AmptiveSpinner';
import { useSEO } from '@/hooks/useSEO';

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
  const [activeTab, setActiveTab] = useState<'activity' | 'tip-card'>('activity');
  const [payments, setPayments] = useState<any[]>([]);

  const [selectedTier, setSelectedTier] = useState<number | 'custom' | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [supportMessage, setSupportMessage] = useState<string>('');
  const [supporterName, setSupporterName] = useState<string>('');
  const [supporterEmail, setSupporterEmail] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentChannel, setPaymentChannel] = useState<string>('paystack');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [shadowColor, setShadowColor] = useState<string | null>(null);
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [windowSize, setWindowSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1200, 
    height: typeof window !== 'undefined' ? window.innerHeight : 800 
  });

  const queryParams = new URLSearchParams(window.location.search);
  const viewAs = queryParams.get('viewAs');
  const isOwner = Boolean(currentUserId && profile?.user_id && currentUserId === profile.user_id && viewAs !== 'public');

  const handleCopySupportLink = async () => {
    const linkSlug = profile?.support_slug || profile?.username || profile?.user_id || id;
    const link = `https://getamptive.com/${linkSlug}`;
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

    const primaryUsername = profile?.username || (profile as any)?.user?.username;
    const fallbackUsername = profile?.support_slug || id;

    const targets = Array.from(new Set([primaryUsername, fallbackUsername].filter(Boolean) as string[]));

    if (targets.length === 0) {
      setPaymentError('Unable to resolve creator username.');
      return;
    }

    setPaymentStatus('processing');
    playSwoosh();

    const channelsToTry = Array.from(new Set([paymentChannel, 'paystack', 'flutterwave']));

    try {
      let lastError = 'Payment initialization failed. Please try again.';

      for (const target of targets) {
        for (const channel of channelsToTry) {
          const result = await paySupportCreator(target, {
            amount: amountNum,
            message: supportMessage.trim() || undefined,
            payment_channel: channel,
            email: trimmedEmail,
            // Signed-in supporters are identified by their token, so this is only sent
            // for anonymous ones.
            supporter_name: currentUserId ? undefined : supporterName.trim() || undefined,
          });

          if (result.ok && result.data) {
            if (result.data.payment_url) {
              window.location.href = result.data.payment_url;
              return;
            }
            setPaymentStatus('success');
            playSuccessChime();
            return;
          }

          lastError = result.error || lastError;
          // If the error is 404 (user not found), stop channel iterations for this target and try next target
          if (lastError.toLowerCase().includes('not found')) {
            break;
          }
        }
      }

      setPaymentStatus('idle');
      setPaymentError(lastError);
    } catch (err: any) {
      setPaymentStatus('idle');
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
          text: `Check out my Amptive Support Profile: getamptive.com/${profile?.username}`,
        });
      } else {
        await navigator.clipboard.writeText(`https://getamptive.com/${profile?.username}`);
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

  useEffect(() => {
    /*
     * Support history is private to the creator: the endpoint reports payments received
     * by whoever is authenticated, and takes no "whose profile" parameter. So it is only
     * ever correct to call it on your own page — asking for it while viewing someone
     * else's would render the viewer's own payments as if they were the creator's.
     */
    const fetchActivity = async () => {
      if (!profile?.user_id || !isOwner) {
        setPayments([]);
        setSupporterCount(0);
        return;
      }

      const historyRes = await getSupportHistory({
        date_filter: timeRange === '7' ? 'last_7_days' : timeRange === '30' ? 'last_30_days' : timeRange === '90' ? 'last_90_days' : 'all_time',
        page: 1,
        page_size: 50,
      });

      if (historyRes.ok) {
        setPayments(historyRes.items);
        setSupporterCount(historyRes.total || historyRes.items.length);
      }
    };

    fetchActivity();
  }, [profile?.user_id, isOwner, timeRange]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user?.user_id || user?.id || null);
        if (user?.email) {
          setSupporterEmail(user.email);
        }

        // The canonical lookup is the backend's support slug; fall back to the older
        // user-id / username lookups for legacy links.
        let profileData: SupportProfileType | null = await getSupportProfileBySlug(id);
        if (!profileData) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          profileData = isUuid
            ? await getSupportProfile(id)
            : await getSupportProfileByUsername(id);
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

  if (loading) {
    return (
      <AmptiveSplash />
    );
  }

  if (!profile) {
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

  const displayName = profile.full_name || profile.name || profile.username || 'Amptive Creator';
  const profileAvatarUrl = profile.support_avatar_url || profile.avatar_url;
  const avatarInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

  return (
    <div className={paymentStatus === 'success' ? "min-h-screen overflow-x-hidden font-sans selection:bg-blue-100 selection:text-blue-900 bg-transparent" : "min-h-screen overflow-x-hidden bg-white font-sans selection:bg-blue-100 selection:text-blue-900"}>
      {/* Top tint overlay */}
      {topTintStyle && (
        <div className="fixed top-0 left-0 right-0 h-80 md:h-96 lg:h-[28rem] z-0 pointer-events-none" style={topTintStyle}></div>
      )}
      
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
            onClick={() => navigate(`/support/${(profile.support_slug as string) || profile.username || profile.user_id}`)}
            className="px-4 py-1.5 bg-white text-indigo-600 rounded-full text-xs font-black hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
          >
            Exit Preview
          </button>
        </div>
      )}
      {!(viewAs === 'public' && currentUserId === profile.user_id) && (
        <Navbar hideMenu={true} />
      )}
      
      {/* Banner Section */}
      {paymentStatus === 'idle' && (
        <div className="relative w-full h-[280px] md:h-[350px] overflow-hidden bg-blue-600">
        <div className="absolute inset-0 z-0">
          {profile.support_banner_url ? (
            <img 
              src={profile.support_banner_url} 
              alt="Support Banner" 
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src="/images/support_cover.svg" 
              alt="Support Cover Pattern" 
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-transparent pointer-events-none" />
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
                onClick={() => navigate(`/support/${(profile.support_slug as string) || profile.username || profile.user_id}?viewAs=public`)}
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
                className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all hover:text-emerald-600 shadow-sm group relative"
                title="Copy link"
              >
                {copiedLink ? <Check size={20} className="text-emerald-600" /> : <Copy size={20} />}
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {copiedLink ? 'Copied!' : 'Copy'}
                </span>
              </button>
              <button onClick={handleShareProfile} className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all hover:text-green-600 shadow-sm"><Share2 size={20} /></button>
            </>
          ) : (
            <>
              <button 
                onClick={handleCopySupportLink} 
                className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all hover:text-emerald-600 shadow-sm group relative"
                title="Copy link"
              >
                {copiedLink ? <Check size={20} className="text-emerald-600" /> : <Copy size={20} />}
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {copiedLink ? 'Copied!' : 'Copy'}
                </span>
              </button>
              <button onClick={handleShareProfile} className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shadow-sm"><Share2 size={20} /></button>
              <button className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shadow-sm"><MoreHorizontal size={20} /></button>
            </>
          )}
        </div>

        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center">
            <div className="relative">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-40 h-40 md:w-48 md:h-48 rounded-[40px] border-[6px] border-white overflow-hidden bg-white"
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
                    <span className="text-gray-400 font-normal">getamptive.com/</span>
                    <span className="font-bold text-gray-900">{profile.support_slug || profile.username || 'creator'}</span>
                    <span className="w-px h-3 bg-gray-200 mx-0.5" />
                    {copiedLink ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <Check size={13} className="text-emerald-600" /> Copied!
                      </span>
                    ) : (
                      <span className="flex items-center text-gray-400 group-hover:text-black transition-colors">
                        <Copy size={13} />
                      </span>
                    )}
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

      {/* Dynamic Content Based on Role */}
        <div className="mt-12">
          {isOwner ? (
            <>
              {/* Tabs Section (Owner Only) */}
              <div className="mb-12 border-b border-gray-100 flex justify-center gap-12">
                <button 
                  onClick={() => setActiveTab('activity')} 
                  className={`pb-4 border-b-2 font-bold transition-all ${activeTab === 'activity' ? 'border-black text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Activity
                </button>
                <button 
                  onClick={() => setActiveTab('tip-card')} 
                  className={`pb-4 border-b-2 font-bold transition-all ${activeTab === 'tip-card' ? 'border-black text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Tip card
                </button>
              </div>

              {activeTab === 'activity' ? (
                <div className="max-w-4xl mx-auto space-y-8 px-4 md:px-0">
                  {/* Earnings Overview */}
                  {isOwner && (
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
                  )}

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
                                            {payment.supporter_name || payment.sender_name || 'A supporter'}
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
                <motion.div 
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
                      onClick={handleDownloadCard}
                      disabled={isDownloadingCard}
                      className="px-4 py-2.5 md:px-6 md:py-3 bg-black text-white rounded-full font-bold text-xs md:text-sm hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isDownloadingCard ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating PNG...</span>
                        </>
                      ) : (
                        <span>Download PNG</span>
                      )}
                    </button>
                    <button 
                      onClick={handleShareCard}
                      className="px-4 py-2.5 md:px-6 md:py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-full font-bold text-xs md:text-sm hover:bg-gray-100 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                    >
                      <Share2 size={14} className="md:w-4 md:h-4" /> Share Card
                    </button>
                    <button 
                      onClick={handleCopySupportLink}
                      className="px-4 py-2.5 md:px-6 md:py-3 bg-white border border-gray-200 text-gray-900 rounded-full font-bold text-xs md:text-sm hover:bg-gray-50 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 shadow-sm"
                    >
                      {copiedLink ? (
                        <>
                          <Check size={14} className="md:w-4 md:h-4 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="md:w-4 md:h-4 text-gray-600" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          ) : paymentStatus === 'processing' ? (
            <div className="max-w-4xl mx-auto px-4 md:px-0 flex flex-col items-center justify-center text-center space-y-6 py-24 min-h-[50vh]">
              <motion.img 
                src="/images/paper_plane.png"
                alt="Sending support illustration"
                className="w-40 h-40 md:w-56 md:h-56 drop-shadow-2xl object-contain"
                initial={{ x: -1000, y: 1000, opacity: 0, rotate: -15 }}
                animate={{ 
                  x: [ -1000, 0, 0, 0, 1000 ], 
                  y: [ 1000, 0, -20, 20, -1000 ], 
                  opacity: [ 0, 1, 1, 1, 0 ], 
                  rotate: [ -15, 0, -5, 5, 25 ],
                  scale: [ 0.8, 1, 1.05, 0.95, 0.5 ]
                }}
                transition={{ 
                  duration: 2.5, 
                  times: [0, 0.2, 0.5, 0.8, 1],
                  ease: "easeInOut" 
                }}
              />
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
                transition={{ duration: 2.5, times: [0, 0.2, 0.8, 1] }}
                className="text-2xl font-black text-gray-900 drop-shadow-sm"
              >
                Sending your support...
              </motion.h3>
            </div>
          ) : paymentStatus === 'success' ? (
            <div className="max-w-4xl mx-auto px-4 md:px-0 flex flex-col items-center justify-center text-center space-y-6 py-12">
              <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />
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
                <h1 className="text-3xl font-bold text-gray-900 mt-2 mb-4">Support Successful!</h1>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Thank you for supporting {displayName}. Your contribution of <strong className="text-gray-900">₦{Number(selectedTier === 'custom' ? customAmount : selectedTier).toLocaleString()}</strong> means a lot!
                </p>
                <button
                  onClick={() => setPaymentStatus('idle')}
                  className="px-8 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                  Support Again
                </button>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-4 md:px-0">
              <div className="text-center mb-12">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-tight">Support {displayName}</h3>
              </div>
              
              {/*
                Pitched to match the fields further down: hairline borders, 16px radius and
                a single grey for every chip. Four pastel colours and black type at 30px
                made this step shout over the form it leads into, and the decorative blob
                behind each card was noise the page didn't need.
              */}
              <div className="mx-auto grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
                {(profile.support_amounts || [500, 1000, 2500, 5000]).map((amount, index) => {
                  const TierIcon = [Coffee, Gift, Zap, Heart][index % 4];
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
                      {/* Always present, filled when chosen — an empty ring is what tells
                          people these are a pick-one set before they touch anything. */}
                      <span
                        className={`absolute right-4 top-4 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected ? 'border-gray-900' : 'border-gray-200'
                        }`}
                      >
                        {isSelected && <span className="h-2 w-2 rounded-full bg-gray-900" />}
                      </span>

                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                        <TierIcon size={16} />
                      </span>

                      {/* Currency set small and raised so the number carries the weight. */}
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

                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                    <CreditCard size={16} />
                  </span>

                  <span className="mt-auto pt-4 text-2xl font-bold tracking-tight text-gray-900">Custom</span>
                </motion.button>
              </div>

              {/* Custom Amount Input */}
              <AnimatePresence>
                {selectedTier === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-8"
                  >
                    {/*
                      Typed straight onto the card rather than into a bordered box: the
                      amount is the biggest decision on this page, and a box around it
                      made it read as just another field. Aligned with the detail fields
                      below so the whole step sits on one edge.
                    */}
                    <div className="mx-auto max-w-xl text-left">
                      <label htmlFor="custom-amount" className="mb-2 block text-[13px] font-medium text-gray-500">
                        Enter amount
                      </label>
                      <div className="flex items-baseline gap-1.5 border-b border-gray-200 pb-2 focus-within:border-gray-900 transition-colors">
                        <span className="text-4xl font-semibold text-gray-900 sm:text-5xl">₦</span>
                        <input
                          id="custom-amount"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder="0.00"
                          // Already far above 16px, so it can't trigger the iOS focus
                          // zoom the global rule guards against.
                          data-keep-font-size
                          // Spinners would sit oddly against type this large.
                          className="w-full border-0 bg-transparent p-0 text-4xl font-semibold text-gray-900 caret-gray-900 outline-none placeholder:text-gray-300 focus:outline-none focus:ring-0 sm:text-5xl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                    className="mt-8"
                  >
                    {/*
                      Quiet by design: hairline borders, small muted labels and plenty of
                      space, so the fields recede and the amount above them stays the
                      loudest thing on the card. Heavier borders and bold labels made this
                      step compete with the tiers instead of following them.
                    */}
                    <div className="mx-auto max-w-xl space-y-6 text-left">
                      {/* Only signed-out supporters need to type a name — for signed-in
                          ones the backend takes it from their account. */}
                      {!currentUserId && (
                        <div>
                          <label htmlFor="supporter-name" className="mb-2 block text-[13px] font-medium text-gray-500">
                            Your name <span className="text-gray-300">· optional</span>
                          </label>
                          <input
                            id="supporter-name"
                            type="text"
                            value={supporterName}
                            onChange={(e) => setSupporterName(e.target.value)}
                            placeholder="So they know who to thank"
                            autoComplete="name"
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 transition-colors placeholder:text-gray-300 focus:border-gray-900 focus:outline-none focus:ring-0"
                          />
                        </div>
                      )}

                      <div>
                        <label htmlFor="supporter-email" className="mb-2 block text-[13px] font-medium text-gray-500">
                          Email
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
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 transition-colors placeholder:text-gray-300 focus:border-gray-900 focus:outline-none focus:ring-0"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="supporter-message" className="mb-2 block text-[13px] font-medium text-gray-500">
                          Add a message <span className="text-gray-300">· optional</span>
                        </label>
                        <div className="relative">
                          <textarea
                            id="supporter-message"
                            value={supportMessage}
                            onChange={(e) => setSupportMessage(e.target.value)}
                            placeholder="Say something nice — they'll see this with your support."
                            rows={3}
                            maxLength={SUPPORT_MESSAGE_LIMIT}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 pb-9 pt-3 text-[15px] leading-relaxed text-gray-900 transition-colors placeholder:text-gray-300 focus:border-gray-900 focus:outline-none focus:ring-0"
                          />
                          {/* Sits inside the field, out of the way of the typing line. */}
                          <span className="pointer-events-none absolute bottom-3 right-4 text-xs tabular-nums text-gray-400">
                            {supportMessage.length}/{SUPPORT_MESSAGE_LIMIT}
                          </span>
                        </div>
                      </div>
                    </div>

                    {paymentError && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold text-center"
                      >
                        {paymentError}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Button */}
              <div className="mt-12 flex flex-col items-center gap-4">
                <button 
                  onClick={handleSupportNow}
                  className="w-full max-w-md py-5 bg-black text-white rounded-full font-black text-xl hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
                  disabled={!selectedTier || (selectedTier === 'custom' && !customAmount) || !supporterEmail || paymentStatus === 'processing'}
                >
                  {paymentStatus === 'processing' ? (
                    <>
                      <Loader2 className="animate-spin w-6 h-6" />
                      <span>Initiating Payment...</span>
                    </>
                  ) : (
                    'Support Now'
                  )}
                </button>
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center"><Check size={10} className="text-green-500" /></span>
                  Fast & Secure Payments with Flutterwave
                </p>
              </div>
            </div>
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
    </div>
  );
}
