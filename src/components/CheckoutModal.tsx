import { useState, useEffect } from 'react';
import { Minus, Plus, X, CheckCircle2, Ticket } from 'lucide-react';
import { checkoutTicket, getTicketEarlyBirdRemaining, getTicketLineTotal, getTicketRemaining, getTicketUnitPrice, getTicketsForEvent, isTicketSoldOut, type CheckoutItem, type Attendee, type CheckoutRequest } from '@/lib/api/tickets';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';

type EventTicket = {
    id: string;
    label: string;
    price: number;
    currency?: string | null;
    quantity?: number | null;
    quantity_total?: number | null;
    quantity_sold?: number;
    quantity_remaining?: number | null;
    color_theme?: string | null;
    is_active?: boolean;
    active?: boolean;
    status?: string | null;
    availability?: string | null;
    sold_out?: boolean;
    is_sold_out?: boolean;
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
    const [buyerEmail, setBuyerEmail] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');

    const isGuest = !currentUser;

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelection({});
            setTotalAmount(0);
            setStep('selection');
            setError(null);
            setBuyerEmail('');
            setBuyerName('');
            setBuyerPhone('');
        }
    }, [isOpen]);

    // Calculate total price effect
    useEffect(() => {
        let total = 0;
        tickets.forEach(ticket => {
            const qty = selection[ticket.id] || 0;
            total += getTicketLineTotal(ticket, qty);
        });
        setTotalAmount(total);
    }, [selection, tickets]);

    useEffect(() => {
        setSelection(prev => {
            let changed = false;
            const nextSelection: TicketSelection = {};

            Object.entries(prev).forEach(([ticketId, qty]) => {
                const ticket = tickets.find(t => t.id === ticketId);
                const remaining = ticket ? getTicketRemaining(ticket) : null;

                if (!ticket || isTicketSoldOut(ticket) || qty <= 0) {
                    changed = true;
                    return;
                }

                const cappedQty = remaining !== null ? Math.min(qty, remaining) : qty;
                if (cappedQty !== qty) changed = true;
                if (cappedQty > 0) nextSelection[ticketId] = cappedQty;
            });

            return changed ? nextSelection : prev;
        });
    }, [tickets]);

    const updateQuantity = (ticketId: string, delta: number) => {
        const ticket = tickets.find(t => t.id === ticketId);
        const remaining = ticket ? getTicketRemaining(ticket) : null;
        if (!ticket || (delta > 0 && isTicketSoldOut(ticket))) return;
        if (delta < 0 && (!selection[ticketId] || selection[ticketId] <= 0)) return;

        setSelection(prev => {
            const current = prev[ticketId] || 0;
            const next = current + delta;
            const cappedNext = remaining !== null ? Math.min(next, remaining) : next;
            if (cappedNext <= 0) {
                const { [ticketId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [ticketId]: cappedNext };
        });
    };

    const hasSelection = Object.keys(selection).length > 0;

    const handleCheckout = async () => {
        if (isGuest && !buyerEmail.trim()) {
            setError("Your email is required for guest checkout.");
            return;
        }

        if (!isGuest && !currentUser?.email) {
            setError("Your account email is required for checkout.");
            return;
        }

        setStep('processing');
        setError(null);

        try {
            const latestTickets = await getTicketsForEvent(event.id);
            const unavailableSelection = Object.entries(selection).find(([ticketId, qty]) => {
                const latestTicket = latestTickets.find(t => t.id === ticketId);
                const remaining = latestTicket ? getTicketRemaining(latestTicket) : null;
                return !latestTicket || isTicketSoldOut(latestTicket) || (remaining !== null && qty > remaining);
            });

            if (unavailableSelection) {
                const [ticketId] = unavailableSelection;
                const latestTicket = latestTickets.find(t => t.id === ticketId);
                setError(`${latestTicket?.label || 'This ticket'} is sold out or no longer has enough tickets available.`);
                setStep('selection');
                return;
            }

            const items: CheckoutItem[] = Object.entries(selection).map(([ticketId, qty]) => ({
                ticket_type_id: ticketId,
                quantity: qty,
            }));
            const ticketPricing = Object.entries(selection).map(([ticketId, qty]) => {
                const latestTicket = latestTickets.find(t => t.id === ticketId);
                return {
                    ticket_type_id: ticketId,
                    quantity: qty,
                    unit_price: latestTicket ? getTicketUnitPrice(latestTicket) : 0,
                    line_total: latestTicket ? getTicketLineTotal(latestTicket, qty) : 0,
                    base_price: latestTicket?.price || 0,
                    early_bird_applied: latestTicket ? getTicketEarlyBirdRemaining(latestTicket) > 0 && getTicketUnitPrice(latestTicket) < (latestTicket.price || 0) : false,
                };
            });

            const attendeesList: Attendee[] = [];
            Object.entries(selection).forEach(([ticketId, qty]) => {
                for (let i = 0; i < qty; i++) {
                    attendeesList.push({
                        ticket_type_id: ticketId,
                        name: isGuest ? (buyerName || 'Guest') : (currentUser?.name || ''),
                        email: isGuest ? buyerEmail : (currentUser?.email || ''),
                        is_me: !isGuest,
                    });
                }
            });

            const request: CheckoutRequest = {
                items,
                attendees: attendeesList,
                wants_physical_delivery: false,
                metadata: {
                    ticket_pricing: ticketPricing,
                },
            };

            if (isGuest) {
                request.buyer_email = buyerEmail.trim();
                if (buyerName.trim()) {
                    request.buyer_name = buyerName.trim();
                }
                if (buyerPhone.trim()) {
                    request.buyer_phone = buyerPhone.trim();
                }
            }

            const result = await checkoutTicket(event.id, request, { skipAuth: isGuest });

            if (result.purchase.status === 'successful' && result.purchase.amount === 0) {
                setStep('success');
            } else if (result.payment_url) {
                if (isGuest) {
                    sessionStorage.setItem('guest-purchase', JSON.stringify({
                        purchase: result.purchase,
                        buyer_email: buyerEmail,
                        buyer_name: buyerName,
                        buyer_phone: buyerPhone,
                        event_id: event.id,
                        event_title: event.title,
                        tickets: Object.entries(selection).map(([ticketId, qty]) => {
                            const t = tickets.find(tk => tk.id === ticketId);
                            return { label: t?.label || 'Ticket', quantity: qty, price: t ? getTicketLineTotal(t, qty) : 0 };
                        }),
                        total_amount: totalAmount,
                    }));
                }
                window.location.href = result.payment_url;
            } else {
                throw new Error("No payment URL received");
            }

        } catch (err: any) {
            console.error('Checkout failed:', err);
            setError(err.message || "Checkout failed. Please try again.");
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
                            <AmptiveSpinner className="text-black" />
                            <p className="text-lg font-medium text-gray-600">Processing Payment...</p>
                            <p className="text-sm text-gray-400">Secure simulated transaction</p>
                        </div>
                    ) : step === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center animate-in zoom-in-50 duration-500">
                            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">You're going!</h3>
                                <p className="text-gray-500">
                                    Your tickets have been sent to <span className="font-semibold text-gray-900">{isGuest ? buyerEmail : currentUser?.email}</span>
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
                                {tickets.map(ticket => {
                                    const isSoldOut = isTicketSoldOut(ticket);
                                    const remainingCount = getTicketRemaining(ticket);
                                    const earlyBirdRemaining = getTicketEarlyBirdRemaining(ticket);
                                    const unitPrice = getTicketUnitPrice(ticket);
                                    const hasEarlyBirdPrice = earlyBirdRemaining > 0 && unitPrice < (ticket.price || 0);

                                    return (
                                        <div 
                                            key={ticket.id} 
                                            className={`flex items-center justify-between rounded-2xl border p-4 transition-colors ${isSoldOut ? 'bg-gray-50/50 border-gray-100 opacity-60 cursor-not-allowed select-none' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'}`}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-gray-900">{ticket.label}</h3>
                                                    {isSoldOut ? (
                                                        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-100">
                                                            Sold out
                                                        </span>
                                                    ) : (
                                                        remainingCount !== null && remainingCount <= 50 && (
                                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-100">
                                                                Only {remainingCount} left
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-lg text-gray-500">
                                                        {unitPrice === 0 ? 'Free' : new Intl.NumberFormat(undefined, {
                                                            style: 'currency',
                                                            currency: ticket.currency || 'NGN'
                                                        }).format(unitPrice)}
                                                    </p>
                                                    {hasEarlyBirdPrice && (
                                                        <>
                                                            <span className="text-sm font-medium text-gray-300 line-through">
                                                                {new Intl.NumberFormat(undefined, {
                                                                    style: 'currency',
                                                                    currency: ticket.currency || 'NGN'
                                                                }).format(ticket.price)}
                                                            </span>
                                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-100">
                                                                Early bird
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {isSoldOut ? (
                                                <span className="pr-2 text-[13px] font-semibold text-rose-600">
                                                    Sold out
                                                </span>
                                            ) : (
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
                                                        disabled={remainingCount !== null && (selection[ticket.id] || 0) >= remainingCount}
                                                        className="h-8 w-8 flex items-center justify-center rounded-full text-black hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {isGuest && (
                                <div className="mt-6 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address <span className="text-red-500">*</span></label>
                                        <input
                                            type="email"
                                            value={buyerEmail}
                                            onChange={(e) => setBuyerEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none bg-gray-50/30 text-sm font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Full Name (Optional)</label>
                                        <input
                                            type="text"
                                            value={buyerName}
                                            onChange={(e) => setBuyerName(e.target.value)}
                                            placeholder="Your full name"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none bg-gray-50/30 text-sm font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Phone Number (Optional)</label>
                                        <input
                                            type="tel"
                                            value={buyerPhone}
                                            onChange={(e) => setBuyerPhone(e.target.value)}
                                            placeholder="+2348012345678"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none bg-gray-50/30 text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            )}

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
                                    onClick={handleCheckout}
                                    disabled={!hasSelection}
                                    className="w-full rounded-full bg-black py-4 font-bold text-white transition-all hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-black/10"
                                >
                                    Pay {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN' }).format(totalAmount)}
                                </button>
                                <p className="text-center text-xs text-gray-400">
                                    Secure checkout powered by Paystack
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
