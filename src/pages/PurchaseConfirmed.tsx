import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Ticket, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useAuth } from '@/contexts/AuthContext';

interface StoredPurchase {
    purchase: {
        status: string;
        amount: number;
    };
    buyer_email: string;
    buyer_name: string;
    buyer_phone: string;
    event_id: string;
    event_title: string;
    tickets: Array<{ label: string; quantity: number; price: number }>;
    total_amount: number;
}

const ZigZagEdge = () => (
    <svg width="100%" height="10" xmlns="http://www.w3.org/2000/svg" className="block relative z-10">
        <defs>
            <pattern id="zigzag" x="0" y="0" width="12" height="10" patternUnits="userSpaceOnUse">
                <polygon points="0,0 6,10 12,0" fill="white" />
            </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="10" fill="url(#zigzag)" />
    </svg>
);

export default function PurchaseConfirmed() {
    const navigate = useNavigate();
    const [purchase, setPurchase] = useState<StoredPurchase | null>(null);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [showConfetti, setShowConfetti] = useState(true);
    const [animationStage, setAnimationStage] = useState<'success' | 'receipt'>('success');
    const { user } = useAuth();

    useEffect(() => {
        const raw = sessionStorage.getItem('guest-purchase');
        if (raw) {
            try {
                setPurchase(JSON.parse(raw));
            } catch {
                // ignore
            }
        }

        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        
        // Stop confetti after 5 seconds
        const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);
        
        // Transition to receipt after 2.2 seconds
        const stageTimer = setTimeout(() => setAnimationStage('receipt'), 2200);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(confettiTimer);
            clearTimeout(stageTimer);
        };
    }, []);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            maximumFractionDigits: 0
        }).format(price);
    };

    if (!purchase) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6 max-w-md bg-white p-10 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100"
                >
                    <div className="h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto border-8 border-white shadow-sm">
                        <Ticket className="h-10 w-10 text-gray-300" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Purchase Found</h2>
                        <p className="text-gray-500">
                            We couldn't find your purchase details. Check your email for confirmation.
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/', { replace: true })}
                        className="w-full px-6 py-4 rounded-xl bg-gray-900 text-white font-medium hover:bg-black transition-colors shadow-lg shadow-gray-900/20"
                    >
                        Return Home
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden font-sans">
            <Confetti 
                width={windowSize.width} 
                height={windowSize.height} 
                recycle={showConfetti} 
                numberOfPieces={250}
                colors={['#4ade80', '#22c55e', '#16a34a', '#86efac', '#10b981', '#34d399']}
                gravity={0.15}
                style={{ zIndex: 100 }}
            />

            <div className="flex flex-col items-center z-10 w-full max-w-md min-h-[400px] justify-center">
                <AnimatePresence mode="wait">
                    {animationStage === 'success' ? (
                        <motion.div 
                            key="success-header"
                            initial={{ opacity: 0, scale: 0.9, filter: 'blur(5px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -30, scale: 1.05, filter: 'blur(5px)' }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="flex flex-col items-center py-10"
                        >
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 12, stiffness: 150, delay: 0.1 }}
                                className="h-[96px] w-[96px] bg-[#48d28a] rounded-full flex items-center justify-center mb-8 shadow-xl shadow-[#48d28a]/20"
                            >
                                <motion.svg 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth={4}
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="h-14 w-14 text-white"
                                >
                                    <motion.path
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                                        d="M4 12L9 17L20 6"
                                    />
                                </motion.svg>
                            </motion.div>
                            
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Purchase Confirmed</h2>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="receipt-content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full flex flex-col items-center"
                        >
                            {/* Receipt Slot & Receipt Container */}
                            <div className="relative w-full max-w-sm mx-auto">
                                
                                {/* The Slot (Foreground overlay that hides the top of the receipt) */}
                                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#e5e5e5] to-[#f4f4f4] rounded-t-lg z-30 shadow-inner" style={{ transform: 'scaleX(1.03)', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', borderBottom: '1px solid #d4d4d4' }}></div>
                                <div className="absolute top-4 left-0 right-0 h-4 bg-gradient-to-b from-[rgba(0,0,0,0.06)] to-transparent z-30 pointer-events-none" style={{ transform: 'scaleX(1.03)' }}></div>

                                {/* Clipping Container so it doesn't render above the slot */}
                                <div className="relative z-10" style={{ clipPath: 'inset(16px -50px -50px -50px)' }}>
                                    {/* The Receipt */}
                                    <motion.div
                                        initial={{ y: "-100%", opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ 
                                            type: "spring", 
                                            damping: 17, 
                                            stiffness: 90, 
                                            delay: 0.15 
                                        }}
                                        style={{ filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.06))' }}
                                        className="pt-4"
                                    >
                                        <div className="bg-white px-6 pb-6 pt-8 rounded-b-none border-x border-gray-100">
                                            {/* Total Amount */}
                                        <div className="text-center mb-8">
                                            <h3 className="text-4xl font-bold text-gray-900 tracking-tight">
                                                {formatPrice(purchase.total_amount)}
                                            </h3>
                                        </div>

                                        {/* Dotted Divider */}
                                        <div className="border-b-[1.5px] border-dashed border-gray-200 mb-6 w-full"></div>

                                        {/* Receipt Details */}
                                        <div className="flex flex-col gap-6 w-full text-left">
                                            {/* Event Title */}
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-gray-500 mb-1">Event</p>
                                                <p className="text-xl font-bold text-gray-900 leading-tight">{purchase.event_title}</p>
                                            </div>
                                        </div>

                                        {/* Claim Instructions */}
                                        <div className="mt-8">
                                            <div className="w-full py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-center flex items-center justify-center gap-2 text-gray-500">
                                                <Mail className="h-4 w-4" />
                                                <span className="text-sm font-bold">Check email for tickets</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Zigzag bottom edge */}
                                    <ZigZagEdge />
                                </motion.div>
                                </div>
                            </div>

                            {/* Actions */}
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                className="mt-12 w-full max-w-sm px-4 sm:px-0"
                            >
                                <button
                                    onClick={() => {
                                        sessionStorage.removeItem('guest-purchase');
                                        if (user) {
                                            navigate('/my-tickets');
                                        } else {
                                            navigate('/', { replace: true });
                                        }
                                    }}
                                    className="w-full py-4 px-6 rounded-full bg-black text-white font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95"
                                >
                                    {user ? (
                                        <>
                                            View Tickets
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    ) : (
                                        <>
                                            <ArrowLeft className="w-4 h-4" />
                                            Back to Homepage
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
