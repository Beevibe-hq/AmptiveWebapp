import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Key, Check, Share2, Lock } from 'lucide-react';
import { IoRadio, IoGift, IoTicket, IoHeadset } from 'react-icons/io5';
import type { IconType } from 'react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useSEO } from '@/hooks/useSEO';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { unlockPreviewAccess, isWaitlistModeActive } from '@/utils/waitlistMode';

type WaitlistRole = 'host' | 'monetize' | 'events' | 'listener';

interface WaitlistProps {
  isLockedMode?: boolean;
}

const WAITLIST_GOALS: {
  role: WaitlistRole;
  icon: IconType;
  title: string;
  description: string;
  tint: [number, number, number];
}[] = [
  {
    role: 'host',
    icon: IoRadio,
    title: 'Earn from live audio',
    description: 'Go live, bring co-hosts on stage, and grow a room that comes back.',
    tint: [244, 205, 210],
  },
  {
    role: 'monetize',
    icon: IoGift,
    title: 'Gifts and tip$',
    description: 'Set up a support link/card and get gifted directly by the people who follow you.',
    tint: [211, 221, 238],
  },
  {
    role: 'events',
    icon: IoTicket,
    title: 'Event ticketing',
    description: 'Launch, sell, and manage your physical event tickets with ease, then check guests in at the door.',
    tint: [223, 213, 240],
  },
  {
    role: 'listener',
    icon: IoHeadset,
    title: 'Listening and discovery',
    description: 'Join communities, attend unforgettable events, support creators, & earn rewards.',
    tint: [208, 233, 214],
  },
];

const TEXTURE_TILE_W = 88;
const TEXTURE_TILE_H = 176;

const cardTexture = ([r, g, b]: [number, number, number]) => {
  const puff = 'rgba(255, 255, 255, 0.62)';
  const tint = `rgba(${r}, ${g}, ${b}, 0.85)`;
  return {
    backgroundImage: [
      `radial-gradient(circle at 100% 50%, ${puff} 0%, rgba(255,255,255,0) 44%)`,
      `radial-gradient(circle at 0% 50%, ${puff} 0%, rgba(255,255,255,0) 44%)`,
      `linear-gradient(${tint}, ${tint})`,
    ].join(', '),
    backgroundSize: [
      `${TEXTURE_TILE_W}px ${TEXTURE_TILE_H}px`,
      `${TEXTURE_TILE_W}px ${TEXTURE_TILE_H}px`,
      '100% 100%',
    ].join(', '),
  };
};

const CARD_VEIL: React.CSSProperties = {
  background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 36%, rgba(255, 255, 255, 0.94) 78%, rgb(255, 255, 255) 100%)',
};

