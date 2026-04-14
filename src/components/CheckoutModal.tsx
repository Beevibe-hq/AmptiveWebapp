import { useState, useEffect } from 'react';
import { Loader2, Minus, Plus, X, CheckCircle2, Ticket } from 'lucide-react';
import { createPurchase } from '@/lib/api/purchases';

type EventTicket = {
    id: string;
    label: string;
    price: number;
    currency?: string | null;
    quantity?: number | null;
    color_theme?: string | null;
};

type CheckoutModalProps = {
    isOpen: boolean;
    onClose: () => void;
    event: {
        id: string;
        title: string;
        start_time?: string | null;
    };
    tickets: EventTicket[];
    currentUser: { id: string; email?: string; name?: string } | null;
};

type TicketSelection = Record<string, number>;

export default function CheckoutModal({ isOpen, onClose, event, tickets, currentUser }: CheckoutModalProps) {
    const [selection, setSelection] = useState<TicketSelection>({});
    const [totalAmount, setTotalAmount] = useState(0);
    const [step, setStep] = useState<'selection' | 'processing' | 'success'>('selection');
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelection({});
            setTotalAmount(0);
            setStep('selection');
            setError(null);
        }
    }, [isOpen]);

    // Calculate total price effect
    useEffect(() => {
        let total = 0;
        tickets.forEach(ticket => {
            const qty = selection[ticket.id] || 0;
            total += (ticket.price || 0) * qty;
        });
        setTotalAmount(total);
    }, [selection, tickets]);

    const updateQuantity = (ticketId: string, delta: number) => {
        if (delta < 0 && (!selection[ticketId] || selection[ticketId] <= 0)) return;

        setSelection(prev => {
            const current = prev[ticketId] || 0;
            const next = current + delta;
            if (next <= 0) {
                const { [ticketId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [ticketId]: next };
        });
    };

    const hasSelection = Object.keys(selection).length > 0;

    const generateTicketId = (eventId: string, ticketTypeId: string) => {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `TKT-${eventId.substring(0, 4)}-${random}`;
    };

    const handleSimulatedPayment = async () => {
        if (!currentUser) {
            // In a real app, we'd redirect to login or allow guest checkout
            setError("You must be logged in to purchase tickets.");
            return;
        }

        setStep('processing');
        setError(null);

        try {
            // 1. Simulate Network Delay (2 seconds)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 2. Prepare Database Records
            const purchases = [];
            const timestamp = new Date().toISOString();

            for (const [ticketId, qty] of Object.entries(selection)) {
                const ticketType = tickets.find(t => t.id === ticketId);
                if (!ticketType) continue;

                for (let i = 0; i < qty; i++) {
                    const uniqueTicketId = generateTicketId(event.id, ticketId);

                    purchases.push({
                        ticket_id: uniqueTicketId,
                        event_id: event.id,
                        ticket_type_id: ticketId,
                        buyer_id: currentUser.id,
                        buyer_name: currentUser.name || currentUser.email || 'Guest',
                        buyer_email: currentUser.email || 'guest@example.com',
                        purchase_date: timestamp,
                        ticket_status: 'valid',
                        qr_code_data: JSON.stringify({
                            t: uniqueTicketId,
                            e: event.id,
                            u: currentUser.id,
                            s: 'valid'
                        }),
                        metadata: {
                            simulated: true,
                            price_paid: ticketType.price,
                            currency: ticketType.currency || 'NGN'
                        }
                    });
                }
            }

            // 3. Insert into Database using API
            const result = await createPurchase(purchases);
            if (!result.ok) throw new Error(result.error);

            // 4. Success!
            setStep('success');

        } catch (err: any) {
            console.error('Payment failed:', err);
            setError(err.message || "Payment simulation failed. Please try again.");
            setStep('selection');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-5">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Get Tickets</h2>
                        <p className="text-sm text-gray-500 truncate mt-1 max-w-[280px]">{event.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 'processing' ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-black" />
                            <p className="text-lg font-medium text-gray-600">Processing Payment...</p>
                            <p className="text-sm text-gray-400">Secure simulated transaction</p>
                        </div>
                    ) : step === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center animate-in zoom-in-50 duration-500">
                            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">You're going! 🎉</h3>
                                <p className="text-gray-500">
                                    Your tickets have been sent to <span className="font-semibold text-gray-900">{currentUser?.email}</span>
                                </p>
                            </div>

                            <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                                        <Ticket className="h-6 w-6 text-black" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">{Object.values(selection).reduce((a, b) => a + b, 0)} Ticket(s)</p>
                                        <p className="text-xs text-gray-500">See you on {event.start_time ? new Date(event.start_time).toLocaleDateString() : 'event day'}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={onClose} // Or redirect to my tickets
                                className="w-full rounded-full bg-black py-4 font-bold text-white hover:bg-gray-800 transition-colors"
                            >
                                View My Tickets
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Selection Step */}
                            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 -mr-2">
                                {tickets.map(ticket => (
                                    <div key={ticket.id} className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 hover:border-gray-200 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-gray-900">{ticket.label}</h3>
                                                {ticket.quantity && ticket.quantity < 20 && (
                                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                        Only {ticket.quantity} left
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-lg text-gray-500">
                                                {ticket.price === 0 ? 'Free' : new Intl.NumberFormat(undefined, {
                                                    style: 'currency',
                                                    currency: ticket.currency || 'NGN'
                                                }).format(ticket.price)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 bg-white rounded-full border border-gray-200 p-1 shadow-sm">
                                            <button
                                                onClick={() => updateQuantity(ticket.id, -1)}
                                                disabled={!selection[ticket.id]}
                                                className="h-8 w-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </button>
                                            <span className="w-4 text-center font-bold text-gray-900 tabular-nums">
                                                {selection[ticket.id] || 0}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(ticket.id, 1)}
                                                // disabled={ticket.quantity && (selection[ticket.id] || 0) >= ticket.quantity} // TODO: Add logic
                                                className="h-8 w-8 flex items-center justify-center rounded-full text-black hover:bg-gray-100 transition-colors"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Summary & Pay Button */}
                            <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span className="font-medium text-gray-900">
                                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN' }).format(totalAmount)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Fees</span>
                                    <span className="font-medium text-gray-900">
                                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN' }).format(0)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xl font-bold pt-2">
                                    <span className="text-gray-900">Total</span>
                                    <span className="text-black">
                                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN' }).format(totalAmount)}
                                    </span>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium text-center">
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleSimulatedPayment}
                                    disabled={!hasSelection}
                                    className="w-full rounded-full bg-black py-4 font-bold text-white transition-all hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-black/10"
                                >
                                    Pay {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN' }).format(totalAmount)}
                                </button>
                                <p className="text-center text-xs text-gray-400">
                                    This is a simulated payment. No real money will be charged.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
