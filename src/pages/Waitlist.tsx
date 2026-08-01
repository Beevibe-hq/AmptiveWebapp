import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
// Filled glyphs for the goal cards — lucide is stroke-only, and thin outlines read as
// wispy inside the icon chip.
import { IoRadio, IoGift, IoTicket, IoHeadset } from 'react-icons/io5';
import type { IconType } from 'react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useSEO } from '@/hooks/useSEO';
import toast from 'react-hot-toast';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';

type WaitlistRole = 'host' | 'monetize' | 'events' | 'listener';

/**
 * The four things someone can be here for. Kept as data rather than four near-identical
 * blocks of markup, which is how the copy and the styling drifted apart in the first place.
 */
const WAITLIST_GOALS: {
  role: WaitlistRole;
  icon: IconType;
  title: string;
  description: string;
  /** Pastel wash behind the card's texture. */
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
    description: 'Join communities, attend life-changing events, support your favorite creators, & earn rewards.',
    tint: [208, 233, 214],
  },
];

/** One tile of the scale pattern. Height is twice the width so the shapes interlock. */
const TEXTURE_TILE_W = 88;
const TEXTURE_TILE_H = 176;

/**
 * The soft scalloped wash behind each card: a pastel base under an interlocking arc
 * pattern, covering the whole card.
 *
 * The shapes come from two radial gradients anchored to opposite edges of a tile that is
 * twice as tall as it is wide — that is what makes them mesh seamlessly. Anchoring
 * highlights inside the tile instead leaves a bright edge on every tile row, which reads
 * as horizontal banding rather than scallops.
 *
 * They are filled and soft-edged rather than rings: a hard stop makes the pattern read as
 * a chain of outlined circles instead of quilted padding.
 *
 * Built from gradients rather than an image so it stays sharp at any card size, retints
 * from one rgb triple, and costs nothing to download.
 */
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

/**
 * A white veil over the lower half, so the copy normally sits on clean paper. Hovering
 * fades it away and lets the colour flood the whole card.
 *
 * It has to be its own layer rather than a stop inside the texture above: gradients are
 * not interpolable, so a transition between two background-images would snap. Opacity on
 * a separate element animates properly.
 */
const CARD_VEIL: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to bottom, rgba(255,255,255,0) 34%, rgba(255,255,255,0.92) 68%, rgb(255,255,255) 100%)',
};


export default function Waitlist() {
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
  /** Which goal card the pointer or keyboard is currently on, so its colour floods. */
  const [hoveredRole, setHoveredRole] = useState<WaitlistRole | null>(null);

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
      // Simulate API submission
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStep('success');
      toast.success('Successfully joined the waitlist!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FBFBFB] flex flex-col justify-between font-sans pt-20 sm:pt-24 md:pt-32">
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
                    // Driven from state rather than a `group-hover:` class so the veil's
                    // opacity is one explicit value, and keyboard focus reveals the colour
                    // the same way a pointer does.
                    onMouseEnter={() => setHoveredRole(goal.role)}
                    onMouseLeave={() => setHoveredRole(current => (current === goal.role ? null : current))}
                    onFocus={() => setHoveredRole(goal.role)}
                    onBlur={() => setHoveredRole(current => (current === goal.role ? null : current))}
                    className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-black/5 bg-white text-left transition-colors hover:border-black/20 focus:outline-none focus-visible:border-black"
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
                      {/* Pushed to the bottom, where the texture has faded out to white. */}
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

              <div className="mt-8 text-center px-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-xs font-medium text-gray-500 hover:text-black transition-colors underline underline-offset-4"
                >
                  Return to Homepage
                </button>
              </div>
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

              {/* Field and button metrics mirror SignupForm, so the two flows feel like
                  one product rather than two. */}
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
                  className="h-10 w-full rounded-full bg-black text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Joining...' : 'Continue'}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 3: Success Confirmation matching reference screenshot 1:1 */}
          {step === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="max-w-sm w-full mx-auto py-4 px-2 text-center relative"
            >
                {/* Clean Static Amptive Logo */}
                <div className="mb-6 flex items-center justify-center">
                  <img
                    src="/amptivelogo.svg"
                    alt="Amptive Logo"
                    className="h-12 md:h-14 w-auto"
                    style={{
                      filter: 'brightness(0)'
                    }}
                  />
                </div>

                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight sm:whitespace-nowrap">
                  Early Access Unlocked!
                </h1>

                {/* Subtitle */}
                <p className="text-sm font-medium text-gray-500 mt-2.5 max-w-sm mx-auto leading-relaxed">
                  We'll email <span className="font-bold text-gray-900">{email}</span> the moment early access opens!
                </p>

              {/* Action Button */}
              <div className="relative z-10 mt-8">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full h-12 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors shadow-md flex items-center justify-center cursor-pointer"
                >
                  Go to Home
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