export default function Waitlist({ isLockedMode = false }: WaitlistProps) {
  useSEO({
    title: 'Join the Amptive Waitlist | Early Access',
    description: 'Be among the first to experience Amptive live audio shows, direct monetization, and creator gifting.',
    keywords: 'amptive waitlist, early access, live audio shows, creator monetization, ticketing',
  });

  const navigate = useNavigate();
  const [step, setStep] = useState<'type' | 'details' | 'success'>('type');
  const [userRole, setUserRole] = useState<WaitlistRole | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<WaitlistRole | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Team Access Modal State
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');

  const selectedGoal = WAITLIST_GOALS.find(goal => goal.role === userRole);

  const handleSelectRole = (role: WaitlistRole) => {
    setUserRole(role);
    setStep('details');
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const apiUseCaseMap: Record<WaitlistRole | 'other', string> = {
        'host': 'earn_from_live_audio',
        'monetize': 'gifts_and_tip',
        'events': 'event_ticketing',
        'listener': 'listening_and_discovery',
        'other': 'listening_and_discovery'
      };

      const response = await api.post('/waitlist/join', {
        email: email.trim(),
        full_name: 'Waitlist Member',
        use_case: apiUseCaseMap[userRole || 'other'] || 'listening_and_discovery'
      }, { skipAuth: true });
      
      setStep('success');

      if (response && response.created_at) {
        const createdDate = new Date(response.created_at);
        const now = new Date();
        const diffMs = now.getTime() - createdDate.getTime();
        if (diffMs > 60000) {
          toast.success("You're already on the waitlist! We'll notify you when early access opens.", { duration: 5000 });
          return;
        }
      }

      toast.success('Successfully joined the waitlist!');
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('already')) {
        toast.success("You're already on the waitlist! We'll notify you when early access opens.", { duration: 5000 });
        setStep('success');
      } else {
        toast.error(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://getamptive.com';
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success('Link copied! Share it with friends 🎉');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.success('Waitlist link: ' + url);
    }
  };

  const handleUnlockPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const success = unlockPreviewAccess(passcodeInput);
    if (success) {
      toast.success('Preview access granted! Unlocking web app...');
      setShowPasscodeModal(false);
      window.location.href = '/';
    } else {
      toast.error('Invalid passcode. Please try again.');
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FBFBFB] flex flex-col justify-between font-sans pt-12 sm:pt-16 md:pt-24">
      {/* Header Logo */}
      <div className="container mx-auto px-6 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/amptivelogo.svg"
            alt="Amptive Logo"
            className="h-7 sm:h-8 w-auto"
            style={{ filter: 'brightness(0)' }}
          />
        </div>

        {/* Sneak Peek / Team Access Button */}
        <button
          type="button"
          onClick={() => setShowPasscodeModal(true)}
          className="text-xs font-semibold text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100/80 cursor-pointer"
        >
          <Lock size={12} />
          <span>Team preview</span>
        </button>
      </div>

      {/* Main Form Body */}
      <main className="container relative z-10 mx-auto px-4 pt-6 sm:pt-10 pb-8 flex-1 flex items-start sm:items-center justify-center">
        <AnimatePresence mode="wait">
          {/* STEP 1: App Waitlist Goal Selection */}
          {step === 'type' && (
            <motion.div
              key="step-type"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl w-full mx-auto py-4 sm:py-6"
            >
              <div className="text-center mb-10">
                <span className="badge-sheen mb-4 inline-flex items-center rounded-full border px-3.5 py-1.5 text-[12px] font-semibold">
                  Early adopters get rewarded first
                </span>
                <h1 className="text-center text-[30px] md:text-[40px] font-extrabold text-gray-900 tracking-tight leading-tight mb-3">
                  How do you plan to use Amptive?
                </h1>
                <p className="text-center text-sm md:text-base text-gray-500 font-medium max-w-xl mx-auto">
                  Pick the one closest to what you're here for.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {WAITLIST_GOALS.map(goal => (
                  <button
                    key={goal.role}
                    type="button"
                    onClick={() => handleSelectRole(goal.role)}
                    onMouseEnter={() => setHoveredRole(goal.role)}
                    onMouseLeave={() => setHoveredRole(current => (current === goal.role ? null : current))}
                    onFocus={() => setHoveredRole(goal.role)}
                    onBlur={() => setHoveredRole(current => (current === goal.role ? null : current))}
                    className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-black/5 bg-white text-left transition-colors hover:border-black/20 focus:outline-none focus-visible:border-black cursor-pointer shadow-xs hover:shadow-md"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={cardTexture(goal.tint)}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
                      style={{ ...CARD_VEIL, opacity: hoveredRole === goal.role ? 0 : 1 }}
                    />
                    <span className="relative flex h-full flex-1 flex-col p-6">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 text-black">
                        <goal.icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-auto text-[17px] font-bold leading-snug text-black">
                        {goal.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-black">
                        {goal.description}
                      </p>
                    </span>
                  </button>
                ))}
              </div>

              {!isLockedMode && (
                <div className="mt-8 text-center px-4">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-xs font-medium text-gray-500 hover:text-black transition-colors underline underline-offset-4 cursor-pointer"
                  >
                    Return to Homepage
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: Details Form */}
          {step === 'details' && (
            <motion.div
              key="step-details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-sm sm:max-w-[400px] w-full mx-auto py-4 sm:py-6"
            >
              <div className="mb-6 text-center">
                <h1 className="text-[28px] font-bold text-gray-900">
                  Join the waitlist
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-gray-600 font-medium text-center leading-relaxed">
                  One list for all of Amptive. We'll email you the moment early access opens.
                </p>
              </div>

              <form onSubmit={handleSubmitDetails}>
                <label htmlFor="waitlist-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="waitlist-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 mb-3 block h-10 w-full rounded-[10px] border border-black/10 bg-transparent px-2.5 text-[15px] leading-[26px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-black"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="h-10 w-full rounded-full bg-black text-sm font-medium text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer shadow-sm"
                >
                  {loading ? 'Joining...' : 'Continue'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setStep('type')}
                  className="text-xs font-medium text-gray-500 hover:text-black transition-colors cursor-pointer"
                >
                  ← Back to options
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="max-w-sm w-full mx-auto py-4 px-2 text-center relative"
            >
              <div className="mb-6 flex items-center justify-center">
                <img
                  src="/amptivelogo.svg"
                  alt="Amptive Logo"
                  className="h-12 md:h-14 w-auto"
                  style={{ filter: 'brightness(0)' }}
                />
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight sm:whitespace-nowrap">
                Early Access Unlocked!
              </h1>

              <p className="text-sm font-medium text-gray-500 mt-2.5 max-w-sm mx-auto leading-relaxed">
                We'll email <span className="font-bold text-gray-900">{email}</span> the moment early access opens!
              </p>

              <div className="relative z-10 mt-8 space-y-3">
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full h-12 rounded-full bg-black text-white text-sm font-bold hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {copiedLink ? (
                    <>
                      <Check size={16} className="text-emerald-400" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={16} />
                      <span>Share with Friends</span>
                    </>
                  )}
                </button>

                {!isLockedMode && (
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Return to Homepage
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-6 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} Amptive Technologies. All rights reserved.</p>
      </footer>

      {/* Passcode Unlock Modal */}
      <AnimatePresence>
        {showPasscodeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasscodeModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl z-10 border border-gray-100"
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-3 text-black">
                  <Key size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Team Preview Access</h3>
                <p className="text-xs text-gray-500 mt-1">Enter your team passcode to unlock preview mode for this device.</p>
              </div>

              <form onSubmit={handleUnlockPasscode} className="space-y-4">
                <input
                  type="password"
                  placeholder="Enter passcode..."
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-center font-bold text-base outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasscodeModal(false)}
                    className="flex-1 py-3 rounded-full text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-full text-xs font-bold text-white bg-black hover:bg-gray-800 transition-colors cursor-pointer shadow-sm"
                  >
                    Unlock
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
