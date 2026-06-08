import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QrCode, Share2, MoreHorizontal, Youtube, Twitch, Heart, Check, Loader2, ArrowLeft, Star, Briefcase, Eye, Settings, CreditCard, Users, Coffee, Crown, Zap, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SupportCard from '@/components/SupportCard';
import Navbar from '@/components/Navbar';
import SupportEditModal from '@/components/SupportEditModal';
import { getCurrentUser } from '@/lib/api/auth';
import { getSupportProfile, getSupportProfileByUsername, getSupportPayments, SupportProfile as SupportProfileType } from '@/lib/api/support';
import { toPng, toBlob } from 'html-to-image';
import Confetti from 'react-confetti';
import { extractDominantColors } from '@/utils/colorExtractor';
import { playSwoosh, playSuccessChime } from '@/utils/audio';

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
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [shadowColor, setShadowColor] = useState<string | null>(null);


  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSupportNow = () => {
    setPaymentStatus('processing');
    playSwoosh();
    setTimeout(() => {
      setPaymentStatus('success');
      playSuccessChime();
    }, 2500);
  };

  const getCaptureElement = async () => {
    const originalElement = document.getElementById('support-card-target');
    if (!originalElement) return { element: null, cleanup: () => {} };

    // If already on desktop, just use the element directly
    if (window.innerWidth >= 768) {
      return { 
        element: originalElement, 
        cleanup: () => {} 
      };
    }

    // On mobile, we need to force desktop layout for the download.
    // We achieve this by placing a clone of the card inside a desktop-sized iframe.
    const iframe = document.createElement('iframe');
    iframe.style.width = '1024px';
    iframe.style.height = '1024px';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return { element: originalElement, cleanup: () => {} };
    }

    // Set base URL so relative paths (like mask-image: url('/amptivelogo.svg')) work
    const base = document.createElement('base');
    base.href = window.location.origin;
    iframeDoc.head.appendChild(base);

    // Copy stylesheets to the iframe so Tailwind classes work
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    styles.forEach(style => iframeDoc.head.appendChild(style.cloneNode(true)));
    
    // Copy body classes for global fonts
    iframeDoc.body.className = document.body.className;

    // Clone the target element
    const clonedElement = originalElement.cloneNode(true) as HTMLElement;
    iframeDoc.body.appendChild(clonedElement);

    // Give the iframe a tiny bit of time to apply CSS and load images
    await new Promise(resolve => setTimeout(resolve, 400));

    return { 
      element: clonedElement, 
      cleanup: () => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } 
    };
  };

  const handleDownloadCard = async () => {
    const { element, cleanup } = await getCaptureElement();
    if (!element) return;
    try {
      const dataUrl = await toPng(element, {
        pixelRatio: 6,
        backgroundColor: undefined,
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${profile?.username || 'support'}-card.png`;
      link.click();
    } catch (err) {
      console.error('Download card error:', err);
    } finally {
      cleanup();
    }
  };

  const handleShareCard = async () => {
    const { element, cleanup } = await getCaptureElement();
    if (!element) return;
    try {
      const blob = await toBlob(element, { pixelRatio: 2 });
      if (!blob) return;
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'support-card.png', { type: 'image/png' })] })) {
        const file = new File([blob], 'support-card.png', { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: `${profile?.full_name}'s Amptive Support Card`,
          text: `Check out my Amptive Support Profile: amptive.io/${profile?.username}`,
        });
      } else {
        await navigator.clipboard.writeText(`https://amptive.io/${profile?.username}`);
        alert('Profile link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share card error:', err);
    } finally {
      cleanup();
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
    const fetchActivity = async () => {
      if (!profile?.user_id) return;

      const { data, error } = await getSupportPayments(profile.user_id);
      if (!error && data) {
        setPayments(data);
        setSupporterCount(data.length);
      }
    };

    fetchActivity();
  }, [profile?.user_id]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user?.id || null);

        let profileData: SupportProfileType | null = null;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (isUuid) {
          profileData = await getSupportProfile(id);
        } else {
          profileData = await getSupportProfileByUsername(id);
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
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

  const queryParams = new URLSearchParams(window.location.search);
  const viewAs = queryParams.get('viewAs');
  const isOwner = currentUserId === profile.user_id && viewAs !== 'public';

  return (
    <div className={paymentStatus === 'success' ? "min-h-screen overflow-x-hidden font-sans selection:bg-blue-100 selection:text-blue-900 bg-transparent" : "min-h-screen overflow-x-hidden bg-white font-sans selection:bg-blue-100 selection:text-blue-900"}>
      {/* Top tint overlay */}
      {topTintStyle && (
        <div className="fixed top-0 left-0 right-0 h-80 md:h-96 lg:h-[28rem] z-0 pointer-events-none" style={topTintStyle}></div>
      )}
      
      {/* Blurred Avatar Background (Only on success page) */}
      {paymentStatus === 'success' && (
        <div
          className="fixed inset-0 -z-10"
          style={{
            backdropFilter: 'blur(140px)',
            backgroundImage: 'url("/mkimage/image/thumb/Features125/v4/d5/bb/ad/d5bbad45-cb3e-6334-ac5d-72442a0e822c/pr_source.png/800x800vb.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        ></div>
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
              <button onClick={handleShareProfile} className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all hover:text-green-600 shadow-sm"><Share2 size={20} /></button>
            </>
          ) : (
            <>
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
                <img 
                  src={profile.support_avatar_url || profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'} 
                  alt={profile.full_name || ''} 
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>

            <div className="mt-8 text-center space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                    {profile.full_name || 'Amptive Creator'}
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
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-black/5 rounded-full text-xs font-semibold text-gray-500 mt-2.5 shadow-sm">
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
                                            {payment.sender_name || 'A supporter'}
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
                                                {payment.sender_email || 'anonymous@supporter.com'}
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
                      name={profile.full_name || 'Standard'} 
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
                      className="px-4 py-2.5 md:px-6 md:py-3 bg-black text-white rounded-full font-bold text-xs md:text-sm hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2 hover:scale-105 active:scale-95"
                    >
                      Download PNG
                    </button>
                    <button 
                      onClick={handleShareCard}
                      className="px-4 py-2.5 md:px-6 md:py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-full font-bold text-xs md:text-sm hover:bg-gray-100 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                    >
                      <Share2 size={14} className="md:w-4 md:h-4" /> Share Card
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          ) : paymentStatus === 'processing' ? (
            <div className="max-w-4xl mx-auto px-4 md:px-0 flex flex-col items-center justify-center text-center space-y-6 py-24 min-h-[50vh]">
              <motion.img 
                src="/images/paper_plane.svg"
                className="w-40 h-40 md:w-56 md:h-56 drop-shadow-xl"
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
                    <img 
                      src={profile.support_avatar_url || profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'} 
                      alt={profile.full_name || ''} 
                      className="w-full h-full object-cover rounded-full shadow-xl shadow-black/10 border-4 border-white"
                    />
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
                  Thank you for supporting {profile.full_name || 'this creator'}. Your contribution of <strong className="text-gray-900">₦{Number(selectedTier === 'custom' ? customAmount : selectedTier).toLocaleString()}</strong> means a lot!
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
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-tight">Support {profile.full_name}</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(profile.support_amounts || [500, 1000, 2500, 5000]).map((amount, index) => {
                  const tierStyles = [
                    { icon: <Coffee size={28} className="text-amber-500" />, bg: 'bg-amber-50', ring: 'ring-amber-500' },
                    { icon: <Gift size={28} className="text-pink-500" />, bg: 'bg-pink-50', ring: 'ring-pink-500' },
                    { icon: <Zap size={28} className="text-purple-500" />, bg: 'bg-purple-50', ring: 'ring-purple-500' },
                    { icon: <Heart size={28} className="text-rose-500" />, bg: 'bg-rose-50', ring: 'ring-rose-500' },
                  ];
                  const style = tierStyles[index % tierStyles.length];

                  return (
                    <motion.button
                      key={amount}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative p-8 rounded-[32px] border-2 transition-all flex flex-col items-center justify-center h-full min-h-[200px] overflow-hidden group ${selectedTier === amount ? `border-transparent bg-white ring-2 ${style.ring}` : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'}`}
                      onClick={() => setSelectedTier(amount)}
                    >
                      <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-[0.25] transition-transform duration-500 group-hover:scale-150 ${style.bg}`} />
                      
                      <div className="relative z-10 flex flex-col items-center">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${style.bg} ${selectedTier === amount ? 'scale-110 transition-transform' : ''}`}>
                          {style.icon}
                        </div>
                        <h4 className="font-black text-gray-900 text-2xl md:text-3xl tracking-tight">₦{amount.toLocaleString()}</h4>
                      </div>
                      
                      {selectedTier === amount && (
                        <div className="absolute top-5 right-5 w-6 h-6 rounded-full bg-black flex items-center justify-center text-white z-20 shadow-sm">
                          <Check size={14} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
                
                {/* Custom Tier */}
                <motion.button
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-8 rounded-[32px] border-2 transition-all flex flex-col items-center justify-center h-full min-h-[200px] overflow-hidden group ${selectedTier === 'custom' ? 'border-transparent bg-white ring-2 ring-gray-900' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'}`}
                  onClick={() => setSelectedTier('custom')}
                >
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gray-100 opacity-50 transition-transform duration-500 group-hover:scale-150" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gray-100 ${selectedTier === 'custom' ? 'scale-110 transition-transform' : ''}`}>
                      <CreditCard size={28} className="text-gray-700" />
                    </div>
                    <h4 className="font-black text-gray-900 text-xl md:text-2xl tracking-tight">Custom</h4>
                  </div>
                  
                  {selectedTier === 'custom' && (
                    <div className="absolute top-5 right-5 w-6 h-6 rounded-full bg-black flex items-center justify-center text-white z-20 shadow-sm">
                      <Check size={14} />
                    </div>
                  )}
                </motion.button>
              </div>

              {/* Custom Amount Input */}
              <AnimatePresence>
                {selectedTier === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6"
                  >
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-900">₦</span>
                      <input 
                        type="number" 
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full pl-12 pr-6 py-6 rounded-[32px] border-2 border-black bg-white text-2xl font-black focus:outline-none shadow-sm"
                        autoFocus
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Optional Message Input */}
              <AnimatePresence>
                {selectedTier && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    className="mt-6"
                  >
                    <textarea
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Leave a message (optional)"
                      rows={3}
                      className="w-full px-6 py-4 rounded-3xl border-2 border-gray-100 bg-white text-gray-900 focus:border-black focus:ring-0 focus:outline-none transition-colors resize-none"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Button */}
              <div className="mt-12 flex flex-col items-center gap-4">
                <button 
                  onClick={handleSupportNow}
                  className="w-full max-w-md py-5 bg-black text-white rounded-full font-black text-xl hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
                  disabled={!selectedTier || (selectedTier === 'custom' && !customAmount) || paymentStatus === 'processing'}
                >
                  {paymentStatus === 'processing' ? <Loader2 className="animate-spin" /> : 'Support Now'}
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
