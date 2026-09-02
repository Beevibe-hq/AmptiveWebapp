import { useState, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {  Plus, Minus, ChevronDown, CheckCircle2, Check, Ticket , Loader2 } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { toastError, toastSuccess } from '@/lib/ui/toast';
import { TICKET_THEMES } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUser } from '@/lib/api/auth';
import { getEvent, isEventPast, type EventTiming } from '@/lib/api/events';
import { EventTicket, getTicketEarlyBirdRemaining, getTicketLineTotal, getTicketRemaining, getTicketsForEvent, getTicketUnitPrice, isTicketSoldOut } from '@/lib/api/tickets';
import { checkoutTicket, type CheckoutItem, type Attendee, type CheckoutRequest } from '@/lib/api/tickets';
import { UserProfile } from '@/lib/api/services';
import { AmptiveSplash } from '@/components/AmptiveSpinner';

type EventRecord = EventTiming & {
    id: string;
    title: string;
    start_time?: string | null;
    venue?: string | null;
    user_id?: string | null;
    event_id?: string;
    thumbnail_url?: string | null;
};

/**
 * The native input is kept for semantics — keyboard, label association, form behaviour —
 * with its default appearance stripped so the box matches the rest of the checkout.
 * The whole row is the label, so the text is part of the hit target.
 */
function Checkbox({ id, checked, onChange, children }: {
    id: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    children: ReactNode;
}) {
    return (
        <label htmlFor={id} className="group flex cursor-pointer select-none items-center gap-3">
            <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-[7px] border border-black/15 bg-white transition-colors duration-150 group-hover:border-black/40 checked:border-black checked:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
                />
                <Check
                    className="pointer-events-none absolute h-3 w-3 scale-75 text-white opacity-0 transition-all duration-150 peer-checked:scale-100 peer-checked:opacity-100"
                    strokeWidth={3.5}
                />
            </span>
            {children}
        </label>
    );
}

