import { useEffect, useState } from 'react'; // Refined Support Me Journey
import { useNavigate } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { getProfileById, upsertProfile, ProfileRow } from '@/lib/supabase/profiles';
import { toastError, toastSuccess } from '@/lib/ui/toast';
import { ArrowLeft, Check, Heart, Loader2, Save, Sparkles, Wallet, Gift, ArrowRight, Users, Store, Building2, Brush, Calendar, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import SupportCard from '@/components/SupportCard';

interface CharacterProgressProps {
    current: number;
    max: number;
}

function CharacterProgress({ current, max }: CharacterProgressProps) {
    const percentage = Math.min((current / max) * 100, 100);
    const radius = 10;
    const strokeWidth = 3;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    const isApproaching = current >= max - (max === 30 ? 5 : max === 60 ? 10 : 30);
    const strokeColor = isApproaching ? 'stroke-red-500' : 'stroke-blue-600';
    const trackColor = 'stroke-black/10';

    return (
        <div className="relative flex items-center justify-center w-7 h-7 group/circle select-none">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 24 24">
                <circle
                    className={trackColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx="12"
                    cy="12"
                />
                <circle
                    className={`${strokeColor} transition-all duration-300 ease-out`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx="12"
                    cy="12"
                />
            </svg>
            <div className="absolute opacity-0 pointer-events-none group-hover/circle:opacity-100 transition-opacity duration-200 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg -top-9 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-50">
                {current} / {max}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
            </div>
        </div>
    );
}


const MOCK_CARDS = [
    {
        name: "Sarah Jenkins",
        username: "sarahj",
        avatarUrl: "https://gjkvrllwtjktcarnikus.supabase.co/storage/v1/object/public/avatars/avatars/5f395bf7-ca2d-44a4-8203-519e9a933d3d-0.7536191962551382.jpg",
        message: "Support my next creative video project!",
        profileType: "creator" as const,
        variant: 0,
        bgColor: "#FAFAF9" // stone-50
    },
    {
        name: "Lumina Cafe",
        username: "luminacafe",
        avatarUrl: "https://gjkvrllwtjktcarnikus.supabase.co/storage/v1/object/public/avatars/avatars/5f395bf7-ca2d-44a4-8203-519e9a933d3d-0.7536191962551382.jpg",
        message: "Buy us a coffee to keep the espresso flowing!",
        profileType: "business" as const,
        variant: 1,
        bgColor: "#F8FAFC" // slate-50
    },
    {
        name: "Tech Meetup",
        username: "techmeetup",
        avatarUrl: "https://gjkvrllwtjktcarnikus.supabase.co/storage/v1/object/public/avatars/avatars/5f395bf7-ca2d-44a4-8203-519e9a933d3d-0.7536191962551382.jpg",
        message: "Help fund our next community tech event!",
        profileType: "organizer" as const,
        variant: 2,
        bgColor: "#F1F5F9" // slate-100
    },
    {
        name: "Mia's Bakery",
        username: "miasbakery",
        avatarUrl: "https://gjkvrllwtjktcarnikus.supabase.co/storage/v1/object/public/avatars/avatars/5f395bf7-ca2d-44a4-8203-519e9a933d3d-0.7536191962551382.jpg",
        message: "A little tip for a lot of sweetness!",
        profileType: "business" as const,
        variant: 3,
        bgColor: "#FFF1F2" // rose-50
    },
    {
        name: "Dev Tutorials",
        username: "devtutorials",
        avatarUrl: "https://gjkvrllwtjktcarnikus.supabase.co/storage/v1/object/public/avatars/avatars/5f395bf7-ca2d-44a4-8203-519e9a933d3d-0.7536191962551382.jpg",
        message: "Support free coding education!",
        profileType: "creator" as const,
        variant: 4,
        bgColor: "#F0F9FF" // sky-50
    },
    {
        name: "Indie Game Fest",
        username: "indiefest",
        avatarUrl: "https://gjkvrllwtjktcarnikus.supabase.co/storage/v1/object/public/avatars/avatars/5f395bf7-ca2d-44a4-8203-519e9a933d3d-0.7536191962551382.jpg",
        message: "Help us bring more indie games to life!",
        profileType: "organizer" as const,
        variant: 5,
        bgColor: "#F5F3FF" // violet-50
    }
];

function HeroCardAnimation() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isMobile) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % MOCK_CARDS.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [isMobile]);

    // Mobile: infinite horizontal marquee
    if (isMobile) {
        const marqueeCards = [...MOCK_CARDS, ...MOCK_CARDS];
        return (
            <div className="relative w-full h-full flex items-center overflow-hidden p-0">
                <motion.div
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{ 
                        duration: 35, 
                        ease: "linear", 
                        repeat: Infinity 
                    }}
                    className="flex flex-row gap-4 items-center"
                    style={{ width: "max-content" }}
                >
                    {marqueeCards.map((card, idx) => (
                        <div 
                            key={`${card.username}-${idx}`} 
                            className="w-[260px] shrink-0 pointer-events-none flex items-center justify-center"
                        >
                            <div className="min-w-[300px] w-[300px] scale-[0.85] origin-center">
                                <SupportCard
                                    name={card.name}
                                    username={card.username}
                                    avatarUrl={card.avatarUrl}
                                    message={card.message}
                                    profileType={card.profileType}
                                    variant={card.variant}
                                    isDisplayOnly={true}
                                    is3DAnim={false}
                                />
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        );
    }

    // Desktop: rotate through cards one at a time
    const card = MOCK_CARDS[index];

    return (
        <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden p-4 bg-[radial-gradient(circle_at_50%_34%,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.34)_24%,transparent_52%),linear-gradient(180deg,#d9e8ec_0%,#edf2f1_56%,#f7f4ee_100%)] before:content-[''] before:absolute before:left-[-18%] before:top-[4%] before:h-28 before:w-96 before:rounded-full before:bg-white/42 before:blur-2xl after:content-[''] after:absolute after:right-[-16%] after:top-[28%] after:h-32 after:w-96 after:rounded-full after:bg-white/36 after:blur-2xl"
            style={{ perspective: 1200 }}
        >
            <div className="pointer-events-none absolute left-[10%] top-[18%] h-20 w-72 rounded-full bg-white/28 blur-2xl" />
            <div className="pointer-events-none absolute left-[38%] bottom-[22%] h-28 w-96 rounded-full bg-white/24 blur-2xl" />
            <motion.div
                className="pointer-events-none absolute left-[-18%] top-[18%] z-0 flex items-center gap-5 opacity-45"
                animate={{ x: ["0%", "760%"], y: [0, -10, 4, -6] }}
                transition={{ duration: 13, ease: "linear", repeat: Infinity }}
            >
                <span className="block h-2 w-5 rounded-t-full border-t-2 border-slate-500/70" />
                <span className="mt-5 block h-1.5 w-4 rounded-t-full border-t-2 border-slate-500/55" />
                <span className="-mt-3 block h-2 w-6 rounded-t-full border-t-2 border-slate-500/60" />
            </motion.div>
            <motion.div
                className="pointer-events-none absolute left-[-22%] top-[31%] z-0 flex items-center gap-4 opacity-35"
                animate={{ x: ["0%", "820%"], y: [0, 8, -4, 2] }}
                transition={{ duration: 17, delay: 4, ease: "linear", repeat: Infinity }}
            >
                <span className="block h-1.5 w-4 rounded-t-full border-t-2 border-slate-500/55" />
                <span className="-mt-2 block h-2 w-5 rounded-t-full border-t-2 border-slate-500/60" />
            </motion.div>
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 110, rotateY: -8, rotateX: 12, scale: 0.86 }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        rotateY: [-8, -15, 6, -8],
                        rotateX: [12, 6, 2, 4],
                        rotateZ: [0, -4, 3, 0],
                        scale: 1,
                    }}
                    exit={{
                        opacity: 0,
                        rotateY: -18,
                        rotateX: 8,
                        scaleX: 0.94,
                        scaleY: 1.14,
                        y: 38,
                        filter: "blur(12px)",
                    }}
                    transition={{
                        opacity: { duration: 0.24, ease: "easeOut" },
                        y: { type: "spring", stiffness: 260, damping: 22, mass: 0.9 },
                        rotateX: { duration: 0.72, ease: "easeOut" },
                        rotateY: { duration: 0.72, ease: "easeOut" },
                        rotateZ: { duration: 0.72, ease: "easeOut" },
                        scale: { type: "spring", stiffness: 240, damping: 22 },
                        filter: { duration: 0.5, ease: "easeInOut" },
                    }}
                    className="relative z-10"
                    style={{ transformStyle: "preserve-3d" }}
                >
                    <div className="w-[420px] scale-[0.8] origin-center">
                    <SupportCard
                        name={card.name}
                        username={card.username}
                        avatarUrl={card.avatarUrl}
                        message={card.message}
                        profileType={card.profileType}
                        variant={card.variant}
                        isDisplayOnly={true}
                        is3DAnim={true}
                    />
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

type Step = 'welcome' | 'selection' | 'settings' | 'preview';

export default function SupportSetup() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [step, setStep] = useState<Step>('welcome');
    const [profileType, setProfileType] = useState<'creator' | 'business' | 'organizer' | null>(null);
    const [isLinkCopied, setIsLinkCopied] = useState(false);

    // Support State
    const [supportEnabled, setSupportEnabled] = useState(false);
    const [supportMessage, setSupportMessage] = useState('');
    const [supportButtonText, setSupportButtonText] = useState('Support Me');
    const [supportAmounts, setSupportAmounts] = useState<number[]>([500, 1000, 2000, 5000]);
    const [supportCardVariant, setSupportCardVariant] = useState(0);
    const [flutterwaveSubaccountId, setFlutterwaveSubaccountId] = useState('');
    const [socials, setSocials] = useState<{ x?: string; instagram?: string; youtube?: string; website?: string }>({});
    const handleSelectType = (type: 'creator' | 'business' | 'organizer') => {
        setProfileType(type);
        if (type === 'business') {
            setSupportButtonText('Support Our Business');
            setSupportMessage('Help our local business thrive.');
            setSupportAmounts([2000, 5000, 10000, 25000]);
        } else if (type === 'organizer') {
            setSupportButtonText('Support My Event');
            setSupportMessage('Support our events and help us bring people together.');
            setSupportAmounts([1000, 2500, 5000, 10000]);
        } else {
            setSupportButtonText('Support Me');
            setSupportMessage("I'm a content creator");
            setSupportAmounts([500, 1000, 2000, 5000]);
        }
        setStep('settings');
    };
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [existingProfile, setExistingProfile] = useState<ProfileRow | null>(null);

    const supabase = createClient();

    // Auth Check & Data Fetch
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setUser(null);
                setInitialLoading(false);
                setLoading(false);
                return;
            }
            setUser(user);

            // Load Profile
            try {
                const profile = await getProfileById(user.id);
                if (profile) {
                    setSupportEnabled(profile.support_enabled ?? false);
                    setSupportMessage(profile.support_message || profile.support_tagline || '');
                    setSupportButtonText(profile.support_button_text || 'Support Me');
                    setSupportAmounts(profile.support_amounts || [500, 1000, 2000, 5000]);
                    setSupportCardVariant(profile.support_card_variant || 0);
                    setFlutterwaveSubaccountId(profile.flutterwave_subaccount_id || '');
                    setProfileType(profile.profile_type || null);
                    setAvatarUrl(profile.avatar_url || null);
                    setExistingProfile(profile);
                    setSocials(profile.support_socials || {});

                    // If already enabled, skip onboarding
                    if (profile.support_enabled) {
                        setStep('settings');
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error);
                toastError('Failed to load support settings.');
            } finally {
                setInitialLoading(false);
                setLoading(false);
            }
        };
        checkAuth();
    }, [navigate]);

    const handleAmountChange = (index: number, value: string) => {
        const numericString = value.replace(/\D/g, '');
        const numValue = parseInt(numericString) || 0;
        const newAmounts = [...supportAmounts];
        newAmounts[index] = numValue;
        setSupportAmounts(newAmounts);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user) return;
        setSaving(true);

        try {
            const updates: ProfileRow = {
                ...existingProfile,
                user_id: user.id,
                email: user.email || existingProfile?.email || '', // Ensure email is never null
                support_enabled: supportEnabled,
                support_message: supportMessage,
                support_tagline: supportMessage,
                support_button_text: supportButtonText,
                support_amounts: supportAmounts,
                support_card_variant: supportCardVariant,
                flutterwave_subaccount_id: flutterwaveSubaccountId,
                profile_type: profileType,
                support_socials: socials,
                updated_at: new Date().toISOString(),
            };

            const { ok, error } = await upsertProfile(updates);
            if (!ok) throw new Error(error || 'Failed to update support settings');

            toastSuccess('Support settings updated successfully!');

            // Instead of navigating immediately, show the sophisticated preview
            if (supportEnabled) {
                setStep('preview');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                navigate(`/profile/${user.id}`);
            }
        } catch (error: any) {
            console.error('Error saving support settings:', error);
            toastError(error.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const handleEnableSupport = () => {
        if (!user) {
            navigate('/login?redirect=/profile/support-setup');
            return;
        }
        setSupportEnabled(true);
        setStep('selection');
    };

    const getSupportLinkUrl = () => {
        const base = existingProfile?.username || user?.id || '';
        if (profileType === 'business') return `https://supportmybusiness.getamptive.com/${base}`;
        if (profileType === 'organizer') return `https://supportmyevents.getamptive.com/${base}`;
        return `https://supportmywork.getamptive.com/${base}`;
    };

    if (initialLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#FBFBFB]">

            <div className="container relative z-10 mx-auto px-4 py-8 pt-24 min-h-screen flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {step === 'welcome' ? (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, x: -100 }}
                            className="w-full max-w-7xl flex flex-col md:flex-row items-center gap-12 md:gap-20 pt-4 pb-12 md:py-20"
                        >
                            {/* Left Column: Media */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, x: -30 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full md:w-[45%]"
                            >
                                <div className="relative group">
                                    {/* Hide glow container on mobile */}
                                    <div className="hidden md:block absolute -inset-4 bg-blue-500/5 rounded-[2.5rem] blur-2xl group-hover:bg-blue-500/10 transition-all duration-700" />
                                    {/* Remove border, shadow, and overflow on mobile, and break out to screen edges */}
                                    <div className="relative h-[420px] md:h-auto w-screen left-1/2 -translate-x-1/2 md:static md:w-auto md:translate-x-0 md:aspect-square md:overflow-hidden md:rounded-[2rem] md:border md:border-gray-200 shadow-none md:max-w-none">
                                        <HeroCardAnimation />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Right Column: Content */}
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full md:w-[55%] text-center md:text-left space-y-6 md:space-y-8 flex flex-col items-center md:items-start"
                            >
                                <div className="space-y-4">
                                    <h2 className="text-[36px] md:text-[54px] font-extrabold leading-[1.1] tracking-tight text-[#1e293b] text-center md:text-left">
                                        Accept Tip$ <br /> <span className="text-black">for Events, Work <br /> & Business.</span>
                                    </h2>
                                    <p className="text-xl md:text-2xl text-gray-600 font-medium leading-relaxed max-w-xl text-center md:text-left">
                                        Set up your support profile in seconds.
                                    </p>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleEnableSupport}
                                    className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 rounded-full bg-[#2563EB] text-white hover:bg-[#1d4ed8] transition-all duration-200 group text-sm md:text-base font-semibold"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:rotate-12" aria-hidden="true">
                                        <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875V3H9.375ZM12.75 3v3.75h1.875a1.875 1.875 0 1 0 0-3.75H12.75Z" />
                                        <path fillRule="evenodd" d="M1.5 7.5a1.5 1.5 0 0 1 1.5-1.5h18a1.5 1.5 0 0 1 1.5 1.5v3.75a1.5 1.5 0 0 1-1.5 1.5h-18a1.5 1.5 0 0 1-1.5-1.5V7.5ZM12 6.75a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                        <path fillRule="evenodd" d="M3.75 14.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 .75.75v3.75a3 3 0 0 1-3 3h-9.75a3 3 0 0 1-3-3v-3.75Zm8.25.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                    </svg>
                                    <span>Get started for free</span>
                                </motion.button>

                                <div className="mt-1 text-slate-400 text-xs md:text-sm font-medium tracking-wide text-center md:text-left">
                                    Fast payouts directly to your bank account.
                                </div>
                            </motion.div>
                        </motion.div>
                    ) : step === 'selection' ? (
                        <motion.div
                            key="selection"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                            className="max-w-md w-full mx-auto"
                        >
                            <div className="text-center mb-8">
                                <h1 className="text-center text-[28px] font-bold text-gray-900 tracking-tight leading-tight mb-2">
                                    Which one are you?
                                </h1>
                                <p className="text-center text-sm text-gray-600">This helps us personalize your support experience.</p>
                            </div>

                            <div className="space-y-3">
                                {/* Creator Option */}
                                <button
                                    onClick={() => handleSelectType('creator')}
                                    className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-black transition-all duration-200 text-left group"
                                >
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Brush className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900">I'm a Creator</h3>
                                        <p className="text-xs text-gray-500">Influencers, Designers, Artist etc.</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
                                </button>

                                {/* Business Option */}
                                <button
                                    onClick={() => handleSelectType('business')}
                                    className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-black transition-all duration-200 text-left group"
                                >
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900">I'm a Business</h3>
                                        <p className="text-xs text-gray-500">Shops, brands, organizations.</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
                                </button>

                                {/* Organizer Option */}
                                <button
                                    onClick={() => handleSelectType('organizer')}
                                    className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-black transition-all duration-200 text-left group"
                                >
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900">I'm an Event Organizer</h3>
                                        <p className="text-xs text-gray-500">Birthday, Concerts, Conferences etc.</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
                                </button>
                            </div>

                            <div className="mt-8 text-center px-4">
                                <button
                                    onClick={() => setStep('welcome')}
                                    className="text-xs font-medium text-gray-500 hover:text-black transition-colors underline underline-offset-4"
                                >
                                    Go back to intro
                                </button>
                            </div>
                        </motion.div>
                    ) : step === 'settings' ? (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4 }}
                            className="max-w-4xl w-full mx-auto"
                        >
                            {/* Pluuto-style Header */}
                            <div className="mb-12">
                                <button
                                    onClick={() => setStep('selection')}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-black/40 hover:text-black transition-colors mb-8"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </button>

                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                    <div className="w-20 h-20 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                                        {avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                                                <Heart className="w-8 h-8 fill-current" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[11px] font-semibold text-black/40 mb-1">Configuration</p>
                                            <h1 className="text-4xl font-bold text-gray-900 tracking-tight leading-tight">
                                                Support Settings
                                            </h1>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${supportEnabled
                                                    ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                                    : 'bg-gray-100 text-black/40 border-black/5 shadow-inner'
                                                }`}>
                                                {supportEnabled ? 'Active' : 'Disabled'}
                                            </span>
                                            {profileType && (
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border whitespace-nowrap ${profileType === 'creator'
                                                        ? 'bg-purple-50 text-purple-600 border-purple-100'
                                                        : profileType === 'organizer'
                                                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    {profileType}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-12">
                                {/* Top Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-[24px] border border-black/5 shadow-sm hover:border-black/10 transition-all relative overflow-hidden group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-[11px] font-semibold text-black/40 mb-1">Status</p>
                                                <h3 className="text-lg font-bold text-gray-900">Support Availability</h3>
                                            </div>
                                            <Heart className={`w-5 h-5 ${supportEnabled ? 'text-rose-500 fill-current' : 'text-gray-200'}`} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-3xl font-black text-gray-900 tracking-tight">
                                                {supportEnabled ? 'Active' : 'Offline'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setSupportEnabled(!supportEnabled)}
                                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${supportEnabled ? 'bg-black' : 'bg-gray-100'}`}
                                            >
                                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${supportEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-[24px] border border-black/5 shadow-sm hover:border-black/10 transition-all relative overflow-hidden group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-[11px] font-semibold text-black/40 mb-1">Amounts</p>
                                                <h3 className="text-lg font-bold text-gray-900">Suggested Tiers</h3>
                                            </div>
                                            <Sparkles className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {supportAmounts.map((amt, i) => (
                                                <span key={i} className="px-3 py-1 bg-gray-50 border border-black/5 rounded-full text-sm font-bold text-gray-900">
                                                    ₦{amt.toLocaleString()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Settings List Section */}
                                <div className="space-y-6">
                                    <div className="border-b border-black/5 pb-4">
                                        <h3 className="text-lg font-bold text-gray-900">Customization</h3>
                                        <p className="text-sm text-black/40">How your audience sees and interacts with you.</p>
                                    </div>

                                    <div className="space-y-4 bg-white border border-black/5 rounded-[24px] p-6">
                                        {/* Custom Message Row */}
                                        <div className="flex items-start gap-6 transition-all group">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                                <Gift className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <label className="block text-sm font-bold text-gray-900">Tell us about what you do</label>
                                                </div>
                                                <div className="relative group/input pt-1">
                                                    <textarea
                                                        value={supportMessage}
                                                        maxLength={60}
                                                        onChange={(e) => setSupportMessage(e.target.value)}
                                                        className="w-full bg-transparent border-none outline-none text-[15px] font-medium text-black/60 focus:text-black transition-colors p-0 resize-none min-h-[60px] leading-relaxed"
                                                        placeholder="Write a sweet thank you..."
                                                        rows={2}
                                                    />
                                                    <div className="absolute bottom-0 left-0 w-full h-px bg-black opacity-0 group-focus-within/input:opacity-10 transition-opacity" />
                                                </div>
                                            </div>
                                            <div className="shrink-0 self-end flex items-center justify-center mb-1">
                                                <CharacterProgress current={supportMessage.length} max={60} />
                                            </div>
                                        </div>

                                        {/* Social Presence Section */}
                                        <div className="border-t border-gray-100 pt-6">
                                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">Social Presence</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* X (Twitter) */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-gray-500 ml-1">X (Twitter)</label>
                                                    <div className="relative flex items-center">
                                                        <div className="absolute left-4 text-gray-400">
                                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                                                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.487h2.039L6.486 3.24H4.298l13.311 17.4z"></path>
                                                            </svg>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="twitter.com/..."
                                                            value={socials.x || ''}
                                                            onChange={(e) => setSocials(prev => ({ ...prev, x: e.target.value }))}
                                                            className="w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-xs text-gray-900 font-medium"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Instagram */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-gray-500 ml-1">Instagram</label>
                                                    <div className="relative flex items-center">
                                                        <div className="absolute left-4 text-gray-400">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                                            </svg>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="instagram.com/..."
                                                            value={socials.instagram || ''}
                                                            onChange={(e) => setSocials(prev => ({ ...prev, instagram: e.target.value }))}
                                                            className="w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-xs text-gray-900 font-medium"
                                                        />
                                                    </div>
                                                </div>

                                                {/* YouTube */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-gray-500 ml-1">YouTube</label>
                                                    <div className="relative flex items-center">
                                                        <div className="absolute left-4 text-gray-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-youtube w-3.5 h-3.5">
                                                                <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path>
                                                                <path d="m10 15 5-3-5-3z"></path>
                                                            </svg>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="youtube.com/..."
                                                            value={socials.youtube || ''}
                                                            onChange={(e) => setSocials(prev => ({ ...prev, youtube: e.target.value }))}
                                                            className="w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-xs text-gray-900 font-medium"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Website */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-gray-500 ml-1">Website</label>
                                                    <div className="relative flex items-center">
                                                        <div className="absolute left-4 text-gray-400">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                <circle cx="12" cy="12" r="10"></circle>
                                                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                                            </svg>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="yourwebsite.com"
                                                            value={socials.website || ''}
                                                            onChange={(e) => setSocials(prev => ({ ...prev, website: e.target.value }))}
                                                            className="w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-xs text-gray-900 font-medium"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Support Link Section */}
                                <div className="space-y-6">
                                    <div className="border-b border-black/5 pb-4">
                                        <h3 className="text-lg font-bold text-gray-900">Your Support Link</h3>
                                        <p className="text-sm text-black/40">Share this link with your audience to receive support.</p>
                                    </div>
                                    <div className="bg-white border border-black/5 rounded-[24px] p-6 flex items-center justify-between gap-4 shadow-sm">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Copy Link</p>
                                            <p className="text-sm font-medium text-gray-900 truncate select-all">
                                                {getSupportLinkUrl()}
                                            </p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(getSupportLinkUrl());
                                                setIsLinkCopied(true);
                                                setTimeout(() => setIsLinkCopied(false), 2000);
                                            }}
                                            className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-black hover:border-gray-300 transition-colors shadow-sm shrink-0"
                                            title="Copy Link"
                                        >
                                            <AnimatePresence mode="wait">
                                                {isLinkCopied ? (
                                                    <motion.div
                                                        key="check"
                                                        initial={{ scale: 0.5, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.5, opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                    >
                                                        <Check className="w-5 h-5 text-green-600" />
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="copy"
                                                        initial={{ scale: 0.5, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.5, opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                    >
                                                        <Copy className="w-5 h-5" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </button>
                                    </div>
                                </div>

                                {/* Card Style Selection Section */}
                                <div className="space-y-6">
                                    <div className="border-b border-black/5 pb-4">
                                        <h3 className="text-lg font-bold text-gray-900">Card Design</h3>
                                        <p className="text-sm text-black/40">Choose the visual style for your support card. Click the arrows to preview styles.</p>
                                    </div>
                                    <div className="bg-white pt-12 pb-6 px-4 md:p-8 rounded-[32px] border border-black/5 shadow-sm overflow-hidden">
                                        <div className="max-w-md mx-auto">
                                            <SupportCard
                                                name={existingProfile?.full_name || user?.email?.split('@')[0] || 'Member'}
                                                username={existingProfile?.username || user?.email?.split('@')[0] || 'member'}
                                                avatarUrl={avatarUrl || ''}
                                                message={supportMessage || "Create. Share. Grow. Support. Repeat."}
                                                variant={supportCardVariant}
                                                onVariantChange={setSupportCardVariant}
                                                profileType={profileType}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Amount Editing Section */}
                                <div className="space-y-6">
                                    <div className="border-b border-black/5 pb-4">
                                        <h3 className="text-lg font-bold text-gray-900">Pricing Tiers</h3>
                                        <p className="text-sm text-black/40">Set the default amounts your audience can choose from.</p>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {supportAmounts.map((amount, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-2xl border border-black/5 hover:border-black transition-colors shadow-sm focus-within:ring-2 focus-within:ring-black/5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-black/20 text-xs font-black">₦</span>
                                                    <input
                                                        type="text"
                                                        value={amount ? amount.toLocaleString() : ''}
                                                        onChange={(e) => handleAmountChange(idx, e.target.value)}
                                                        className="w-full bg-transparent border-none outline-none text-[15px] font-black text-gray-900 p-0"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-8 flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-black/5">
                                    <button
                                        type="button"
                                        onClick={() => navigate(-1)}
                                        className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-black/40 hover:text-black transition-colors"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full sm:w-auto h-12 px-10 rounded-full bg-black text-white text-[15px] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Save Preferences
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="w-full max-w-lg mx-auto py-12"
                        >
                            <div className="text-center mb-16 space-y-2">
                                <p className="text-[#2563EB] font-black uppercase tracking-[0.2em] text-xs">Setup Complete</p>
                                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Your Support Page is Ready!</h1>
                            </div>

                            <SupportCard
                                name={existingProfile?.full_name || user?.email?.split('@')[0] || 'Member'}
                                username={existingProfile?.username || user?.email?.split('@')[0] || 'member'}
                                avatarUrl={avatarUrl || ''}
                                message={supportMessage}
                                variant={supportCardVariant}
                                profileType={profileType}
                                isDisplayOnly={true}
                            />

                            <div className="mt-12 text-center space-y-8">
                                <button
                                    onClick={() => navigate(`/support/${existingProfile?.username || user?.id}`)}
                                    className="group relative px-12 py-4 rounded-full bg-black text-white font-bold text-lg overflow-hidden transition-transform hover:scale-[1.05] active:scale-[0.95]"
                                >
                                    <span className="relative z-10 flex items-center gap-3">
                                        Go to My Support Page <ArrowRight className="w-5 h-5" />
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
