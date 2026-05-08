import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Mail, Ticket, ChevronDown } from 'lucide-react';

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

export default function PurchaseConfirmed() {
    const navigate = useNavigate();
    const [purchase, setPurchase] = useState<StoredPurchase | null>(null);

    useEffect(() => {
        const raw = sessionStorage.getItem('guest-purchase');
        if (raw) {
            try {
                setPurchase(JSON.parse(raw));
            } catch {
                // ignore
            }
        }
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
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="space-y-4 max-w-md">
                    <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                        <Ticket className="h-10 w-10 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">No Purchase Found</h2>
                    <p className="text-gray-500">
                        We couldn't find your purchase details. Check your email for confirmation.
                    </p>
                    <button
                        onClick={() => navigate('/', { replace: true })}
                        className="mt-4 px-6 py-3 rounded-full bg-black text-white font-medium hover:bg-gray-800 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const totalTickets = purchase.tickets.reduce((sum, t) => sum + t.quantity, 0);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="space-y-8 max-w-lg w-full">
                <div>
                    <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900">Purchase Confirmed!</h2>
                    <p className="text-gray-500 font-medium leading-relaxed mt-2">
                        Your tickets have been sent to <span className="font-semibold text-gray-900">{purchase.buyer_email}</span>
                    </p>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden text-left">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">{purchase.event_title}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {purchase.tickets.map((t, i) => (
                            <div key={i} className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{t.label}</p>
                                    <p className="text-xs text-gray-500">x{t.quantity}</p>
                                </div>
                                <span className="font-bold text-gray-900">{formatPrice(t.price * t.quantity)}</span>
                            </div>
                        ))}
                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-lg font-black text-gray-900">Total</span>
                            <span className="text-2xl font-black text-gray-900">{formatPrice(purchase.total_amount)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4 text-left">
                    <Mail className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-blue-900">Check Your Email</p>
                        <p className="text-xs text-blue-700/80 leading-relaxed mt-1">
                            Your digital tickets have been delivered to <strong>{purchase.buyer_email}</strong>. If you don't see them within a few minutes, check your spam folder.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button
                        onClick={() => {
                            sessionStorage.removeItem('guest-purchase');
                            navigate(`/events/${purchase.event_id}`);
                        }}
                        className="flex-1 px-8 py-3 rounded-full border border-gray-200 font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <ChevronDown className="rotate-90 w-4 h-4" />
                        Back to Event
                    </button>
                    <button
                        onClick={() => {
                            sessionStorage.removeItem('guest-purchase');
                            navigate('/', { replace: true });
                        }}
                        className="flex-1 px-8 py-3 rounded-full bg-black text-white font-bold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                    >
                        <Ticket className="w-4 h-4" />
                        Browse Events
                    </button>
                </div>
            </div>
        </div>
    );
}