export default function CheckoutPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const eventId = id;

    const [event, setEvent] = useState<EventRecord | null>(null);
    const [tickets, setTickets] = useState<EventTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [buyerEmail, setBuyerEmail] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');

    const [selection, setSelection] = useState<Record<string, number>>({});
    const [selectedTicketIdForPreview, setSelectedTicketIdForPreview] = useState<string | null>(null);
    const [showBenefits, setShowBenefits] = useState<Record<string, boolean>>({});
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'preview'>('details');
    const [lastDirection, setLastDirection] = useState(1);
    const [checkoutStep, setCheckoutStep] = useState<'selection' | 'attendees' | 'summary'>('selection');
    const [attendees, setAttendees] = useState<Array<{ ticketId: string; name: string; email: string; phone?: string; isMe: boolean }>>([]);
    const [showBulkForm, setShowBulkForm] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);

    /*
     * A guest buying a single ticket fills in one form, not two. The checkout request
     * still needs buyer_email (and optionally name and phone), so those are mirrored
     * from the sole attendee instead of being asked for a second time.
     *
     * Only for one ticket: with several, the buyer is genuinely a separate person from
     * the attendees and the Contact Information card still earns its place.
     */
    const soleAttendee = attendees.length === 1 ? attendees[0] : null;
    useEffect(() => {
        if (!isGuest || !soleAttendee) return;
        setBuyerEmail(soleAttendee.email || '');
        setBuyerName(soleAttendee.name || '');
        setBuyerPhone(soleAttendee.phone || '');
    }, [isGuest, soleAttendee?.email, soleAttendee?.name, soleAttendee?.phone]);

    const PLATFORM_FEE = 0;

    // Pre-fill attendee name/email when isMe is true
    useEffect(() => {
        if (!currentUser) return;
        const hasChanges = attendees.some(a => a.isMe && (!a.name || !a.email));
        if (!hasChanges) return;

        setAttendees(prev => prev.map(a => {
            if (a.isMe && (!a.name || !a.email)) {
                return {
                    ...a,
                    name: a.name || currentUser.name || currentUser.username || '',
                    email: a.email || currentUser.email || '',
                };
            }
            return a;
        }));
    }, [currentUser, attendees]);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const user = await getCurrentUser().catch(() => null);
                setCurrentUser(user);
                if (!user) {
                    setIsGuest(true);
                }

                const eventData = await getEvent(id);
                if (!eventData) throw new Error('Event not found');
                setEvent({
                    ...eventData,
                    id: eventData.event_id || '',
                    title: eventData.title || '',
                    start_time: eventData.scheduled_for || eventData.started_at || null,
                    ended_at: eventData.ended_at || null,
                    venue: eventData.location?.venue || null,
                    user_id: eventData.host?.user_id || null,
                    thumbnail_url: eventData.thumbnail_url || null,
                });

                const ticketData = await getTicketsForEvent(id);

                const formattedTickets = ticketData.map(t => {
                    let parsedBenefits: string[] = [];
                    const raw = t.benefits;

                    if (Array.isArray(raw)) {
                        parsedBenefits = raw.map(String);
                    }

                    if (parsedBenefits.length === 0) {
                        const label = (t.label || '').toLowerCase();
                        if (label.includes('vip') || label.includes('platinum') || label.includes('gold')) {
                            parsedBenefits = ['Priority Arena Entry', 'Complimentary Welcome Drink', 'Exclusive Lounge Access', 'Premium Seat View'];
                        } else if (label.includes('table') || label.includes('vvip')) {
                            parsedBenefits = ['Reserved Table Seating', 'Dedicated Service Staff', 'Complimentary Bottle Service', 'VIP Parking'];
                        } else {
                            parsedBenefits = ['Guaranteed Event Access', 'Access to Main Arena', 'Digital Ticket Delivery'];
                        }
                    }

                    return {
                        ...t,
                        label: t.label || 'Standard Ticket',
                        benefits: parsedBenefits.map(String)
                    };
                });

                setTickets(formattedTickets);
            } catch (error) {
                console.error('Error fetching checkout data:', error);
                toastError('Failed to load event details.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        setSelection(prev => {
            let changed = false;
            const nextSelection: Record<string, number> = {};

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
        if (!ticket || (delta > 0 && isTicketSoldOut(ticket))) {
            return;
        }

        setLastDirection(delta > 0 ? 1 : -1);
        setSelection(prev => {
            const current = prev[ticketId] || 0;
            if (delta > 0 && remaining !== null && current >= remaining) {
                toastError(getInventoryMessage(ticket, current + delta));
                return prev;
            }
            const next = Math.max(0, current + delta);
            const cappedNext = remaining !== null ? Math.min(next, remaining) : next;

            if (delta > 0) {
                setSelectedTicketIdForPreview(ticketId);
            }

            if (cappedNext === 0) {
                const { [ticketId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [ticketId]: cappedNext };
        });
    };

    const getInventoryMessage = (ticket?: EventTicket, requestedQuantity?: number) => {
        const label = ticket?.label || 'This ticket';
        const remaining = ticket ? getTicketRemaining(ticket) : null;
        if (remaining === null) {
            return `${label} no longer has enough tickets available.`;
        }
        if (remaining <= 0) {
            return `${label} is sold out.`;
        }
        const leftLabel = `${remaining} ${remaining === 1 ? 'ticket' : 'tickets'} left`;
        if (requestedQuantity && requestedQuantity > remaining) {
            return `Only ${leftLabel} for ${label}. Please reduce your quantity.`;
        }
        return `Only ${leftLabel} for ${label}.`;
    };

    const getInventoryErrorMessage = (errorMessage: string, latestTickets: EventTicket[]) => {
        const match = errorMessage.match(/Not enough inventory remaining for ['"]?([^'".]+)['"]?/i);
        if (!match) return errorMessage;
        const ticketName = match[1]?.trim();
        const ticket = latestTickets.find(t => t.label?.toLowerCase() === ticketName?.toLowerCase());
        return getInventoryMessage(ticket, ticket ? selection[ticket.id] : undefined);
    };

    const toggleBenefits = (ticketId: string) => {
        setShowBenefits(prev => ({
            ...prev,
            [ticketId]: !prev[ticketId]
        }));
    };

    const ticketCost = tickets.reduce((sum, ticket) => sum + getTicketLineTotal(ticket, selection[ticket.id] || 0), 0);
    const totalAmount = ticketCost;

    // How many tickets are in the basket. The checkout button keys off this rather than the
    // price: a free ticket is a valid selection worth ₦0, and gating on the amount meant
    // free events could never be checked out even though the backend supports them.
    const selectedTicketCount = Object.values(selection).reduce((sum, qty) => sum + (Number(qty) || 0), 0);

    const handlePayment = async () => {
        if (!event) return;

        // Checked here as well as in the UI: the page may have been sitting open
        // since before the event ended.
        if (isEventPast(event)) {
            toastError('This event has ended, so ticket sales are closed.');
            return;
        }

        if (checkoutStep === 'selection') {
            console.log(selection);

            const initialAttendees: Array<{ ticketId: string; name: string; email: string; phone?: string; isMe: boolean }> = [];
            Object.entries(selection).forEach(([ticketId, qty]) => {
                for (let i = 0; i < qty; i++) {
                    const isFirst = initialAttendees.length === 0;
                    initialAttendees.push({
                        ticketId,
                        name: isFirst && currentUser ? (currentUser.name || '') : '',
                        email: isFirst && currentUser ? (currentUser.email || '') : '',
                        isMe: currentUser ? isFirst : false,
                        phone: ''
                    });
                }
            });
            setAttendees(initialAttendees);
            setCheckoutStep('attendees');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (checkoutStep === 'attendees') {
            if (isGuest && !buyerEmail.trim()) {
                toastError('Your email is required for guest checkout.');
                return;
            }
            const incomplete = attendees.some(a => !a.name.trim() || !a.email.trim());
            if (incomplete) {
                toastError("Please fill in all attendee names and emails.");
                return;
            }

            setCheckoutStep('summary');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setProcessing(true);
        try {
            const latestTickets = await getTicketsForEvent(eventId!);
            const unavailableSelection = Object.entries(selection).find(([ticketId, qty]) => {
                const latestTicket = latestTickets.find(t => t.id === ticketId);
                const remaining = latestTicket ? getTicketRemaining(latestTicket) : null;
                return !latestTicket || isTicketSoldOut(latestTicket) || (remaining !== null && qty > remaining);
            });

            if (unavailableSelection) {
                const [ticketId, qty] = unavailableSelection;
                const latestTicket = latestTickets.find(t => t.id === ticketId);
                toastError(getInventoryMessage(latestTicket, qty));
                setTickets(latestTickets);
                setCheckoutStep('selection');
                setProcessing(false);
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
                    unit_price: latestTicket ? getTicketUnitPrice(latestTicket, qty) : 0,
                    line_total: latestTicket ? getTicketLineTotal(latestTicket, qty) : 0,
                    base_price: latestTicket?.price || 0,
                    early_bird_applied: latestTicket ? getTicketEarlyBirdRemaining(latestTicket) > 0 && getTicketUnitPrice(latestTicket, 1) < (latestTicket.price || 0) : false,
                };
            });

            const attendeesList: Attendee[] = attendees.map(a => ({
                ticket_type_id: a.ticketId,
                name: a.name.trim() || currentUser?.name || currentUser?.username || buyerName.trim(),
                email: a.email.trim() || currentUser?.email || buyerEmail.trim() || undefined,
                phone: a.phone?.trim() || undefined,
                is_me: a.isMe || (!a.name.trim() && Boolean(currentUser)),
            }));

            const request: CheckoutRequest = {
                items,
                attendees: attendeesList,
                wants_physical_delivery: false,
                metadata: {
                    physical_delivery_fee: 0,
                    ticket_pricing: ticketPricing,
                },
            };

            if (isGuest) {
                if (!buyerEmail.trim()) {
                    toastError('Your email is required for guest checkout.');
                    setProcessing(false);
                    return;
                }
                request.buyer_email = buyerEmail.trim();
                if (buyerName.trim()) {
                    request.buyer_name = buyerName.trim();
                }
                if (buyerPhone.trim()) {
                    request.buyer_phone = buyerPhone.trim();
                }
            }

            // Add callback URL for Paystack redirect
            const callbackUrl = `${window.location.origin}/paystack/callback?event_id=${eventId}`;
            const requestWithCallback = {
                ...request,
                callback_url: callbackUrl,
            };

            const result = await checkoutTicket(eventId!, requestWithCallback, { skipAuth: isGuest });

            if (result.purchase.status === 'successful' && result.purchase.amount === 0) {
                setSuccess(true);
                toastSuccess("Tickets secured!");
            } else if (result.payment_url) {
                if (isGuest) {
                    sessionStorage.setItem('guest-purchase', JSON.stringify({
                        purchase: result.purchase,
                        buyer_email: buyerEmail,
                        buyer_name: buyerName,
                        buyer_phone: buyerPhone,
                        event_id: eventId,
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

        } catch (error: any) {
            console.error('Checkout error:', error);
            const latestTickets = await getTicketsForEvent(eventId!).catch(() => tickets);
            if (latestTickets.length > 0) setTickets(latestTickets);
            toastError(getInventoryErrorMessage(error.message || 'Checkout failed', latestTickets));
        } finally {
            setProcessing(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            maximumFractionDigits: 0
        }).format(price);
    };

    if (loading) {
        return (
            <AmptiveSplash />
        );
    }

    if (!event) return null;

    if (success) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="text-center space-y-4 max-w-md">
                    <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900">Payment Successful!</h2>
                    <p className="text-gray-500 font-medium leading-relaxed">
                        {isGuest
                            ? `Your tickets have been sent to ${buyerEmail || 'your email'}.`
                            : 'Your tickets have been sent to your email. You can also view them in your My Ticket page.'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <button
                        onClick={() => navigate(`/events/${id}`)}
                        className="px-8 py-3 rounded-full border border-gray-200 font-bold hover:bg-gray-50 transition-colors"
                    >
                        Back to Event
                    </button>
                    {!isGuest && (
                        <button
                            onClick={() => navigate('/profile')}
                            className="px-8 py-3 rounded-full bg-black text-white font-bold hover:bg-gray-900 transition-colors"
                        >
                            View My Tickets
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const selectedTicketsList = Object.entries(selection).flatMap(([id, qty]) => {
        const ticket = tickets.find(t => t.id === id);
        if (!ticket || qty <= 0) return [];
        return [ticket];
    });

    const previewTicket = tickets.find(t => t.id === selectedTicketIdForPreview && (selection[t.id] || 0) > 0);

    let stackBackground = [...selectedTicketsList];
    if (previewTicket) {
        const index = stackBackground.findIndex(t => t.id === previewTicket.id);
        if (index !== -1) stackBackground.splice(index, 1);
    }

    const visibleStack = stackBackground.slice(0, 3);

    const renderAttendeeStep = () => {
        const totalTickets = attendees.length;

        const guestInfoSection = isGuest ? (
            <div id="guest-contact" className="space-y-6 bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Contact Information</h3>
                    <p className="text-sm text-gray-500 mt-1">We'll send your tickets to this email</p>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
                        <input
                            type="email"
                            value={buyerEmail}
                            onChange={(e) => setBuyerEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className="w-full h-10 rounded-[10px] border border-black/10 bg-transparent px-2.5 text-[15px] leading-[26px] text-gray-900 transition-colors placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-0"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Full Name (Optional)</label>
                        <input
                            type="text"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            placeholder="Your full name"
                            className="w-full h-10 rounded-[10px] border border-black/10 bg-transparent px-2.5 text-[15px] leading-[26px] text-gray-900 transition-colors placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-0"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
                        <input
                            type="tel"
                            value={buyerPhone}
                            onChange={(e) => setBuyerPhone(e.target.value)}
                            placeholder="+2348012345678"
                            className="w-full h-10 rounded-[10px] border border-black/10 bg-transparent px-2.5 text-[15px] leading-[26px] text-gray-900 transition-colors placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-0"
                        />
                    </div>
                </div>
            </div>
        ) : null;

        if (totalTickets === 1) {
            const ticketType = tickets.find(t => t.id === attendees[0].ticketId);
            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div>
                        <h2 className="text-[24px] font-bold text-gray-900" style={{ letterSpacing: '-0.04em' }}>
                            Attendee Details
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            For your <span className="font-bold text-black">{ticketType?.label}</span> ticket
                            {isGuest && <> · we'll send it to the email below</>}
                        </p>
                    </div>
                    <div className="space-y-6 bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                        <div className="space-y-4">
                            {/* Signed-in only. A guest buying one ticket has no account to
                                copy details from, and these fields already are their
                                contact details, so the checkbox has nothing to do. */}
                            {!isGuest && (
                            <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                                <Checkbox
                                    id="isMe"
                                    checked={!!attendees[0]?.isMe}
                                    onChange={(checked) => {
                                        setAttendees(prev => [
                                            {
                                                ...prev[0],
                                                isMe: checked,
                                                name: checked ? (currentUser?.name || currentUser?.username || buyerName || '') : '',
                                                email: checked ? (currentUser?.email || buyerEmail || '') : ''
                                            }
                                        ]);
                                    }}
                                >
                                    <span className="text-sm font-medium text-gray-700">This ticket is for me</span>
                                </Checkbox>
                            </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input
                                        type="text"
                                        value={attendees[0]?.name || ''}
                                        onChange={(e) => setAttendees(prev => [{ ...prev[0], name: e.target.value, isMe: false }])}
                                        placeholder="Enter attendee name"
                                        className="w-full h-10 rounded-[10px] border border-black/10 bg-transparent px-2.5 text-[15px] leading-[26px] text-gray-900 transition-colors placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-0"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                    <input
                                        type="email"
                                        value={attendees[0]?.email || ''}
                                        onChange={(e) => setAttendees(prev => [{ ...prev[0], email: e.target.value, isMe: false }])}
                                        placeholder="Enter attendee email"
                                        className="w-full h-10 rounded-[10px] border border-black/10 bg-transparent px-2.5 text-[15px] leading-[26px] text-gray-900 transition-colors placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-0"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
                                    <input
                                        type="tel"
                                        value={attendees[0]?.phone || ''}
                                        onChange={(e) => setAttendees(prev => [{ ...prev[0], phone: e.target.value }])}
                                        placeholder="Enter phone number"
                                        className="w-full h-10 rounded-[10px] border border-black/10 bg-transparent px-2.5 text-[15px] leading-[26px] text-gray-900 transition-colors placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* No separate Contact Information card here: with one ticket the
                        attendee is the buyer, and asking for the same name, email and
                        phone twice on one screen is just friction. The buyer fields the
                        payment needs are mirrored from these in an effect above. */}
                </div>
            );
        }

        if (totalTickets === 2) {
            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <h2 className="text-[24px] font-bold text-gray-900" style={{ letterSpacing: '-0.04em' }}>
                        Who are these tickets for?
                    </h2>
                    <div className="space-y-6">
                        {attendees.map((attendee, idx) => {
                            const ticketType = tickets.find(t => t.id === attendee.ticketId);
                            return (
                                <div key={idx} className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest w-fit">
                                                Ticket {idx + 1} of 2
                                            </span>
                                            <span className="mt-2 text-xs font-bold text-gray-500 uppercase tracking-tight">{ticketType?.label}</span>
                                        </div>
                                        <Checkbox
                                            id={`isMe-${idx}`}
                                            checked={!!attendee.isMe}
                                            onChange={(checked) => {
                                                setAttendees(prev => {
                                                    const next = [...prev];
                                                    next[idx] = {
                                                        ...next[idx],
                                                        isMe: checked,
                                                        name: checked ? (currentUser?.name || currentUser?.username || buyerName || '') : '',
                                                        email: checked ? (currentUser?.email || buyerEmail || '') : ''
                                                    };
                                                    return next;
                                                });
                                            }}
                                        >
                                            <span className="text-sm font-medium text-gray-700">This ticket is for me</span>
                                        </Checkbox>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                            <input
                                                type="text"
                                                value={attendee.name}
                                                onChange={(e) => setAttendees(prev => {
                                                    const next = [...prev];
                                                    next[idx].name = e.target.value;
                                                    if (idx === 0) next[idx].isMe = false;
                                                    return next;
                                                })}
                                                placeholder="Name"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black outline-none bg-gray-50/30 text-sm font-medium"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                            <input
                                                type="email"
                                                value={attendee.email}
                                                onChange={(e) => setAttendees(prev => {
                                                    const next = [...prev];
                                                    next[idx].email = e.target.value;
                                                    if (idx === 0) next[idx].isMe = false;
                                                    return next;
                                                })}
                                                placeholder="Email"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black outline-none bg-gray-50/30 text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {guestInfoSection}
                </div>
            );
        }

        if (showBulkForm) {
            return (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[24px] font-bold text-gray-900" style={{ letterSpacing: '-0.04em' }}>
                            Guest Details
                        </h2>
                        <button
                            onClick={() => {
                                setShowBulkForm(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-sm font-bold text-blue-600 hover:text-blue-700"
                        >
                            Change selection
                        </button>
                    </div>

                    <div className="space-y-6">
                        {attendees.map((attendee, idx) => {
                            const ticketType = tickets.find(t => t.id === attendee.ticketId);
                            return (
                                <div key={idx} className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest w-fit">
                                                Ticket {idx + 1} of {attendees.length}
                                            </span>
                                            <span className="mt-2 text-xs font-bold text-gray-500 uppercase tracking-tight">{ticketType?.label}</span>
                                        </div>
                                        <Checkbox
                                            id={`isMe-${idx}`}
                                            checked={!!attendee.isMe}
                                            onChange={(checked) => {
                                                setAttendees(prev => {
                                                    const next = [...prev];
                                                    next[idx] = {
                                                        ...next[idx],
                                                        isMe: checked,
                                                        name: checked ? (currentUser?.name || currentUser?.username || buyerName || '') : '',
                                                        email: checked ? (currentUser?.email || buyerEmail || '') : ''
                                                    };
                                                    return next;
                                                });
                                            }}
                                        >
                                            <span className="text-sm font-medium text-gray-700">This ticket is for me</span>
                                        </Checkbox>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                            <input
                                                type="text"
                                                value={attendee.name}
                                                onChange={(e) => setAttendees(prev => {
                                                    const next = [...prev];
                                                    next[idx].name = e.target.value;
                                                    return next;
                                                })}
                                                placeholder="Guest Name"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black outline-none bg-gray-50/30 text-sm font-medium"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                            <input
                                                type="email"
                                                value={attendee.email}
                                                onChange={(e) => setAttendees(prev => {
                                                    const next = [...prev];
                                                    next[idx].email = e.target.value;
                                                    return next;
                                                })}
                                                placeholder="Guest Email"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black outline-none bg-gray-50/30 text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {guestInfoSection}
                </div>
            );
        }

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="text-left space-y-2">
                    <h2 className="text-[24px] font-bold text-gray-900" style={{ letterSpacing: '-0.04em' }}>
                        How do you want to personalize your tickets?
                    </h2>
                    <p className="text-gray-500 font-medium">Bulk purchase detected. Choose a path to continue.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => {
                            /*
                             * A guest has no account to copy from, so without their
                             * contact details this jumped to the summary with every
                             * attendee blank — and let them pay with no email to send
                             * the tickets to.
                             */
                            const name = currentUser?.name || currentUser?.username || buyerName.trim();
                            const email = currentUser?.email || buyerEmail.trim();

                            if (!email.trim()) {
                                toastError('Add your email below first — that is where your tickets go.');
                                document.getElementById('guest-contact')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                return;
                            }

                            setAttendees(prev => prev.map(a => ({
                                ...a,
                                name,
                                email,
                                isMe: true
                            })));
                            setCheckoutStep('summary');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="group p-6 rounded-[2rem] border-2 border-gray-100 bg-white hover:border-black transition-all text-left space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">I'm the only attendee</h3>
                            <CheckCircle2 className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">
                            Use my name and email for every ticket in this order. Fast and convenient for bulk personal purchases.
                        </p>
                    </button>

                    {!isGuest && (
                        <button
                            onClick={() => {
                                setAttendees(prev => prev.map(a => ({
                                    ...a,
                                    name: currentUser?.name || currentUser?.username || '',
                                    email: currentUser?.email || '',
                                    isMe: true,
                                })));
                                setCheckoutStep('summary');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="group p-6 rounded-[2rem] border border-gray-100 bg-gray-50/30 hover:bg-white hover:border-gray-200 transition-all text-left space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900">I'll assign guests later</h3>
                                <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-full">Fastest</span>
                            </div>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                Skip this for now. You'll receive all tickets in your email and can assign names from your My Ticket page later.
                            </p>
                        </button>
                    )}

                    <button
                        onClick={() => {
                            setShowBulkForm(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="group p-6 rounded-[2rem] border border-gray-100 bg-gray-50/30 hover:bg-white hover:border-gray-200 transition-all text-left space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">I'll enter guest names now</h3>
                            <Plus className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">
                            Manually add the names and emails for each guest before proceeding. Best for small groups.
                        </p>
                    </button>
                </div>
                {guestInfoSection}
            </div>
        );
    };

    const isPastEvent = event ? isEventPast(event) : false;

    const availableTickets = tickets.filter(t => !isTicketSoldOut(t));
    const soldOutTickets = tickets.filter(isTicketSoldOut);

    return (
        <div className="bg-white min-h-screen font-sans">
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 h-[72px] flex items-center justify-between">
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                <div className="mb-10">
                    {checkoutStep === 'attendees' && (
                        <button
                            onClick={() => {
                                setCheckoutStep('selection');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors mb-6 group"
                        >
                            <ChevronDown className="rotate-90 w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Back to selection
                        </button>
                    )}
                    <div className="flex flex-row justify-between gap-4 md:gap-8 items-start">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-[28px] md:text-[40px] font-bold text-gray-900 leading-tight tracking-tight break-words" style={{ letterSpacing: '-0.04em' }}>
                                {event.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-base md:text-lg font-medium text-gray-500">
                                <div className="flex items-center gap-2">
                                    <span>{event.start_time ? new Date(event.start_time).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Date TBD'}</span>
                                </div>
                                <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                <div className="flex items-center gap-2">
                                    <span>{event.start_time ? new Date(event.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Time TBD'}</span>
                                </div>
                            </div>
                        </div>
                        {event.thumbnail_url && (
                            <img 
                                src={event.thumbnail_url} 
                                alt={event.title}
                                className="hidden md:block w-24 h-24 object-cover rounded-xl shadow-sm flex-shrink-0 mt-3"
                            />
                        )}
                    </div>
                    <div className="h-px bg-gray-100 w-full mt-6 sm:mt-10"></div>

                    {/* Mobile Tab Toggle */}
                    <div className="flex lg:hidden border-b border-gray-100 mt-8 mb-6">
                        <button
                            type="button"
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Details
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('preview')}
                            className={`flex-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'preview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Preview
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                    {/* Selection Step */}
                    {checkoutStep === 'selection' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`order-1 lg:order-1 space-y-8 font-sans ${activeTab === 'details' ? 'block' : 'hidden lg:block'}`}
                        >
                            {isPastEvent ? (
                                <div className="p-8 rounded-[2rem] border border-red-100 bg-red-50/50 text-center space-y-4 my-10">
                                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-bold text-xl text-gray-900 tracking-tight">Event Has Ended</h3>
                                    <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto">
                                        Ticket sales are closed because this event has already taken place.
                                    </p>
                                </div>
                            ) : (
                            <div className="space-y-8">
                                {availableTickets.length > 0 && (
                                    <div>
                                        <h2 className="mb-4 text-[18px] font-semibold text-gray-900">
                                            Available tickets
                                        </h2>
                                        <div className="space-y-4">
                                            {availableTickets.map(ticket => {
                                                const isSelected = selectedTicketIdForPreview === ticket.id;
                                                const benefitsOpen = showBenefits[ticket.id] || false;
                                                const remainingCount = getTicketRemaining(ticket);
                                                const earlyBirdRemaining = getTicketEarlyBirdRemaining(ticket);
                                                const unitPrice = getTicketUnitPrice(ticket);
                                                const hasEarlyBirdPrice = earlyBirdRemaining > 0 && unitPrice < (ticket.price || 0);

                                                return (
                                                    <div
                                                        key={ticket.id}
                                                        className={`group relative overflow-hidden border rounded-2xl transition-all duration-300 ${isSelected ? 'border-gray-200 bg-gray-50/50' : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'}`}
                                                        onClick={() => setSelectedTicketIdForPreview(ticket.id)}
                                                    >
                                                        <div className="py-3 px-5 flex items-center justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="min-w-0">
                                                                    <h3 className="truncate font-bold text-gray-900">{ticket.label}</h3>
                                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-tight">
                                                                            {unitPrice === 0 ? 'Free' : formatPrice(unitPrice)}
                                                                        </p>
                                                                        {hasEarlyBirdPrice && (
                                                                            <>
                                                                                <span className="text-xs font-medium text-gray-300 line-through">{formatPrice(ticket.price)}</span>
                                                                                <span className="inline-flex items-center justify-center p-0.5 rounded shrink-0 text-orange-600 border border-orange-600/80 bg-orange-50 select-none" title="Early Bird Available"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 fill-orange-600" viewBox="0 0 256 256"><path d="M236.44,73.34,213.21,57.86A60,60,0,0,0,156,16h-.29C122.79,16.16,96,43.47,96,76.89V96.63L11.63,197.88l-.1.12A16,16,0,0,0,24,224h88A104.11,104.11,0,0,0,216,120V100.28l20.44-13.62a8,8,0,0,0,0-13.32ZM126.15,133.12l-60,72a8,8,0,1,1-12.29-10.24l60-72a8,8,0,1,1,12.29,10.24ZM164,80a12,12,0,1,1,12-12A12,12,0,0,1,164,80Z"></path></svg></span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    {hasEarlyBirdPrice && (
                                                                        <span className="mt-1 block text-xs font-medium text-amber-600">
                                                                            {earlyBirdRemaining} early bird left
                                                                        </span>
                                                                    )}
                                                                    {selection[ticket.id] > earlyBirdRemaining && earlyBirdRemaining > 0 && (
                                                                        <span className="mt-1.5 block text-xs font-medium text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/50 w-fit">
                                                                            {earlyBirdRemaining} early bird @ {formatPrice(unitPrice)} + {selection[ticket.id] - earlyBirdRemaining} regular @ {formatPrice(ticket.price)}
                                                                        </span>
                                                                    )}
                                                                    {remainingCount !== null && remainingCount <= 50 && remainingCount > 0 && (
                                                                        <span className="inline-block mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-100">
                                                                            Only {remainingCount} left
                                                                        </span>
                                                                    )}

                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); toggleBenefits(ticket.id); }}
                                                                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-all mt-3 group/btn"
                                                                    >
                                                                        <span className="border-b border-transparent group-hover/btn:border-blue-600">
                                                                            {benefitsOpen ? 'Hide Benefits' : 'View Benefits'}
                                                                        </span>
                                                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${benefitsOpen ? 'rotate-180' : ''}`} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); updateQuantity(ticket.id, -1); }}
                                                                    disabled={!selection[ticket.id]}
                                                                    className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 hover:text-black hover:border-black disabled:opacity-20 transition-all font-sans"
                                                                >
                                                                    <Minus className="h-4 w-4" />
                                                                </button>
                                                                <div className="w-6 flex items-center justify-center overflow-hidden">
                                                                    <AnimatePresence mode="popLayout" initial={false}>
                                                                        <motion.span
                                                                            key={selection[ticket.id] || 0}
                                                                            initial={{ y: lastDirection > 0 ? 20 : -20, opacity: 0 }}
                                                                            animate={{ y: 0, opacity: 1 }}
                                                                            exit={{ y: lastDirection > 0 ? -20 : 20, opacity: 0 }}
                                                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                                            className="text-center text-base font-bold tabular-nums text-gray-900"
                                                                        >
                                                                            {selection[ticket.id] || 0}
                                                                        </motion.span>
                                                                    </AnimatePresence>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); updateQuantity(ticket.id, 1); }}
                                                                    disabled={remainingCount !== null && (selection[ticket.id] || 0) >= remainingCount}
                                                                    className="h-10 w-10 flex items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 transition-all shadow-md active:scale-95 font-sans disabled:opacity-30 disabled:cursor-not-allowed"
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <AnimatePresence>
                                                            {benefitsOpen && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="px-5 pb-5 pt-4 border-t border-gray-100 bg-gray-50/30">
                                                                        <div className="space-y-3">
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Included Benefits</p>
                                                                            <ul className="grid grid-cols-1 gap-2">
                                                                                {(Array.isArray(ticket.benefits) ? ticket.benefits : []).map((benefit, i) => (
                                                                                    <li key={i} className="flex items-start gap-2.5 text-[13px] font-medium text-gray-600 leading-tight">
                                                                                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                                                        <span>{benefit}</span>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {soldOutTickets.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="pl-1 mb-4 text-[14px] font-semibold text-gray-500">
                                            Sold out
                                        </h3>
                                        <div className="space-y-4">
                                            {soldOutTickets.map(ticket => {
                                                const benefitsOpen = showBenefits[ticket.id] || false;

                                                return (
                                                    <div
                                                        key={ticket.id}
                                                        className="relative overflow-hidden border border-gray-100 bg-gray-50/50 rounded-2xl opacity-60 cursor-not-allowed"
                                                    >
                                                        <div className="py-3 px-5 flex items-center justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="min-w-0">
                                                                    <h3 className="font-bold text-gray-900 truncate">{ticket.label}</h3>
                                                                    <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-tight">
                                                                        {ticket.price === 0 ? 'Free' : formatPrice(ticket.price)}
                                                                    </p>

                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); toggleBenefits(ticket.id); }}
                                                                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-all mt-3 group/btn"
                                                                    >
                                                                        <span className="border-b border-transparent group-hover/btn:border-blue-600">
                                                                            {benefitsOpen ? 'Hide Benefits' : 'View Benefits'}
                                                                        </span>
                                                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${benefitsOpen ? 'rotate-180' : ''}`} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center">
                                                                <span className="rounded-full bg-rose-50 px-4 py-2 text-[12px] font-semibold text-rose-600 ring-1 ring-rose-100">
                                                                    Sold out
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <AnimatePresence>
                                                            {benefitsOpen && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="px-5 pb-5 pt-4 border-t border-gray-100 bg-gray-50/30">
                                                                        <div className="space-y-3">
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Included Benefits</p>
                                                                            <ul className="grid grid-cols-1 gap-2">
                                                                                {(Array.isArray(ticket.benefits) ? ticket.benefits : []).map((benefit, i) => (
                                                                                    <li key={i} className="flex items-start gap-2.5 text-[13px] font-medium text-gray-600 leading-tight">
                                                                                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                                                        <span>{benefit}</span>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-10 border-t border-gray-100 space-y-6">

                                    <div className="flex justify-between text-sm font-medium pt-2">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="text-gray-900">{formatPrice(ticketCost)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-gray-500">Service Fee</span>
                                        <span className="text-gray-900">{formatPrice(0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-2xl font-black text-gray-900 pt-2">
                                        <span>Total</span>
                                        <span>{formatPrice(totalAmount)}</span>
                                    </div>



                                    <button
                                        onClick={handlePayment}
                                        disabled={selectedTicketCount === 0 || processing}
                                        className="w-full py-5 rounded-full font-bold text-lg transition-all duration-300 transform active:scale-[0.98] bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                                Authenticating...
                                            </>
                                        ) : (
                                            selectedTicketCount === 0
                                                ? 'Select a ticket'
                                                : totalAmount === 0 ? 'Continue — Free' : `Continue ${formatPrice(totalAmount)}`
                                        )}
                                    </button>
                                    <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Secure checkout powered by Paystack
                                    </p>
                                </div>
                            </div>
                            )}
                        </motion.div>
                    )}

                    {/* Attendee Step */}
                    {checkoutStep === 'attendees' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`order-1 lg:order-1 space-y-8 font-sans ${activeTab === 'details' ? 'block' : 'hidden lg:block'}`}
                        >
                            {renderAttendeeStep()}

                            <div className="pt-8 border-t border-gray-100">
                                {(!(attendees.length >= 3 && !showBulkForm)) && (
                                    <button
                                        onClick={handlePayment}
                                        disabled={processing}
                                        className="w-full py-5 rounded-full font-bold text-lg transition-all duration-300 transform active:scale-[0.98] bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                                Authenticating...
                                            </>
                                        ) : (
                                            attendees.length >= 2 ? "Continue to Summary" : "Proceed to Payment"
                                        )}
                                    </button>
                                )}
                                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">
                                    Step 2 of 3 · Attendee Details
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Summary Step */}
                    {checkoutStep === 'summary' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`order-1 lg:order-1 space-y-8 font-sans ${activeTab === 'details' ? 'block' : 'hidden lg:block'}`}
                        >
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <h2 className="text-[24px] font-bold text-gray-900" style={{ letterSpacing: '-0.04em' }}>
                                    Order Summary
                                </h2>

                                <div className="space-y-6 bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                                    <div className="space-y-4">
                                        <div className="pb-4 border-b border-gray-100">
                                            <h3 className="font-bold text-gray-900">{event.title}</h3>
                                            <p className="text-sm text-gray-500">{new Date(event.start_time!).toLocaleDateString()}</p>
                                        </div>

                                        <div className="space-y-4">
                                            {tickets.map(ticket => {
                                                const quantity = selection[ticket.id] || 0;
                                                if (quantity === 0) return null;

                                                return (
                                                    <div key={ticket.id} className="flex justify-between items-center py-2">
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-sm">{ticket.label}</p>
                                                            <p className="text-xs text-gray-500">x{quantity}</p>
                                                        </div>
                                                        <span className="font-bold text-gray-900">{formatPrice(getTicketLineTotal(ticket, quantity))}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                            <span className="text-lg font-black text-gray-900">Total</span>
                                            <span className="text-2xl font-black text-gray-900">{formatPrice(totalAmount)}</span>
                                        </div>
                                    </div>
                                </div>

                                {isGuest && (
                                    <div className="space-y-4 bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                                        <h3 className="font-bold text-gray-900">Contact Information</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Email</span>
                                                <span className="font-medium">{buyerEmail || '—'}</span>
                                            </div>
                                            {buyerName && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Name</span>
                                                    <span className="font-medium">{buyerName}</span>
                                                </div>
                                            )}
                                            {buyerPhone && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Phone</span>
                                                    <span className="font-medium">{buyerPhone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8 space-y-4">
                                    <button
                                        onClick={handlePayment}
                                        disabled={processing}
                                        className="w-full py-5 rounded-full font-bold text-lg transition-all duration-300 transform active:scale-[0.98] bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                                Processing Payment...
                                            </>
                                        ) : (
                                            totalAmount === 0 ? 'Confirm — Free' : `Confirm & Pay ${formatPrice(totalAmount)}`
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCheckoutStep('attendees');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="w-full py-3 text-sm font-bold text-gray-400 hover:text-black transition-colors"
                                    >
                                        Back to details
                                    </button>
                                    <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">
                                        Step 3 of 3 · Order Summary
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div className={`lg:pl-8 order-2 lg:order-2 ${activeTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
                        <div className="h-fit lg:sticky lg:top-32 flex flex-col items-center">
                            <h2 className="hidden lg:block mb-8 pt-0 w-full text-left text-[18px] font-semibold text-gray-900">
                                Ticket preview
                            </h2>

                            {previewTicket || selectedTicketsList.length > 0 ? (
                                <div className="relative flex flex-col items-center w-full min-h-0 lg:min-h-[500px]">
                                    {/* Mobile Swipe View */}
                                    <div className="lg:hidden w-full overflow-x-auto snap-x snap-mandatory flex items-start pt-8 pb-8 gap-0 no-scrollbar select-none"
                                        onScroll={(e) => {
                                            const target = e.currentTarget;
                                            const index = Math.round(target.scrollLeft / target.clientWidth);
                                            const dots = document.querySelectorAll('.ticket-dot');
                                            dots.forEach((dot, i) => {
                                                if (i === index) {
                                                    dot.classList.add('bg-black', 'scale-125');
                                                    dot.classList.remove('bg-gray-300');
                                                } else {
                                                    dot.classList.remove('bg-black', 'scale-125');
                                                    dot.classList.add('bg-gray-300');
                                                }
                                            });
                                        }}
                                    >
                                        {(previewTicket ? [previewTicket, ...visibleStack] : visibleStack).map((t, i) => {
                                            const theme = TICKET_THEMES[t.color_theme || 'silver'] || TICKET_THEMES.silver;
                                            const unitPrice = getTicketUnitPrice(t);
                                            const hasEarlyBirdPrice = getTicketEarlyBirdRemaining(t) > 0 && unitPrice < (t.price || 0);
                                            return (
                                                <div key={`swipe-${t.id}-${i}`} className="w-full flex-shrink-0 snap-center flex justify-center px-4">
                                                    <div className="group relative w-full max-w-[380px] mx-auto [perspective:1600px]">
                                                        <div className={`relative flex flex-col justify-between overflow-visible rounded-[2rem] border ${theme.border} ${theme.gradient} px-6 py-6 backdrop-blur-sm shadow-xl min-h-[14rem]`}>
                                                            <span className={`pointer-events-none absolute inset-y-6 -right-3 z-0 h-10 w-10 rounded-full border ${theme.border} bg-white/40`} aria-hidden="true" />
                                                            <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                                                            <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                                                            <div className="relative z-10 flex items-start justify-between gap-3">
                                                                <div className="space-y-1.5 flex-1 min-w-0 text-left">
                                                                    <p className={`text-xs uppercase tracking-[0.28em] ${theme.text} opacity-60`}>
                                                                        {event?.title || 'Event Name'}
                                                                    </p>
                                                                    <h3 className={`text-lg font-semibold ${theme.text} line-clamp-2 break-words`}>
                                                                        {t.label}
                                                                    </h3>
                                                                </div>
                                                            </div>

                                                            <div className="relative z-10 mt-6 flex items-end justify-between gap-2">
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex flex-wrap items-baseline gap-2">
                                                                        <span className={`text-3xl font-bold ${theme.text} truncate`}>
                                                                            {unitPrice === 0 ? 'Free' : formatPrice(unitPrice)}
                                                                        </span>
                                                                    </div>
                                                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-white/20 border-white/20 ${theme.text} w-fit opacity-80`}>
                                                                        {hasEarlyBirdPrice ? 'EARLY BIRD' : 'PER GUEST'}
                                                                    </span>
                                                                </div>

                                                                <div className="flex flex-col items-end gap-1">
                                                                    <div className={`p-1 bg-white rounded-lg shadow-sm border ${theme.border}`}>
                                                                        <QRCodeSVG
                                                                            value={`TICKET-${t.id}`}
                                                                            size={48}
                                                                            level="M"
                                                                            includeMargin={false}
                                                                            fgColor="currentColor"
                                                                            bgColor="transparent"
                                                                        />
                                                                    </div>
                                                                    <p className={`text-[8px] font-mono opacity-60 ${theme.text}`}>#{t.id.substring(0, 8).toUpperCase()}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Pagination Dots (Mobile Only) */}
                                    {(previewTicket ? [previewTicket, ...visibleStack] : visibleStack).length > 1 && (
                                        <div className="lg:hidden absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                                            {(previewTicket ? [previewTicket, ...visibleStack] : visibleStack).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`ticket-dot h-1.5 w-1.5 rounded-full transition-all duration-300 ${i === 0 ? 'bg-black scale-125' : 'bg-gray-300'}`}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Desktop Stack View */}
                                    <div className="hidden lg:flex flex-col items-center w-full pt-8 min-h-[500px]">
                                        <AnimatePresence mode="popLayout">
                                            {(() => {
                                                const deck = (previewTicket ? [...visibleStack.slice().reverse(), previewTicket] : [...visibleStack.slice().reverse()]).slice(0, 4);
                                                return deck.map((t, i) => {
                                                    const theme = TICKET_THEMES[t.color_theme || 'silver'] || TICKET_THEMES.silver;
                                                    const unitPrice = getTicketUnitPrice(t);
                                                    const hasEarlyBirdPrice = getTicketEarlyBirdRemaining(t) > 0 && unitPrice < (t.price || 0);
                                                    const total = deck.length;
                                                    const zIndex = 10 + i;
                                                    const scale = 1 - ((total - 1 - i) * 0.04);
                                                    const mt = i === 0 ? 'mt-0' : '-mt-20 sm:-mt-28';

                                                    return (
                                                        <motion.div
                                                            key={`stack-${t.id}-${i}`}
                                                            layout
                                                            initial={{ opacity: 0, y: 30, scale: 0.9 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                                                            transition={{
                                                                type: 'spring',
                                                                stiffness: 500,
                                                                damping: 35,
                                                                mass: 0.5,
                                                                layout: { duration: 0.15 }
                                                            }}
                                                            whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
                                                            className={`flex w-full flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3 w-full self-center cursor-pointer ${mt}`}
                                                            style={{ zIndex }}
                                                        >
                                                            <div
                                                                className="group relative w-full max-w-[380px] sm:max-w-[420px] min-h-[14rem] sm:min-h-[15rem] [perspective:1600px] mx-auto"
                                                                style={{
                                                                    transform: `scale(${scale})`,
                                                                    transformOrigin: 'center top',
                                                                    filter: 'none',
                                                                    transition: 'transform 320ms, filter 240ms',
                                                                }}
                                                            >
                                                                <div className={`relative flex flex-col justify-between overflow-visible rounded-[2rem] border ${theme.border} ${theme.gradient} px-6 py-6 backdrop-blur-sm shadow-xl min-h-[14rem] sm:min-h-[15rem]`}>
                                                                    <span className={`pointer-events-none absolute inset-y-6 -right-3 z-0 h-10 w-10 rounded-full border ${theme.border} bg-white/40`} aria-hidden="true" />
                                                                    <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                                                                    <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                                                                    <div className="relative z-10 flex items-start justify-between gap-3">
                                                                        <div className="space-y-1.5 flex-1 min-w-0 text-left">
                                                                            <p className={`text-xs uppercase tracking-[0.28em] ${theme.text} opacity-60`}>
                                                                                {event?.title || 'Event Name'}
                                                                            </p>
                                                                            <h3 className={`text-lg font-semibold ${theme.text} line-clamp-2 break-words`}>
                                                                                {t.label}
                                                                            </h3>
                                                                        </div>
                                                                    </div>

                                                                    <div className="relative z-10 mt-6 flex items-end justify-between gap-2">
                                                                        <div className="flex flex-col gap-2">
                                                                                <div className="flex flex-wrap items-baseline gap-2">
                                                                                    <span className={`text-3xl font-bold ${theme.text} truncate`}>
                                                                                        {unitPrice === 0 ? 'Free' : formatPrice(unitPrice)}
                                                                                    </span>
                                                                                </div>
                                                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-white/20 border-white/20 ${theme.text} w-fit opacity-80`}>
                                                                                {hasEarlyBirdPrice ? 'EARLY BIRD' : 'PER GUEST'}
                                                                            </span>
                                                                        </div>

                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <div className={`p-1 bg-white rounded-lg shadow-sm border ${theme.border}`}>
                                                                                <QRCodeSVG
                                                                                    value={`TICKET-${t.id}`}
                                                                                    size={48}
                                                                                    level="M"
                                                                                    includeMargin={false}
                                                                                    fgColor="currentColor"
                                                                                    bgColor="transparent"
                                                                                />
                                                                            </div>
                                                                            <p className={`text-[8px] font-mono opacity-60 ${theme.text}`}>#{t.id.substring(0, 8).toUpperCase()}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                });
                                            })()}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[240px] text-gray-300 border-2 border-dashed border-gray-100 rounded-3xl w-full max-w-[400px]">
                                    <Ticket className="w-10 h-10 opacity-20 mb-4" />
                                    <p className="text-sm font-medium">Select a ticket to preview</p>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
