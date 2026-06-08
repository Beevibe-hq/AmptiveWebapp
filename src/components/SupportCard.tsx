import React, { useState } from 'react';
import { QrCode, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

interface SupportCardProps {
  name?: string;
  username?: string;
  avatarUrl?: string;
  message?: string;
  isDisplayOnly?: boolean;
  is3DAnim?: boolean;
  variant?: number;
  onVariantChange?: (variant: number) => void;
  profileType?: 'creator' | 'business' | 'organizer' | null;
}

const getRgba = (hex: string, alpha: number) => {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const SupportCard: React.FC<SupportCardProps> = ({
  name = "Achilonu Joseph",
  username = "jachilonu2",
  avatarUrl = "https://gjkvrllwtjktcarnikus.supabase.co/storage/v1/object/public/avatars/avatars/5f395bf7-ca2d-44a4-8203-519e9a933d3d-0.7536191962551382.jpg",
  message = "Create. Share. Grow. Support. Repeat.",
  isDisplayOnly = false,
  is3DAnim = false,
  variant = 0,
  profileType,
  onVariantChange,
}) => {
  const [activeCard, setActiveCard] = useState(variant !== undefined ? variant : 0);
  const [direction, setDirection] = useState(0);

  // Sync internal state if prop changes
  React.useEffect(() => {
    if (variant !== undefined && variant !== activeCard) {
      setDirection(variant > activeCard ? 1 : -1);
      setActiveCard(variant);
    }
  }, [variant]);

  const cardStyles = [
    {
      id: 0,
      bg: "#E2F4E9", // Soft Green
      accent: "#064E3B", // Dark Teal
      badge: "#FFFFFF",
      highlight: "#34D399", // Mint Green
      variant: "mindful"
    },
    {
      id: 1,
      bg: "#EEF2FF", // Soft Indigo
      accent: "#312E81", // Deep Indigo
      badge: "#FFFFFF",
      highlight: "#818CF8", // Indigo highlight
      variant: "business"
    },
    {
      id: 2,
      bg: "#fcdf4e", // Specific Yellow
      accent: "#35353d", // Deep Charcoal
      variant: "bold"
    },
    {
      id: 3,
      bg: "#EA5489", // Vibrant Pink
      accent: "#FFFFFF", // White
      variant: "bold-pink"
    },
    {
      id: 4,
      bg: "#0990BE", // Solid Teal Blue
      accent: "#FFFFFF", // White
      variant: "bold-puzzle"
    },
    {
      id: 5,
      bg: "#1D1561", // Midnight Violet
      accent: "#FFFFFF", // White
      highlight: "#A78BFA", // Electric Violet
      variant: "bold-cosmic"
    }
  ];

  const current = cardStyles[activeCard];

  const nextCard = () => {
    setDirection(1);
    const next = (activeCard + 1) % cardStyles.length;
    setActiveCard(next);
    onVariantChange?.(next);
  };
  const prevCard = () => {
    setDirection(-1);
    const prev = (activeCard - 1 + cardStyles.length) % cardStyles.length;
    setActiveCard(prev);
    onVariantChange?.(prev);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction === 0 ? 0 : direction > 0 ? 100 : -100,
      opacity: direction === 0 ? 1 : 0,
      scale: direction === 0 ? 1 : 0.9
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.9
    })
  };

  const qrPopOutStyle = is3DAnim
    ? { transformStyle: "preserve-3d" as const }
    : undefined;
  const qrPopOutInitial = is3DAnim
    ? { opacity: 1, y: 0, scale: 1, z: 0, filter: "drop-shadow(0px 0px 0px rgba(15, 23, 42, 0)) drop-shadow(0px 0px 0px rgba(15, 23, 42, 0))" }
    : false;
  const qrPopOutAnimate = is3DAnim
    ? { opacity: 1, y: 0, scale: 1.04, z: 90, filter: "drop-shadow(0px 22px 24px rgba(15, 23, 42, 0.14)) drop-shadow(0px 6px 10px rgba(15, 23, 42, 0.08))" }
    : undefined;
  const qrPopOutTransition = is3DAnim
    ? { duration: 0.7, delay: 0.72, ease: [0.22, 1, 0.36, 1] as const }
    : undefined;

  return (
    <div className={`relative max-w-xl mx-auto ${isDisplayOnly ? 'px-0' : 'px-6 md:px-12'}`}>
      {/* SVG Gooey Filter Definitions */}
      <svg className="absolute w-0 h-0" width="0" height="0" aria-hidden="true" style={{ pointerEvents: 'none', position: 'absolute' }}>
        <defs>
          <filter id="gooey-merge">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" />
          </filter>
        </defs>
      </svg>
      {/* Navigation Arrows */}
      {!isDisplayOnly && (
        <>
          <button 
            type="button"
            onClick={prevCard}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-sm hover:bg-gray-50 transition-colors z-20"
          >
            <ChevronLeft className="text-gray-400" />
          </button>

          <button 
            type="button"
            onClick={nextCard}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-sm hover:bg-gray-50 transition-colors z-20"
          >
            <ChevronRight className="text-gray-400" />
          </button>
        </>
      )}

      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.div
          key={activeCard}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={(_, { offset, velocity }) => {
            const swipe = offset.x;
            const swipeThreshold = 50;
            if (swipe < -swipeThreshold || velocity.x < -500) {
              nextCard();
            } else if (swipe > swipeThreshold || velocity.x > 500) {
              prevCard();
            }
          }}
          className="max-w-[300px] md:max-w-[352px] mx-auto transform cursor-grab active:cursor-grabbing origin-center scale-[0.8] md:scale-100"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Card Body */}
          <div 
            className={`rounded-2xl md:rounded-[40px] relative transition-all duration-500 shadow-none ${is3DAnim ? '' : 'md:shadow-xl'} p-0 ${!is3DAnim ? 'overflow-hidden' : 'support-card-demo-3d'}`}
            style={{ transformStyle: is3DAnim ? "preserve-3d" : undefined }}
          >
            {/* Base Background Layer */}
            <div 
               className="absolute inset-0 rounded-2xl md:rounded-[40px] overflow-hidden pointer-events-none -z-10"
               style={{ backgroundColor: current.bg }}
            />


            {/* Background Patterns for Mindful (Organic Waves) */}
            {current.variant === 'mindful' && (
              <div className="absolute inset-0 rounded-2xl md:rounded-[40px] pointer-events-none overflow-hidden bg-gradient-to-br from-[#E2F4E9] to-[#BEF2644D] -z-10">
                <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/p6-dark.png")' }} />
                {/* Organic Waves - undulating slowly */}
                <motion.svg 
                  className="absolute inset-0 w-full h-full opacity-40" 
                  viewBox="0 0 400 600" 
                  xmlns="http://www.w3.org/2000/svg"
                  animate={{
                    y: [-15, 15]
                  }}
                  transition={{
                    duration: 8,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <path d="M-50 150 Q100 50 250 150 T550 150" fill="none" stroke="white" strokeWidth="60" strokeLinecap="round" />
                  <path d="M-50 450 Q150 350 350 450 T750 450" fill="none" stroke="white" strokeWidth="80" strokeLinecap="round" />
                </motion.svg>
                {/* Soft, luxurious glowing fluid orbs - floating softly */}
                <motion.div 
                  className="absolute -top-20 -left-20 w-80 h-80 bg-white/40 rounded-full blur-[80px]" 
                  animate={{
                    x: [-20, 20],
                    y: [-15, 15],
                    scale: [1, 1.15, 1]
                  }}
                  transition={{
                    duration: 10,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
                <motion.div 
                  className="absolute top-40 -right-20 w-80 h-80 rounded-full blur-[80px] opacity-20 bg-[#34D399]" 
                  animate={{
                    x: [20, -20],
                    y: [15, -15],
                    scale: [1, 1.12, 1]
                  }}
                  transition={{
                    duration: 12,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
              </div>
            )}

            {/* Background Patterns for Business (Sleek Geometric/Glassmorphism) */}
            {current.variant === 'business' && (
              <div className="absolute inset-0 rounded-2xl md:rounded-[40px] pointer-events-none overflow-hidden bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] -z-10">
                {/* Organic SVG Squiggles - Static */}
                <svg 
                  className="absolute inset-0 w-full h-full opacity-[0.15] origin-center scale-[1.8] rotate-[-6deg] translate-y-[60px] md:translate-y-[90px]" 
                  viewBox="0 0 400 600" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* --- Line 1: Vertical squiggle (from top toward avatar) --- */}
                  <path d="M185 -50 Q260 100 185 230" fill="none" stroke="#312E81" strokeWidth="1.6" strokeLinecap="round" opacity="0.15" />
                  <motion.path 
                    d="M185 -50 Q260 100 185 230" 
                    fill="none" 
                    stroke="#312E81" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ 
                      opacity: [0, 0.7, 0.7, 0],
                      pathLength: [0, 0.6, 1, 1]
                    }}
                    transition={{ 
                      repeat: Infinity,
                      repeatDelay: 4.0,
                      delay: 0,
                      duration: 2.0,
                      times: [0, 0.3, 0.7, 1],
                      ease: "easeInOut"
                    }}
                  />

                  {/* --- Line 2: Top horizontal squiggle (from left toward center) --- */}
                  <path d="M-50 200 Q100 100 250 200 T550 200" fill="none" stroke="#312E81" strokeWidth="2.2" strokeLinecap="round" opacity="0.15" />
                  <motion.path 
                    d="M-50 200 Q100 100 250 200 T550 200" 
                    fill="none" 
                    stroke="#312E81" 
                    strokeWidth="3.0" 
                    strokeLinecap="round"
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ 
                      opacity: [0, 0.7, 0.7, 0],
                      pathLength: [0, 0.6, 1, 1]
                    }}
                    transition={{ 
                      repeat: Infinity,
                      repeatDelay: 4.0,
                      delay: 2.0,
                      duration: 2.0,
                      times: [0, 0.3, 0.7, 1],
                      ease: "easeInOut"
                    }}
                  />

                  {/* --- Line 3: Bottom horizontal squiggle (from right toward center) --- */}
                  <path d="M750 400 Q550 300 350 400 Q150 500 -50 400" fill="none" stroke="#312E81" strokeWidth="1.6" strokeLinecap="round" opacity="0.15" />
                  <motion.path 
                    d="M750 400 Q550 300 350 400 Q150 500 -50 400" 
                    fill="none" 
                    stroke="#312E81" 
                    strokeWidth="2.2" 
                    strokeLinecap="round"
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ 
                      opacity: [0, 0.6, 0.6, 0],
                      pathLength: [0, 0.6, 1, 1]
                    }}
                    transition={{ 
                      repeat: Infinity,
                      repeatDelay: 4.0,
                      delay: 4.0,
                      duration: 2.0,
                      times: [0, 0.3, 0.7, 1],
                      ease: "easeInOut"
                    }}
                  />
                </svg>
 
                {/* Soft, luxurious glowing fluid orbs - Static */}
                <div className="absolute inset-0 w-full h-full origin-center rotate-[8deg]">
                  <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/40 rounded-full blur-[80px]" />
                  <div className="absolute top-40 -right-20 w-80 h-80 rounded-full blur-[80px] opacity-20 bg-[#818CF8]" />
                </div>
              </div>
            )}

            {/* Background Patterns for Bold */}
            {current.variant === 'bold' && (
              <div className="absolute inset-0 rounded-2xl md:rounded-[40px] pointer-events-none overflow-hidden -z-10 bg-gradient-to-br from-[#fcdf4e] to-[#F59E0B4D]">
                {/* Celebration Confetti - drifting and swaying softly */}
                <motion.svg 
                  className="absolute inset-0 w-full h-full opacity-[0.2]" 
                  viewBox="0 0 400 600" 
                  xmlns="http://www.w3.org/2000/svg"
                  animate={{
                    y: [-12, 12],
                    x: [-8, 8],
                    rotate: [-1, 1]
                  }}
                  transition={{
                    duration: 8,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <rect x="50" y="50" width="8" height="8" rx="2" fill="#92400E" transform="rotate(15 54 54)" opacity="0.8" />
                  <circle cx="150" cy="80" r="3" fill="#92400E" opacity="0.6" />
                  <rect x="320" y="120" width="6" height="12" rx="2" fill="#92400E" transform="rotate(-20 323 126)" opacity="0.9" />
                  <circle cx="360" cy="220" r="4" fill="#92400E" opacity="0.7" />
                  <rect x="40" y="480" width="10" height="6" rx="2" fill="#92400E" transform="rotate(45 45 483)" opacity="0.8" />
                  <circle cx="110" cy="540" r="3" fill="#92400E" opacity="0.6" />
                  <rect x="330" y="520" width="12" height="6" rx="2" fill="#92400E" transform="rotate(-10 336 523)" opacity="0.9" />
                  <circle cx="200" cy="150" r="2" fill="#92400E" opacity="0.5" />
                  <circle cx="280" cy="450" r="2" fill="#92400E" opacity="0.5" />
                  
                  {/* More Confetti */}
                  <rect x="180" y="40" width="6" height="6" rx="1" fill="#92400E" transform="rotate(30 183 43)" opacity="0.7" />
                  <circle cx="250" cy="90" r="4" fill="#92400E" opacity="0.8" />
                  <rect x="60" y="280" width="10" height="4" rx="1" fill="#92400E" transform="rotate(-15 65 282)" opacity="0.6" />
                  <circle cx="340" cy="350" r="3" fill="#92400E" opacity="0.9" />
                  <rect x="150" y="480" width="8" height="8" rx="2" fill="#92400E" transform="rotate(10 154 484)" opacity="0.7" />
                  <circle cx="50" cy="380" r="5" fill="#92400E" opacity="0.8" />
                  <rect x="220" y="560" width="6" height="14" rx="2" fill="#92400E" transform="rotate(25 223 567)" opacity="0.9" />
                  <circle cx="380" cy="480" r="3" fill="#92400E" opacity="0.6" />
                  <rect x="280" y="200" width="8" height="4" rx="1" fill="#92400E" transform="rotate(-35 284 202)" opacity="0.7" />
                </motion.svg>

                {/* Soft, luxurious glowing fluid orbs - floating softly */}
                <motion.div 
                  className="absolute -top-20 -left-20 w-80 h-80 bg-[#F59E0B]/20 rounded-full blur-[80px]" 
                  animate={{
                    x: [-20, 20],
                    y: [-15, 15],
                    scale: [1, 1.15, 1]
                  }}
                  transition={{
                    duration: 10,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
                <motion.div 
                  className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-[80px] opacity-20 bg-[#F59E0B]" 
                  animate={{
                    x: [20, -20],
                    y: [15, -15],
                    scale: [1, 1.12, 1]
                  }}
                  transition={{
                    duration: 12,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
              </div>
            )}

            {/* Background Patterns for Bold Pink (Elegant Fluid Curves) */}
            {current.variant === 'bold-pink' && (
              <div className="absolute inset-0 rounded-2xl md:rounded-[40px] pointer-events-none overflow-hidden bg-gradient-to-br from-[#EA5489] to-[#C2185B] -z-10">
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/p6-dark.png")' }} />
                
                {/* Clean, luxury organic wave lines - breathing slowly */}
                <motion.svg 
                  className="absolute inset-0 w-full h-full opacity-[0.35]" 
                  viewBox="0 0 400 600" 
                  xmlns="http://www.w3.org/2000/svg"
                  animate={{
                    y: [-15, 15]
                  }}
                  transition={{
                    duration: 8,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  {/* Clean contour stroke lines only (no solid bottom fills) */}
                  <path d="M-100 120 C50 20, 250 220, 500 120" fill="none" stroke="white" strokeWidth="1.5" opacity="0.4" />
                  <path d="M-100 200 C50 100, 250 300, 500 200" fill="none" stroke="white" strokeWidth="3" opacity="0.6" />
                  <path d="M-100 300 C50 200, 250 400, 500 300" fill="none" stroke="white" strokeWidth="2" opacity="0.5" />
                  <path d="M-100 400 C50 300, 250 500, 500 400" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
                </motion.svg>
 
                {/* Soft, luxurious glowing fluid orbs - floating softly */}
                <motion.div 
                  className="absolute -top-10 -left-10 w-80 h-80 bg-[#FF8DA1]/30 rounded-full blur-[70px]" 
                  animate={{
                    x: [-25, 25],
                    y: [-15, 15],
                    scale: [1, 1.15, 1]
                  }}
                  transition={{
                    duration: 10,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
                <motion.div 
                  className="absolute top-1/3 -right-20 w-80 h-80 bg-[#FF4E72]/20 rounded-full blur-[80px]" 
                  animate={{
                    x: [25, -25],
                    y: [15, -15],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 12,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
              </div>
            )}

            {/* Background Patterns for Bold Puzzle (Flat solid color with vector repeating puzzle grid) */}
            {current.variant === 'bold-puzzle' && (
              <div 
                className="absolute inset-0 rounded-2xl md:rounded-[40px] pointer-events-none overflow-hidden -z-10"
                style={{ backgroundColor: current.bg }}
              >
                {/* Seamless Scrolling SVG Jigsaw Puzzle Pattern */}
                <motion.svg 
                  className="absolute -top-[100px] -left-[100px] w-[calc(100%+100px)] h-[calc(100%+100px)] opacity-[0.13]" 
                  animate={{
                    x: [0, 100],
                    y: [0, 100]
                  }}
                  transition={{
                    duration: 12,
                    ease: "linear",
                    repeat: Infinity
                  }}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id="puzzle-grid" width="100" height="100" patternUnits="userSpaceOnUse">
                      <path 
                        d="M 0,0 
                           H 35 C 35,-8 40,-8 40,-12 C 40,-18 60,-18 60,-12 C 60,-8 65,-8 65,0 H 100
                           V 35 C 108,35 108,40 112,40 C 118,40 118,60 112,60 C 108,60 108,65 100,65 V 100
                           H 65 C 65,92 60,92 60,88 C 60,82 40,82 40,88 C 40,92 35,92 35,100 H 0
                           V 65 C 8,65 8,60 12,60 C 18,60 18,40 12,40 C 8,40 8,35 0,35 Z" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="1.0" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#puzzle-grid)" />
                </motion.svg>
              </div>
            )}

            {/* Background Patterns for Bold Cosmic (Minimalist Solid with Large Rotated Lavender Heart) */}
            {current.variant === 'bold-cosmic' && (
              <div className="absolute inset-0 rounded-2xl md:rounded-[40px] pointer-events-none overflow-hidden bg-[#1D1561] -z-10">
                {/* Large, beautiful Lavender Heart shape at top-left */}
                <motion.div
                  className="absolute -top-36 -left-36 w-[360px] h-[360px] origin-center"
                  animate={{
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0,
                  }}
                >
                  <svg 
                    className="w-full h-full opacity-[0.85]"
                    viewBox="0 0 100 100" 
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ transform: 'rotate(135deg)' }}
                  >
                    <path 
                      d="M 52,42 C 50,14 14,12 12,38 C 10,65 46,88 48,90 C 50,92 88,72 86,44 C 84,18 56,14 52,42 Z" 
                      fill="#db9de3" 
                    />
                  </svg>
                </motion.div>

                {/* Beautiful Lime Heart shape at right-middle */}
                <motion.div
                  className="absolute top-[30%] -right-28 md:-right-44 w-[180px] h-[180px] md:w-[280px] md:h-[280px] origin-center"
                  animate={{
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1.5,
                  }}
                >
                  <svg 
                    className="w-full h-full opacity-[0.85]"
                    viewBox="0 0 100 100" 
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ transform: 'rotate(-90deg)' }}
                  >
                    <path 
                      d="M 48,44 C 52,12 16,8 14,36 C 12,68 44,92 46,92 C 48,92 92,68 88,38 C 84,12 44,14 48,44 Z" 
                      fill="#c2f081" 
                    />
                  </svg>
                </motion.div>

                {/* Beautiful Peach Heart shape at bottom-right */}
                <motion.div
                  className="absolute -bottom-10 md:-bottom-24 -right-16 md:-right-16 w-[160px] h-[160px] md:w-[260px] md:h-[260px] origin-center"
                  animate={{
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 3,
                  }}
                >
                  <svg 
                    className="w-full h-full opacity-[0.85]"
                    viewBox="0 0 100 100" 
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ transform: 'rotate(-30deg)' }}
                  >
                    <path 
                      d="M 50,42 C 46,14 12,12 10,38 C 8,65 44,88 46,90 C 48,92 86,72 84,44 C 82,18 54,14 50,42 Z" 
                      fill="#edb49a" 
                    />
                  </svg>
                </motion.div>

                {/* Beautiful Periwinkle Heart shape at middle-left */}
                <motion.div
                  className="absolute top-[48%] -left-44 w-[270px] h-[270px] origin-center"
                  animate={{
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 4.5,
                  }}
                >
                  <svg 
                    className="w-full h-full opacity-[0.85]"
                    viewBox="0 0 100 100" 
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ transform: 'rotate(-105deg)' }}
                  >
                    <path 
                      d="M 50,42 C 48,16 14,14 12,38 C 10,65 40,84 46,86 C 52,88 88,72 86,44 C 84,18 54,16 50,42 Z" 
                      fill="#a9c4e8" 
                    />
                  </svg>
                </motion.div>
              </div>
            )}

            {(current.variant === 'bold' || current.variant === 'bold-pink' || current.variant === 'bold-puzzle' || current.variant === 'bold-cosmic') ? (
              <div className="flex flex-col h-[420px] md:h-[560px] relative z-10">
                {/* Brand Header */}
                <div className="flex justify-between items-center p-8 pb-0 relative z-20">
                  <div className="h-6 w-auto flex items-center">
                    <svg width="87" height="22" viewBox="0 0 87 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.3126 17.5382C11.2597 17.0219 11.2261 16.4696 11.1925 15.8837C11.1589 15.2978 11.1397 14.7118 11.1397 14.1595C11.1229 13.5904 11.1228 13.0213 11.1228 12.469V10.0557C11.1228 9.28004 11.0364 8.57165 10.8635 7.95211C10.6906 7.29655 10.3977 6.72743 10.0014 6.26157C9.60521 5.79571 9.06972 5.41631 8.39735 5.15696C7.74179 4.89762 6.91333 4.76074 5.9648 4.76074C5.30924 4.76074 4.65368 4.84719 3.99812 5.00328C3.35936 5.15936 2.77344 5.4163 2.29077 5.7621C1.79129 6.10789 1.37587 6.55453 1.04929 7.07322C0.720305 7.58951 0.496981 8.21145 0.410533 8.91744L0.376911 9.10715L3.11923 9.81314L3.15284 9.5706C3.22248 9.00149 3.41219 8.53563 3.68834 8.18984C3.9813 7.86326 4.3271 7.60392 4.72331 7.46464C5.56858 7.15487 6.55073 7.17167 7.18948 7.49825C7.51846 7.65434 7.7586 7.86086 7.93149 8.13701C8.10439 8.39635 8.19083 8.72293 8.19083 9.08554C8.19083 9.30886 8.12119 9.48175 8.00112 9.60182C7.88106 9.73869 7.63852 9.86117 7.29513 9.9284C6.91572 10.0317 6.39944 10.1181 5.74388 10.1877C5.07151 10.3246 4.41594 10.4471 3.77719 10.5672C3.12163 10.704 2.50209 10.9129 1.94978 11.2059C1.36386 11.5157 0.881191 11.9311 0.5354 12.4474C0.189609 12.9637 -9.15527e-05 13.6384 -9.15527e-05 14.4477C-9.15527e-05 15.2569 0.172803 15.9485 0.516192 16.4648C0.861983 16.9811 1.32784 17.3965 1.91377 17.6727C2.48288 17.9488 3.10482 18.1049 3.75798 18.1049C4.63687 18.1049 5.39569 17.9152 6.05125 17.5694C6.70681 17.2068 7.24231 16.741 7.67214 16.155C8.00113 15.706 8.25807 15.2065 8.46459 14.6902C8.46459 15.1033 8.48139 15.5187 8.48139 15.9149L8.55103 17.7591H11.327L11.3102 17.5358L11.3126 17.5382ZM4.7065 15.6748C4.17101 15.6748 3.74117 15.5379 3.44821 15.2786C3.15525 15.0024 3.01597 14.623 3.01597 14.1067C3.01597 13.6745 3.10242 13.3479 3.30894 13.1246C3.49864 12.882 3.7916 12.6923 4.1542 12.5386C4.53361 12.3826 4.94664 12.2625 5.41249 12.1929C5.87835 12.1064 6.34421 12.0368 6.79086 11.9695C7.25672 11.8831 7.70577 11.7798 8.11879 11.6429C8.1356 11.6429 8.15241 11.6261 8.17162 11.6261L8.18843 12.4882C8.03234 13.0045 7.82583 13.4704 7.5857 13.8858C7.34317 14.2988 7.0502 14.6278 6.74043 14.8871C6.41145 15.1297 6.06806 15.3362 5.72227 15.4731C5.35967 15.6099 5.03309 15.6796 4.70411 15.6796L4.7065 15.6748Z" fill={current.accent}></path><path d="M31.6782 7.91698C31.5221 7.34547 31.3084 6.82198 31.0419 6.36572C30.7633 5.88546 30.3623 5.49404 29.8508 5.19868C29.3393 4.90572 28.703 4.75684 27.9586 4.75684C27.2142 4.75684 26.5346 4.93453 25.9462 5.28272C25.3531 5.63332 24.856 6.17842 24.4694 6.90362C24.1597 7.48474 23.9075 8.20994 23.7226 9.06962C23.689 8.57254 23.6242 8.10909 23.5329 7.68405C23.4032 7.06931 23.1895 6.54342 22.8966 6.11598C22.6012 5.68615 22.217 5.34996 21.7535 5.11223C21.2901 4.8769 20.745 4.75684 20.1302 4.75684C19.4002 4.75684 18.7375 4.93453 18.1611 5.28513C17.5848 5.63812 17.1094 6.19283 16.754 6.93724C16.4706 7.53277 16.2401 8.26517 16.0696 9.12004L16.2641 5.04019H13.5746L13.601 17.7696H16.5859V12.4315C16.6315 11.3989 16.7804 10.4912 17.0253 9.73478C17.2655 8.99037 17.5896 8.41405 17.9883 8.02504C18.3749 7.64323 18.8431 7.46073 19.4218 7.46073C19.8973 7.46073 20.2479 7.5928 20.4904 7.86415C20.7498 8.14991 20.9395 8.51011 21.0572 8.93514C21.1772 9.37699 21.2565 9.82843 21.2853 10.2751C21.3165 10.7577 21.3333 11.1348 21.3333 11.4301V17.772H24.2941V12.3642C24.3398 11.3629 24.4886 10.4816 24.7336 9.73719C24.9737 9.00958 25.3075 8.43807 25.7301 8.03945C26.1432 7.65043 26.5922 7.46073 27.1085 7.46073C27.584 7.46073 27.9514 7.5832 28.1987 7.82333C28.4604 8.08027 28.6525 8.41645 28.7678 8.82708C28.8879 9.26412 28.9671 9.69877 28.9959 10.1214C29.0296 10.5704 29.044 10.9451 29.044 11.2644V17.772H32.0528V10.9354C32.0528 10.52 32.0288 10.0518 31.9808 9.54268C31.9328 9.036 31.8319 8.4909 31.6782 7.92178V7.91698Z" fill={current.accent}></path><path d="M45.8748 7.88093C45.4618 6.89878 44.8735 6.12076 44.1147 5.57085C43.339 5.01855 42.3905 4.72559 41.3027 4.72559C40.5271 4.72559 39.8379 4.88167 39.2688 5.19144C38.6997 5.48441 38.2002 5.95026 37.8208 6.55299C37.511 7.03566 37.2517 7.62159 37.062 8.27715L37.2013 5.03536H34.4926V21.4532H37.4942V18.0217C37.4942 17.5895 37.4774 17.1597 37.4606 16.7106C37.4438 16.2448 37.3741 15.7621 37.3045 15.2794C37.2709 15.0897 37.2541 14.9168 37.2181 14.7439C37.3741 15.193 37.5638 15.6228 37.7704 16.0022C38.133 16.641 38.6324 17.1573 39.2184 17.5199C39.8211 17.8825 40.5631 18.0722 41.4252 18.0722C42.477 18.0722 43.4087 17.796 44.1675 17.2437C44.9263 16.6914 45.5122 15.899 45.8917 14.9144C46.2879 13.9323 46.4776 12.7412 46.4776 11.3965C46.4776 10.0517 46.2711 8.86067 45.8748 7.87853V7.88093ZM37.4942 11.2092C37.4942 10.7601 37.5638 10.3135 37.7175 9.86442C37.8712 9.41538 38.0801 8.98554 38.3395 8.58932C38.582 8.20991 38.9086 7.91695 39.288 7.71043C39.6674 7.50392 40.1165 7.38386 40.6159 7.38386C41.2019 7.38386 41.7205 7.55675 42.1168 7.86652C42.513 8.17629 42.842 8.64215 43.0485 9.24728C43.2718 9.85002 43.3775 10.592 43.3775 11.4037C43.3775 12.2153 43.2742 12.9549 43.0677 13.5769C42.8612 14.1796 42.5514 14.6455 42.136 14.9744C41.723 15.3202 41.2403 15.4739 40.6352 15.4739C40.2221 15.4739 39.8427 15.3875 39.5137 15.2314C39.1847 15.0585 38.8918 14.8184 38.6517 14.5422C38.3923 14.2324 38.1858 13.9203 38.0129 13.5769C37.8232 13.2503 37.7031 12.9045 37.6167 12.5251C37.5302 12.1625 37.4966 11.8191 37.4966 11.5237V11.214L37.4942 11.2092Z" fill={current.accent}></path><path d="M43.2525 9.17511C43.0291 8.53635 42.6833 8.03688 42.2511 7.69109C41.8021 7.3453 41.2497 7.1748 40.6134 7.1748C40.0779 7.1748 39.5952 7.29486 39.1822 7.52059C38.7692 7.74631 38.4234 8.0729 38.1472 8.46912C37.8711 8.90136 37.6646 9.348 37.5085 9.79705C37.3524 10.2629 37.2852 10.7456 37.2852 11.2114V11.5212C37.2852 11.8478 37.3188 12.1936 37.4052 12.573C37.4917 12.9524 37.6285 13.3318 37.8014 13.6776C37.9911 14.0234 38.2145 14.35 38.4906 14.679C38.75 14.9887 39.0597 15.2313 39.4223 15.421C39.7681 15.5939 40.1812 15.6971 40.6302 15.6971C41.2858 15.6971 41.8213 15.5074 42.2679 15.1448C42.7001 14.7822 43.0435 14.2827 43.2693 13.644C43.4758 13.0052 43.5958 12.2464 43.5958 11.4011C43.5958 10.5559 43.4758 9.81386 43.2501 9.17751L43.2525 9.17511ZM40.6302 15.2625C40.2508 15.2625 39.905 15.176 39.612 15.0392C39.3191 14.8831 39.0429 14.6597 38.8196 14.3836C38.5603 14.1074 38.3537 13.7977 38.1977 13.4687C38.0248 13.1589 37.9047 12.8299 37.8351 12.4865C37.7486 12.1407 37.715 11.8142 37.715 11.5212V11.2114C37.715 10.7792 37.7846 10.3494 37.9215 9.93633C38.0608 9.50409 38.2673 9.09106 38.5074 8.71165C38.7476 8.36586 39.0429 8.08971 39.3863 7.9C39.7321 7.7103 40.1451 7.60704 40.611 7.60704C41.1465 7.60704 41.6123 7.74391 41.9725 8.03928C42.352 8.33224 42.6449 8.76448 42.8346 9.31438C43.0579 9.9003 43.1612 10.6087 43.1612 11.4011C43.1612 12.1936 43.0579 12.902 42.8514 13.5047C42.6617 14.057 42.3688 14.5061 41.9894 14.8158C41.6268 15.1088 41.1777 15.2649 40.6278 15.2649L40.6302 15.2625Z" fill={current.accent}></path><path d="M54.2386 15.1232C53.9625 15.1977 53.6983 15.2337 53.4294 15.2337C52.9875 15.2337 52.6418 15.1256 52.3728 14.9047C52.1183 14.6958 51.991 14.2996 51.991 13.7232V7.62387H55.3024V5.04004H51.991V2.31934H50.0243L49.8106 4.00987C49.7842 4.39408 49.6737 4.67504 49.4864 4.85034C49.2991 5.02563 48.9773 5.12168 48.5355 5.13609H47.3756V7.57825H49.0302V13.8433C49.0302 14.4773 49.1094 15.056 49.2631 15.5627C49.4192 16.0765 49.6545 16.528 49.9643 16.9026C50.2788 17.2844 50.6871 17.5726 51.1793 17.7599C51.6596 17.9424 52.2263 18.0336 52.8627 18.0336C53.2037 18.0336 53.5639 18.0024 53.9625 17.9376C54.3539 17.8727 54.7741 17.7575 55.2088 17.5942L55.348 17.5414V14.5181L55.0071 14.7582C54.7597 14.9335 54.5004 15.056 54.2362 15.128L54.2386 15.1232Z" fill={current.accent}></path><path d="M58.633 0.546875C58.0303 0.546875 57.5668 0.678948 57.2546 0.940693C56.928 1.20964 56.7624 1.62027 56.7624 2.15816C56.7624 2.63603 56.9329 3.01544 57.2666 3.28439C57.5884 3.54373 58.0471 3.6758 58.633 3.6758C59.2189 3.6758 59.7016 3.54373 60.021 3.28679C60.3571 3.01784 60.5276 2.62882 60.5276 2.13655C60.5276 1.64428 60.3548 1.23125 60.0114 0.952696C59.6824 0.683748 59.2189 0.549275 58.633 0.549275V0.546875Z" fill={current.accent}></path><path d="M60.1748 5.04004H57.166V17.7695H60.1748V5.04004Z" fill={current.accent}></path><path d="M67.8568 15.0794L64.7518 5.06348H61.498L65.9549 17.7689H69.7154L74.1194 5.06348H70.9377L67.8568 15.0794Z" fill={current.accent}></path><path d="M83.5228 13.1927L83.506 13.4352C83.506 13.6946 83.4363 13.9707 83.3163 14.2277C83.177 14.487 83.0233 14.7271 82.8 14.9337C82.6103 15.1402 82.3341 15.3131 81.9883 15.4499C81.6617 15.5868 81.2463 15.6565 80.7973 15.6565C79.6927 15.6565 78.8666 15.3107 78.2975 14.6215C77.7812 13.9995 77.4858 13.1207 77.4354 11.9824L86.0586 11.896L86.0754 11.7063C86.1258 10.5849 86.0586 9.60271 85.8328 8.74064C85.6263 7.87856 85.2637 7.15336 84.7811 6.55063C84.2984 5.94789 83.6765 5.49884 82.9537 5.18907C82.2453 4.89611 81.436 4.75684 80.5571 4.75684C79.575 4.75684 78.6937 4.92973 77.9349 5.27312C77.1929 5.61891 76.5565 6.10158 76.0378 6.70431C75.5384 7.32625 75.1421 8.04905 74.8828 8.89432C74.6066 9.72278 74.4866 10.6353 74.4866 11.6198C74.4866 12.6044 74.6066 13.4472 74.8828 14.2421C75.1421 15.0345 75.5552 15.7261 76.0739 16.2952C76.5901 16.8475 77.2649 17.2966 78.0405 17.6231C78.8162 17.9329 79.7311 18.1058 80.7492 18.1058C81.5777 18.1058 82.3173 18.0026 82.9561 17.796C83.6116 17.5895 84.1639 17.2798 84.6298 16.8811C85.1124 16.5017 85.4751 16.0359 85.7512 15.5196C86.0106 15.0201 86.1834 14.451 86.2867 13.8459L86.3203 13.6393L83.5252 13.1903L83.5228 13.1927ZM78.8834 7.7777C79.3325 7.43191 79.9016 7.27823 80.5571 7.27823C81.1262 7.27823 81.6449 7.41511 82.0748 7.69126C82.507 7.96741 82.8336 8.39725 83.0233 8.94955C83.1265 9.2257 83.1962 9.55229 83.2298 9.89808L77.5723 9.95091C77.6419 9.69156 77.7116 9.45143 77.7956 9.2257C78.055 8.60376 78.4151 8.10428 78.881 7.7777H78.8834Z" fill={current.accent}></path>
                    </svg>
                  </div>
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40">
                    <div 
                      className="w-4 h-4" 
                      style={{ 
                        backgroundColor: current.accent,
                        maskImage: 'url(/amptivelogo.svg)',
                        maskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        maskPosition: 'center',
                        WebkitMaskImage: 'url(/amptivelogo.svg)',
                        WebkitMaskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center'
                      }} 
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-8 space-y-6 relative z-10 w-full">
                  {current.variant === 'bold-puzzle' ? (
                    <>
                      {/* Upper Half: Taped Polaroid QR Card */}
                      <div className="relative pt-6">
                        {/* Tilted Polaroid Box */}
                        <div className="flex flex-col items-center rotate-[-3deg] hover:rotate-[0deg] transition-all duration-300 ease-out cursor-pointer relative z-20 scale-90 md:scale-100 origin-center">
                          {/* Highly Visible Frosted Tape Holder Sticker - Placed inside so it rotates & hovers with the card! */}
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-20 h-7 bg-white/45 backdrop-blur-md border-t border-b border-white/30 shadow-sm rotate-[-5deg] z-30 pointer-events-none" />
                          
                          <div className="bg-white p-4 pb-6 rounded-[4px] shadow-2xl border border-black/5 relative z-10 flex flex-col items-center">
                            {/* QR Image Frame */}
                            <div className="bg-slate-50 p-1.5 rounded-sm flex items-center justify-center relative w-[180px] h-[180px] md:w-[220px] md:h-[220px]">
                              <QRCodeSVG 
                                value={`https://getamptive.com/${username}`}
                                size={256}
                                level="H"
                                className="w-full h-full" 
                              />
                              {/* Avatar Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-white p-0.5 rounded-full shadow-sm">
                                  <img src={avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover" />
                                </div>
                              </div>
                            </div>
                            
                            {/* Polaroid handwriting caption */}
                            <span className="text-[10px] md:text-xs font-spotify font-black tracking-widest text-slate-800 uppercase mt-5">
                              ★ {profileType === 'business' ? 'Scan to Tip My Business' : profileType === 'creator' ? 'Scan to Tip Creator' : profileType === 'organizer' ? 'Scan to Support My Event' : 'Scan to Support'} ★
                            </span>
                          </div>
                        </div>
                      </div>


                    </>
                  ) : (current.variant === 'bold-pink' || current.variant === 'bold-cosmic') ? (
                    <>
                      {/* Bold Pink: Enlarged QR code (210px for bold-pink, 180px for bold-cosmic) at the center */}
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <div className={`absolute inset-0 bg-white/30 rounded-full blur-2xl ${current.variant === 'bold-cosmic' ? 'hidden' : ''}`} />
                          <div className={`p-1 rounded-lg border-2 border-black/5 relative z-10 ${current.variant === 'bold-cosmic' ? 'bg-[#e6e8e1]' : 'bg-white'}`}>
                            <div className={`p-1 rounded-lg flex items-center justify-center relative ${current.variant === 'bold-cosmic' ? 'bg-[#e6e8e1]' : 'bg-white'}`} style={{ width: current.variant === 'bold-pink' ? '210px' : '180px', height: current.variant === 'bold-pink' ? '210px' : '180px' }}>
                              <QRCodeSVG 
                                value={`https://getamptive.com/${username}`}
                                size={current.variant === 'bold-pink' ? 200 : 172}
                                level="H"
                                bgColor={current.variant === 'bold-cosmic' ? "#E6E8E1" : "#FFFFFF"}
                                fgColor={current.variant === 'bold-cosmic' ? "#1D1561" : "#000000"}
                                className={current.variant === 'bold-pink' ? 'w-[200px] h-[200px]' : 'w-[172px] h-[172px]'} 
                              />
                              {/* Avatar Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className={`p-1 rounded-full ${current.variant === 'bold-cosmic' ? 'bg-[#e6e8e1]' : 'bg-white'}`}>
                                  <img src={avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs md:text-sm font-medium" style={{ color: current.accent }}>
                          {profileType === 'business' ? 'Scan to Tip My Business' : profileType === 'creator' ? 'Scan to Tip Creator' : profileType === 'organizer' ? 'Scan to Support My Event' : 'Scan to Support'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Bold Yellow: Scaled-up QR code (210px) at the top */}
                      <div className="flex flex-col items-center gap-3">
                        <motion.div
                          className="relative"
                          initial={qrPopOutInitial}
                          animate={qrPopOutAnimate}
                          transition={qrPopOutTransition}
                          style={qrPopOutStyle}
                        >
                          <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl" />
                          <div className="bg-white p-1 rounded-lg border-2 border-black/5 relative z-10">
                            <div className="bg-white p-1 rounded-lg flex items-center justify-center relative" style={{ width: '210px', height: '210px' }}>
                              <QRCodeSVG 
                                value={`https://getamptive.com/${username}`}
                                size={200}
                                level="H"
                                className="w-[200px] h-[200px]" 
                              />
                              {/* Avatar Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-white p-1 rounded-full">
                                  <img src={avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        <p className="text-xs md:text-sm font-medium" style={{ color: current.accent }}>
                          {profileType === 'business' ? 'Scan to Tip My Business' : profileType === 'creator' ? 'Scan to Tip Creator' : profileType === 'organizer' ? 'Scan to Support My Event' : 'Scan to Support'}
                        </p>
                      </div>

                      {/* Bold Yellow: Bio text removed */}
                    </>
                  )}
                </div>

                {current.variant === 'bold-puzzle' ? (
                  <div className="p-8 pt-0 pb-10 md:pb-12 relative z-20">
                    <div className="flex flex-col items-center gap-1">
                      <span 
                        className="text-[10px] md:text-xs font-semibold opacity-60" 
                        style={{ color: current.accent }}
                      >
                        Generate your own Tip Card at
                      </span>
                      <a 
                        href="https://getamptive.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs md:text-sm font-bold tracking-tight hover:opacity-80 transition-opacity duration-200"
                        style={{ 
                          color: current.accent
                        }}
                      >
                        getamptive.com
                      </a>
                    </div>
                  </div>
                ) : current.variant === 'bold' ? (
                  <div className="p-8 pt-0 pb-10 md:pb-12 relative z-20">
                    <div className="relative flex flex-col items-center">
                      {/* Merging Gooey Background Layer */}
                      <div 
                        className="absolute inset-0 flex flex-col items-center justify-center -space-y-1.5 pointer-events-none opacity-40 select-none"
                        style={{ filter: 'url(#gooey-merge)' }}
                      >
                        <div className="px-4 py-1.5 rounded-full bg-white border border-white text-transparent text-[11px] md:text-xs font-semibold tracking-tight">
                          Generate your own Tip Card at
                        </div>
                        <div className="px-6 py-1.5 rounded-full bg-white border border-white text-transparent text-[11px] md:text-xs font-semibold tracking-tight">
                          getamptive.com
                        </div>
                      </div>

                      {/* Crisp Text Layer on top */}
                      <div className="relative z-10 flex flex-col items-center justify-center -space-y-1.5">
                        <span 
                          className="px-4 py-1.5 text-[11px] md:text-xs font-semibold tracking-tight" 
                          style={{ color: getRgba(current.accent, 0.7) }}
                        >
                          Generate your own Tip Card at
                        </span>
                        <a 
                          href="https://getamptive.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-1.5 text-[11px] md:text-xs font-semibold tracking-tight transition-all duration-200 hover:scale-105 active:scale-95 inline-block"
                          style={{ color: getRgba(current.accent, 0.7) }}
                        >
                          getamptive.com
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 pt-0 pb-10 md:pb-12 relative z-20">
                    <div className="flex flex-col items-center gap-2">
                      <span 
                        className="text-[10px] md:text-xs font-semibold opacity-60" 
                        style={{ color: current.accent }}
                      >
                        Generate your own Tip Card at
                      </span>
                      <a 
                        href="https://getamptive.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 rounded-full text-xs md:text-sm font-bold tracking-tight transition-all duration-200 hover:scale-105 active:scale-95 inline-block"
                        style={{ 
                          color: current.accent,
                          backgroundColor: current.variant === 'bold' ? 'rgba(255, 255, 255, 0.4)' : getRgba(current.accent, current.accent === '#FFFFFF' ? 0.12 : 0.06),
                          border: current.variant === 'bold' ? '1px solid rgba(255, 255, 255, 0.2)' : `1px solid ${getRgba(current.accent, current.accent === '#FFFFFF' ? 0.2 : 0.12)}`,
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)'
                        }}
                      >
                        getamptive.com
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col h-[420px] md:h-[560px] relative z-10">
                {/* Header Section */}
                <div className="flex justify-between items-center p-8 pb-0">
                  <div className="h-6 w-auto flex items-center">
                    <svg width="87" height="22" viewBox="0 0 87 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.3126 17.5382C11.2597 17.0219 11.2261 16.4696 11.1925 15.8837C11.1589 15.2978 11.1397 14.7118 11.1397 14.1595C11.1229 13.5904 11.1228 13.0213 11.1228 12.469V10.0557C11.1228 9.28004 11.0364 8.57165 10.8635 7.95211C10.6906 7.29655 10.3977 6.72743 10.0014 6.26157C9.60521 5.79571 9.06972 5.41631 8.39735 5.15696C7.74179 4.89762 6.91333 4.76074 5.9648 4.76074C5.30924 4.76074 4.65368 4.84719 3.99812 5.00328C3.35936 5.15936 2.77344 5.4163 2.29077 5.7621C1.79129 6.10789 1.37587 6.55453 1.04929 7.07322C0.720305 7.58951 0.496981 8.21145 0.410533 8.91744L0.376911 9.10715L3.11923 9.81314L3.15284 9.5706C3.22248 9.00149 3.41219 8.53563 3.68834 8.18984C3.9813 7.86326 4.3271 7.60392 4.72331 7.46464C5.56858 7.15487 6.55073 7.17167 7.18948 7.49825C7.51846 7.65434 7.7586 7.86086 7.93149 8.13701C8.10439 8.39635 8.19083 8.72293 8.19083 9.08554C8.19083 9.30886 8.12119 9.48175 8.00112 9.60182C7.88106 9.73869 7.63852 9.86117 7.29513 9.9284C6.91572 10.0317 6.39944 10.1181 5.74388 10.1877C5.07151 10.3246 4.41594 10.4471 3.77719 10.5672C3.12163 10.704 2.50209 10.9129 1.94978 11.2059C1.36386 11.5157 0.881191 11.9311 0.5354 12.4474C0.189609 12.9637 -9.15527e-05 13.6384 -9.15527e-05 14.4477C-9.15527e-05 15.2569 0.172803 15.9485 0.516192 16.4648C0.861983 16.9811 1.32784 17.3965 1.91377 17.6727C2.48288 17.9488 3.10482 18.1049 3.75798 18.1049C4.63687 18.1049 5.39569 17.9152 6.05125 17.5694C6.70681 17.2068 7.24231 16.741 7.67214 16.155C8.00113 15.706 8.25807 15.2065 8.46459 14.6902C8.46459 15.1033 8.48139 15.5187 8.48139 15.9149L8.55103 17.7591H11.327L11.3102 17.5358L11.3126 17.5382ZM4.7065 15.6748C4.17101 15.6748 3.74117 15.5379 3.44821 15.2786C3.15525 15.0024 3.01597 14.623 3.01597 14.1067C3.01597 13.6745 3.10242 13.3479 3.30894 13.1246C3.49864 12.882 3.7916 12.6923 4.1542 12.5386C4.53361 12.3826 4.94664 12.2625 5.41249 12.1929C5.87835 12.1064 6.34421 12.0368 6.79086 11.9695C7.25672 11.8831 7.70577 11.7798 8.11879 11.6429C8.1356 11.6429 8.15241 11.6261 8.17162 11.6261L8.18843 12.4882C8.03234 13.0045 7.82583 13.4704 7.5857 13.8858C7.34317 14.2988 7.0502 14.6278 6.74043 14.8871C6.41145 15.1297 6.06806 15.3362 5.72227 15.4731C5.35967 15.6099 5.03309 15.6796 4.70411 15.6796L4.7065 15.6748Z" fill={current.accent} />
                      <path d="M31.6782 7.91698C31.5221 7.34547 31.3084 6.82198 31.0419 6.36572C30.7633 5.88546 30.3623 5.49404 29.8508 5.19868C29.3393 4.90572 28.703 4.75684 27.9586 4.75684C27.2142 4.75684 26.5346 4.93453 25.9462 5.28272C25.3531 5.63332 24.856 6.17842 24.4694 6.90362C24.1597 7.48474 23.9075 8.20994 23.7226 9.06962C23.689 8.57254 23.6242 8.10909 23.5329 7.68405C23.4032 7.06931 23.1895 6.54342 22.8966 6.11598C22.6012 5.68615 22.217 5.34996 21.7535 5.11223C21.2901 4.8769 20.745 4.75684 20.1302 4.75684C19.4002 4.75684 18.7375 4.93453 18.1611 5.28513C17.5848 5.63812 17.1094 6.19283 16.754 6.93724C16.4706 7.53277 16.2401 8.26517 16.0696 9.12004L16.2641 5.04019H13.5746L13.601 17.7696H16.5859V12.4315C16.6315 11.3989 16.7804 10.4912 17.0253 9.73478C17.2655 8.99037 17.5896 8.41405 17.9883 8.02504C18.3749 7.64323 18.8431 7.46073 19.4218 7.46073C19.8973 7.46073 20.2479 7.5928 20.4904 7.86415C20.7498 8.14991 20.9395 8.51011 21.0572 8.93514C21.1772 9.37699 21.2565 9.82843 21.2853 10.2751C21.3165 10.7577 21.3333 11.1348 21.3333 11.4301V17.772H24.2941V12.3642C24.3398 11.3629 24.4886 10.4816 24.7336 9.73719C24.9737 9.00958 25.3075 8.43807 25.7301 8.03945C26.1432 7.65043 26.5922 7.46073 27.1085 7.46073C27.584 7.46073 27.9514 7.5832 28.1987 7.82333C28.4604 8.08027 28.6525 8.41645 28.7678 8.82708C28.8879 9.26412 28.9671 9.69877 28.9959 10.1214C29.0296 10.5704 29.044 10.9451 29.044 11.2644V17.772H32.0528V10.9354C32.0528 10.52 32.0288 10.0518 31.9808 9.54268C31.9328 9.036 31.8319 8.4909 31.6782 7.92178V7.91698Z" fill={current.accent} />
                      <path d="M45.8748 7.88093C45.4618 6.89878 44.8735 6.12076 44.1147 5.57085C43.339 5.01855 42.3905 4.72559 41.3027 4.72559C40.5271 4.72559 39.8379 4.88167 39.2688 5.19144C38.6997 5.48441 38.2002 5.95026 37.8208 6.55299C37.511 7.03566 37.2517 7.62159 37.062 8.27715L37.2013 5.03536H34.4926V21.4532H37.4942V18.0217C37.4942 17.5895 37.4774 17.1597 37.4606 16.7106C37.4438 16.2448 37.3741 15.7621 37.3045 15.2794C37.2709 15.0897 37.2541 14.9168 37.2181 14.7439C37.3741 15.193 37.5638 15.6228 37.7704 16.0022C38.133 16.641 38.6324 17.1573 39.2184 17.5199C39.8211 17.8825 40.5631 18.0722 41.4252 18.0722C42.477 18.0722 43.4087 17.796 44.1675 17.2437C44.9263 16.6914 45.5122 15.899 45.8917 14.9144C46.2879 13.9323 46.4776 12.7412 46.4776 11.3965C46.4776 10.0517 46.2711 8.86067 45.8748 7.87853V7.88093ZM37.4942 11.2092C37.4942 10.7601 37.5638 10.3135 37.7175 9.86442C37.8712 9.41538 38.0801 8.98554 38.3395 8.58932C38.582 8.20991 38.9086 7.91695 39.288 7.71043C39.6674 7.50392 40.1165 7.38386 40.6159 7.38386C41.2019 7.38386 41.7205 7.55675 42.1168 7.86652C42.513 8.17629 42.842 8.64215 43.0485 9.24728C43.2718 9.85002 43.3775 10.592 43.3775 11.4037C43.3775 12.2153 43.2742 12.9549 43.0677 13.5769C42.8612 14.1796 42.5514 14.6455 42.136 14.9744C41.723 15.3202 41.2403 15.4739 40.6352 15.4739C40.2221 15.4739 39.8427 15.3875 39.5137 15.2314C39.1847 15.0585 38.8918 14.8184 38.6517 14.5422C38.3923 14.2324 38.1858 13.9203 38.0129 13.5769C37.8232 13.2503 37.7031 12.9045 37.6167 12.5251C37.5302 12.1625 37.4966 11.8191 37.4966 11.5237V11.214L37.4942 11.2092Z" fill={current.accent} />
                      <path d="M43.2525 9.17511C43.0291 8.53635 42.6833 8.03688 42.2511 7.69109C41.8021 7.3453 41.2497 7.1748 40.6134 7.1748C40.0779 7.1748 39.5952 7.29486 39.1822 7.52059C38.7692 7.74631 38.4234 8.0729 38.1472 8.46912C37.8711 8.90136 37.6646 9.348 37.5085 9.79705C37.3524 10.2629 37.2852 10.7456 37.2852 11.2114V11.5212C37.2852 11.8478 37.3188 12.1936 37.4052 12.573C37.4917 12.9524 37.6285 13.3318 37.8014 13.6776C37.9911 14.0234 38.2145 14.35 38.4906 14.679C38.75 14.9887 39.0597 15.2313 39.4223 15.421C39.7681 15.5939 40.1812 15.6971 40.6302 15.6971C41.2858 15.6971 41.8213 15.5074 42.2679 15.1448C42.7001 14.7822 43.0435 14.2827 43.2693 13.644C43.4758 13.0052 43.5958 12.2464 43.5958 11.4011C43.5958 10.5559 43.4758 9.81386 43.2501 9.17751L43.2525 9.17511ZM40.6302 15.2625C40.2508 15.2625 39.905 15.176 39.612 15.0392C39.3191 14.8831 39.0429 14.6597 38.8196 14.3836C38.5603 14.1074 38.3537 13.7977 38.1977 13.4687C38.0248 13.1589 37.9047 12.8299 37.8351 12.4865C37.7486 12.1407 37.715 11.8142 37.715 11.5212V11.2114C37.715 10.7792 37.7846 10.3494 37.9215 9.93633C38.0608 9.50409 38.2673 9.09106 38.5074 8.71165C38.7476 8.36586 39.0429 8.08971 39.3863 7.9C39.7321 7.7103 40.1451 7.60704 40.611 7.60704C41.1465 7.60704 41.6123 7.74391 41.9725 8.03928C42.352 8.33224 42.6449 8.76448 42.8346 9.31438C43.0579 9.9003 43.1612 10.6087 43.1612 11.4011C43.1612 12.1936 43.0579 12.902 42.8514 13.5047C42.6617 14.057 42.3688 14.5061 41.9894 14.8158C41.6268 15.1088 41.1777 15.2649 40.6278 15.2649L40.6302 15.2625Z" fill={current.accent} />
                      <path d="M54.2386 15.1232C53.9625 15.1977 53.6983 15.2337 53.4294 15.2337C52.9875 15.2337 52.6418 15.1256 52.3728 14.9047C52.1183 14.6958 51.991 14.2996 51.991 13.7232V7.62387H55.3024V5.04004H51.991V2.31934H50.0243L49.8106 4.00987C49.7842 4.39408 49.6737 4.67504 49.4864 4.85034C49.2991 5.02563 48.9773 5.12168 48.5355 5.13609H47.3756V7.57825H49.0302V13.8433C49.0302 14.4773 49.1094 15.056 49.2631 15.5627C49.4192 16.0765 49.6545 16.528 49.9643 16.9026C50.2788 17.2844 50.6871 17.5726 51.1793 17.7599C51.6596 17.9424 52.2263 18.0336 52.8627 18.0336C53.2037 18.0336 53.5639 18.0024 53.9625 17.9376C54.3539 17.8727 54.7741 17.7575 55.2088 17.5942L55.348 17.5414V14.5181L55.0071 14.7582C54.7597 14.9335 54.5004 15.056 54.2362 15.128L54.2386 15.1232Z" fill={current.accent} />
                      <path d="M58.633 0.546875C58.0303 0.546875 57.5668 0.678948 57.2546 0.940693C56.928 1.20964 56.7624 1.62027 56.7624 2.15816C56.7624 2.63603 56.9329 3.01544 57.2666 3.28439C57.5884 3.54373 58.0471 3.6758 58.633 3.6758C59.2189 3.6758 59.7016 3.54373 60.021 3.28679C60.3571 3.01784 60.5276 2.62882 60.5276 2.13655C60.5276 1.64428 60.3548 1.23125 60.0114 0.952696C59.6824 0.683748 59.2189 0.549275 58.633 0.549275V0.546875Z" fill={current.accent} />
                      <path d="M60.1748 5.04004H57.166V17.7695H60.1748V5.04004Z" fill={current.accent} />
                      <path d="M67.8568 15.0794L64.7518 5.06348H61.498L65.9549 17.7689H69.7154L74.1194 5.06348H70.9377L67.8568 15.0794Z" fill={current.accent} />
                      <path d="M83.5228 13.1927L83.506 13.4352C83.506 13.6946 83.4363 13.9707 83.3163 14.2277C83.177 14.487 83.0233 14.7271 82.8 14.9337C82.6103 15.1402 82.3341 15.3131 81.9883 15.4499C81.6617 15.5868 81.2463 15.6565 80.7973 15.6565C79.6927 15.6565 78.8666 15.3107 78.2975 14.6215C77.7812 13.9995 77.4858 13.1207 77.4354 11.9824L86.0586 11.896L86.0754 11.7063C86.1258 10.5849 86.0586 9.60271 85.8328 8.74064C85.6263 7.87856 85.2637 7.15336 84.7811 6.55063C84.2984 5.94789 83.6765 5.49884 82.9537 5.18907C82.2453 4.89611 81.436 4.75684 80.5571 4.75684C79.575 4.75684 78.6937 4.92973 77.9349 5.27312C77.1929 5.61891 76.5565 6.10158 76.0378 6.70431C75.5384 7.32625 75.1421 8.04905 74.8828 8.89432C74.6066 9.72278 74.4866 10.6353 74.4866 11.6198C74.4866 12.6044 74.6066 13.4472 74.8828 14.2421C75.1421 15.0345 75.5552 15.7261 76.0739 16.2952C76.5901 16.8475 77.2649 17.2966 78.0405 17.6231C78.8162 17.9329 79.7311 18.1058 80.7492 18.1058C81.5777 18.1058 82.3173 18.0026 82.9561 17.796C83.6116 17.5895 84.1639 17.2798 84.6298 16.8811C85.1124 16.5017 85.4751 16.0359 85.7512 15.5196C86.0106 15.0201 86.1834 14.451 86.2867 13.8459L86.3203 13.6393L83.5252 13.1903L83.5228 13.1927ZM78.8834 7.7777C79.3325 7.43191 79.9016 7.27823 80.5571 7.27823C81.1262 7.27823 81.6449 7.41511 82.0748 7.69126C82.507 7.96741 82.8336 8.39725 83.0233 8.94955C83.1265 9.2257 83.1962 9.55229 83.2298 9.89808L77.5723 9.95091C77.6419 9.69156 77.7116 9.45143 77.7956 9.2257C78.055 8.60376 78.4151 8.10428 78.881 7.7777H78.8834Z" fill={current.accent} />
                    </svg>
                  </div>
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40">
                    <div 
                      className="w-4 h-4" 
                      style={{ 
                        backgroundColor: current.accent,
                        maskImage: 'url(/amptivelogo.svg)',
                        maskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        maskPosition: 'center',
                        WebkitMaskImage: 'url(/amptivelogo.svg)',
                        WebkitMaskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center'
                      }} 
                    />
                  </div>
                </div>

                {/* Content Section */}
                {current.variant === 'mindful' ? (
                  <>
                    <div className="flex-1 flex flex-col items-center justify-center px-8 pt-3 md:pt-4 pb-2 md:pb-3 space-y-3 md:space-y-5 relative z-10">
                      {/* Centered Avatar with Username Pill */}
                      <div className="relative w-20 h-20 md:w-28 md:h-28">
                        <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl" />
                        <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl border-[6px] border-white">
                          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border border-white text-[9px] font-black uppercase tracking-widest bg-[#064E3B] text-white whitespace-nowrap">
                          {username}
                        </div>
                      </div>

                      {/* QR Code with Center Branded Logo & Subtitle */}
                      <div className="flex flex-col items-center gap-2 md:gap-3">
                        <motion.div
                          className="relative"
                          initial={qrPopOutInitial}
                          animate={qrPopOutAnimate}
                          transition={qrPopOutTransition}
                          style={qrPopOutStyle}
                        >
                          <QRCodeSVG 
                            value={`https://getamptive.com/${username}`}
                            size={200}
                            level="H"
                            bgColor="#E2F4E9"
                            fgColor="#064E3B"
                            className="w-32 h-32 md:w-48 md:h-48 rounded-lg relative z-10" 
                          />
                          {/* Center Logo Overlay in WhatsApp Style */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#E2F4E9] flex items-center justify-center shadow-sm">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-[#064E3B] bg-[#E2F4E9] flex items-center justify-center">
                                <div 
                                  className="w-5 h-5 md:w-6 md:h-6" 
                                  style={{ 
                                    backgroundColor: '#064E3B',
                                    maskImage: 'url(/amptivelogo.svg)',
                                    maskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    maskPosition: 'center',
                                    WebkitMaskImage: 'url(/amptivelogo.svg)',
                                    WebkitMaskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center'
                                  }} 
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                        <p className="text-xs md:text-sm font-medium" style={{ color: current.accent }}>
                          {profileType === 'business' ? 'Scan to Tip My Business' : profileType === 'creator' ? 'Scan to Tip Creator' : profileType === 'organizer' ? 'Scan to Support My Event' : 'Scan to Support'}
                        </p>
                      </div>
                    </div>

                    {/* Footer Section for Mindful */}
                    <div className="px-8 pt-1 md:pt-2 pb-6 md:pb-8 relative z-20">
                      <div className="flex flex-col items-center gap-2">
                        <span 
                          className="text-[10px] md:text-xs font-semibold opacity-60" 
                          style={{ color: current.accent }}
                        >
                          Generate your own Tip Card at
                        </span>
                        <a 
                          href="https://getamptive.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-1.5 rounded-full text-xs md:text-sm font-bold tracking-tight transition-all duration-200 hover:scale-105 active:scale-95 inline-block"
                          style={{ 
                            color: current.accent,
                            backgroundColor: getRgba(current.accent, 0.06),
                            border: `1px solid ${getRgba(current.accent, 0.12)}`,
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)'
                          }}
                        >
                          getamptive.com
                        </a>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Business Variant - Centered Layout */
                  <>
                    <div className="flex-1 flex flex-col items-center justify-center px-8 pt-3 md:pt-4 pb-2 md:pb-3 space-y-3 md:space-y-5 relative z-10">
                      <div className="relative w-24 h-24 md:w-36 md:h-36">
                        <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl" />
                        <div 
                          className="relative w-full h-full rounded-full overflow-hidden shadow-2xl border-[6px]"
                          style={{ borderColor: current.accent }}
                        >
                          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border border-white text-[9px] font-black uppercase tracking-widest bg-[#312E81] text-white whitespace-nowrap">
                          {username}
                        </div>
                      </div>

                      {/* QR Code in place of bio text with Subtitle */}
                      <div className="flex flex-col items-center gap-2 md:gap-3">
                        <motion.div
                          className="relative"
                          initial={qrPopOutInitial}
                          animate={qrPopOutAnimate}
                          transition={qrPopOutTransition}
                          style={qrPopOutStyle}
                        >
                          <QRCodeSVG 
                            value={`https://getamptive.com/${username}`}
                            size={200}
                            level="H"
                            bgColor="#DEE2FD"
                            fgColor="#312E81"
                            className="w-32 h-32 md:w-40 md:h-40 rounded-lg relative z-10" 
                          />
                          {/* Center Logo Overlay in WhatsApp Style */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#DEE2FD] flex items-center justify-center shadow-sm">
                              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-[#312E81] bg-[#DEE2FD] flex items-center justify-center">
                                <div 
                                  className="w-4 h-4 md:w-5 md:h-5" 
                                  style={{ 
                                    backgroundColor: '#312E81',
                                    maskImage: 'url(/amptivelogo.svg)',
                                    maskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    maskPosition: 'center',
                                    WebkitMaskImage: 'url(/amptivelogo.svg)',
                                    WebkitMaskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center'
                                  }} 
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                        <p className="text-xs md:text-sm font-medium" style={{ color: current.accent }}>
                          {profileType === 'business' ? 'Scan to Tip My Business' : profileType === 'creator' ? 'Scan to Tip Creator' : profileType === 'organizer' ? 'Scan to Support My Event' : 'Scan to Support'}
                        </p>
                      </div>
                    </div>

                    {/* Footer Section for Business */}
                    <div className="px-8 pt-1 md:pt-2 pb-6 md:pb-8 relative z-20">
                      <div className="flex flex-col items-center gap-2">
                        <span 
                          className="text-[10px] md:text-xs font-semibold opacity-60" 
                          style={{ color: current.accent }}
                        >
                          Generate your own Tip Card at
                        </span>
                        <a 
                          href="https://getamptive.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-1.5 rounded-full text-xs md:text-sm font-bold tracking-tight transition-all duration-200 hover:scale-105 active:scale-95 inline-block"
                          style={{ 
                            color: current.accent,
                            backgroundColor: getRgba(current.accent, current.accent === '#FFFFFF' ? 0.12 : 0.06),
                            border: `1px solid ${getRgba(current.accent, current.accent === '#FFFFFF' ? 0.2 : 0.12)}`,
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)'
                          }}
                        >
                          getamptive.com
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {!isDisplayOnly && (
        <div className="flex justify-center gap-2 mt-8">
          {cardStyles.map((_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${activeCard === i ? 'w-6 bg-black' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SupportCard;
