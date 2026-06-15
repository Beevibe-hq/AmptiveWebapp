import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {  Plus, Minus, ChevronDown, CheckCircle2, Ticket , Loader2 } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { toastError, toastSuccess } from '@/lib/ui/toast';
import { TICKET_THEMES } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUser } from '@/lib/api/auth';
import { getEvent } from '@/lib/api/events';
import { EventTicket, getTicketsForEvent } from '@/lib/api/tickets';
import { checkoutTicket, type CheckoutItem, type Attendee, type CheckoutRequest } from '@/lib/api/tickets';
import { UserProfile } from '@/lib/api/services';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';

type EventRecord = {
    id: string;
    title: string;
    start_time?: string | null;
    venue?: string | null;
    user_id?: string | null;
    event_id?: string;
};

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
    const [wantsPhysicalDelivery, setWantsPhysicalDelivery] = useState(false);
    const [lastDirection, setLastDirection] = useState(1);
    const [checkoutStep, setCheckoutStep] = useState<'selection' | 'attendees' | 'summary'>('selection');
    const [attendees, setAttendees] = useState<Array<{ ticketId: string; name: string; email: string; phone?: string; isMe: boolean }>>([]);
    const [showBulkForm, setShowBulkForm] = useState(false);

    const isGuest = !currentUser;

    const PHYSICAL_DELIVERY_FEE = 5000;

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

                const eventData = await getEvent(id);
                if (!eventData) throw new Error('Event not found');
                setEvent({
                    ...eventData,
                    id: eventData.event_id || '',
                    title: eventData.title || '',
                    start_time: eventData.scheduled_for || null,
                    venue: eventData.location?.venue || null,
                    user_id: eventData.host?.user_id || null,
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

    const updateQuantity = (ticketId: string, delta: number) => {
        setLastDirection(delta > 0 ? 1 : -1);
        setSelection(prev => {
            const current = prev[ticketId] || 0;
            const next = Math.max(0, current + delta);

            if (delta > 0) {
                setSelectedTicketIdForPreview(ticketId);
            }

            if (next === 0) {
                const { [ticketId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [ticketId]: next };
        });
    };

    const toggleBenefits = (ticketId: string) => {
        setShowBenefits(prev => ({
            ...prev,
            [ticketId]: !prev[ticketId]
        }));
    };

    const ticketCost = tickets.reduce((sum, ticket) => {
        return sum + (ticket.price || 0) * (selection[ticket.id] || 0);
    }, 0);

    const totalAmount = ticketCost + (wantsPhysicalDelivery ? PHYSICAL_DELIVERY_FEE : 0);

    const handlePayment = async () => {
        // if (!currentUser) {
        //     navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        //     return;
        // }
        if (!event) return;

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
            const items: CheckoutItem[] = Object.entries(selection).map(([ticketId, qty]) => ({
                ticket_type_id: ticketId,
                quantity: qty,
            }));

            const attendeesList: Attendee[] = attendees.map(a => ({
                ticket_type_id: a.ticketId,
                name: a.name.trim(),
                email: a.email.trim() || undefined,
                phone: a.phone?.trim() || undefined,
                is_me: a.isMe,
            }));

            const request: CheckoutRequest = {
                items,
                attendees: attendeesList,
                wants_physical_delivery: wantsPhysicalDelivery,
                metadata: {
                    physical_delivery_fee: wantsPhysicalDelivery ? PHYSICAL_DELIVERY_FEE : 0,
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
                            return { label: t?.label || 'Ticket', quantity: qty, price: t?.price || 0 };
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
            toastError(error.message || 'Checkout failed');
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
            <div className="flex min-h-screen items-center justify-center bg-white">
                <AmptiveSpinner className="h-8 w-8 animate-spin text-gray-900" />
            </div>
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
            <div className="space-y-6 bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Contact Information</h3>
                    <p className="text-sm text-gray-500 mt-1">We'll send your tickets to this email</p>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address <span className="text-red-500">*</span></label>
                        <input
                            type="email"
                            value={buyerEmail}
                            onChange={(e) => setBuyerEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none bg-gray-50/30 font-medium"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Full Name (Optional)</label>
                        <input
                            type="text"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            placeholder="Your full name"
                            className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none bg-gray-50/30 font-medium"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Phone Number (Optional)</label>
                        <input
                            type="tel"
                            value={buyerPhone}
                            onChange={(e) => setBuyerPhone(e.target.value)}
                            placeholder="+2348012345678"
                            className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none bg-gray-50/30 font-medium"
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
                        <p className="text-sm text-gray-500 mt-1">For your <span className="font-bold text-black">{ticketType?.label}</span> ticket</p>
                    </div>
                    <div className="space-y-6 bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                                <input
                                    type="checkbox"
                                    id="isMe"
                                    checked={attendees[0]?.isMe}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setAttendees(prev => [
                                            {
                                                ...prev[0],
                                                isMe: checked,
                                                name: checked ? (currentUser?.name || currentUser?.username || buyerName || '') : '',
                                                email: checked ? (currentUser?.email || buyerEmail || '') : ''
                                            }
                                        ]);
                                    }}
                                    className="h-5 w-5 rounded border-gray-300 text-black focus:ring-black"
                                />
                                <label htmlFor="isMe" className="text-sm font-bold text-gray-700 cursor-pointer">
                                    This ticket is for me
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={attendees[0]?.name || ''}
                                        onChange={(e) => setAttendees(prev => [{ ...prev[0], name: e.target.value, isMe: false }])}
                                        placeholder="Enter attendee name"
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none bg-gray-50/30 font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={attendees[0]?.email || ''}
                                        onChange={(e) => setAttendees(prev => [{ ...prev[0], email: e.target.value, isMe: false }])}
                                        placeholder="Enter attendee email"
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none bg-gray-50/30 font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Phone Number (Optional)</label>
                                    <input
                                        type="tel"
                                        value={attendees[0]?.phone || ''}
                                        onChange={(e) => setAttendees(prev => [{ ...prev[0], phone: e.target.value }])}
                                        placeholder="Enter phone number"
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:border-black focus:ring-1 focus:ring-black transition-all outline-none bg-gray-50/30 font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {guestInfoSection}
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
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`isMe-${idx}`}
                                                checked={attendee.isMe}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
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
                                                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                                            />
                                            <label htmlFor={`isMe-${idx}`} className="text-xs font-bold text-gray-600">This ticket is for me</label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
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
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
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
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`isMe-${idx}`}
                                                checked={attendee.isMe}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
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
                                                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                                            />
                                            <label htmlFor={`isMe-${idx}`} className="text-xs font-bold text-gray-600">This ticket is for me</label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
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
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
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
                            setAttendees(prev => prev.map(a => ({
                                ...a,
                                name: currentUser?.name || '',
                                email: currentUser?.email || '',
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

                    <button
                        onClick={() => {
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
                    <h1 className="text-[28px] md:text-[40px] font-bold text-gray-900 leading-tight tracking-tight" style={{ letterSpacing: '-0.04em' }}>
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
                            <div className="space-y-8">
                                <h2 className="text-[24px] font-bold text-gray-900" style={{ letterSpacing: '-0.04em' }}>
                                    Available Tickets
                                </h2>

                                <div className="space-y-4">
                                    {tickets.map(ticket => {
                                        const isSelected = selectedTicketIdForPreview === ticket.id;
                                        const benefitsOpen = showBenefits[ticket.id] || false;

                                        return (
                                            <div
                                                key={ticket.id}
                                                className={`group relative overflow-hidden border rounded-2xl transition-all duration-300 ${isSelected ? 'border-gray-200 bg-gray-50/50' : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'}`}
                                                onClick={() => setSelectedTicketIdForPreview(ticket.id)}
                                            >
                                                <div className="py-3 px-5 flex items-center justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-gray-900 truncate">{ticket.label}</h3>
                                                            <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-tight">
                                                                {ticket.price === 0 ? 'Free' : formatPrice(ticket.price)}
                                                            </p>
                                                            {ticket.quantity_remaining !== undefined && ticket.quantity_remaining <= 0 && (
                                                                <span className="text-xs font-bold text-red-600 mt-1 block">Sold Out</span>
                                                            )}
                                                            {ticket.quantity_remaining !== undefined && ticket.quantity_remaining > 0 && ticket.quantity_remaining <= 10 && (
                                                                <span className="text-xs font-bold text-amber-600 mt-1 block">Only {ticket.quantity_remaining} left</span>
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
                                                            disabled={ticket.quantity_remaining !== null && ticket.quantity_remaining !== undefined && (selection[ticket.id] || 0) >= ticket.quantity_remaining}
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

                                <div className="pt-10 border-t border-gray-100 space-y-6">
                                    {/* Physical Ticket Delivery */}
                                    <div className={`flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 ${wantsPhysicalDelivery ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                                        <div className="pt-0.5">
                                            <input
                                                type="checkbox"
                                                id="physicalTickets"
                                                checked={wantsPhysicalDelivery}
                                                onChange={(e) => setWantsPhysicalDelivery(e.target.checked)}
                                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <label htmlFor="physicalTickets" className="text-base font-bold text-gray-900 cursor-pointer flex items-center gap-3">
                                                <span>Physical Ticket Delivery</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${wantsPhysicalDelivery ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                                    ₦5,000
                                                </span>
                                            </label>
                                            <p className="mt-1 text-sm text-gray-500 leading-relaxed font-medium">
                                                Receive high-quality printed tickets at your address. Perfect for keepsakes!
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between text-sm font-medium pt-2">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="text-gray-900">{formatPrice(ticketCost)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-gray-500">Service Fee</span>
                                        <span className="text-gray-900">{formatPrice(0)}</span>
                                    </div>
                                    {wantsPhysicalDelivery && (
                                        <div className="flex justify-between text-sm font-medium">
                                            <span className="text-gray-500">Delivery Fee</span>
                                            <span className="text-gray-900 font-bold text-blue-600">{formatPrice(PHYSICAL_DELIVERY_FEE)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-2xl font-black text-gray-900 pt-2">
                                        <span>Total</span>
                                        <span>{formatPrice(totalAmount)}</span>
                                    </div>

                                    <div className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl flex gap-3 mt-4">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-blue-900">Digital Ticket Delivery</p>
                                            <p className="text-xs text-blue-700/80 leading-relaxed">
                                                Sending to: <span className="font-bold">{currentUser?.email || 'guest@example.com'}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePayment}
                                        disabled={totalAmount <= 0 || processing}
                                        className="w-full py-5 rounded-full font-bold text-lg transition-all duration-300 transform active:scale-[0.98] bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                                Authenticating...
                                            </>
                                        ) : (
                                            `Continue ${formatPrice(totalAmount)}`
                                        )}
                                    </button>
                                    <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Secure checkout powered by Paystack
                                    </p>
                                </div>
                            </div>
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
                                                        <span className="font-bold text-gray-900">{formatPrice(ticket.price * quantity)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {wantsPhysicalDelivery && (
                                            <div className="flex justify-between items-center py-2 text-blue-600">
                                                <span className="text-sm font-bold">Physical Delivery Fee</span>
                                                <span className="font-bold">{formatPrice(PHYSICAL_DELIVERY_FEE)}</span>
                                            </div>
                                        )}

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
                                            `Confirm & Pay ${formatPrice(totalAmount)}`
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
                            <h2 className="hidden lg:block text-xl font-medium mb-8 pt-0 w-full text-left" style={{ letterSpacing: '-0.04em' }}>
                                Ticket Preview
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
                                                                    <span className={`text-3xl font-bold ${theme.text} truncate`}>
                                                                        {t.price === 0 ? 'Free' : formatPrice(t.price)}
                                                                    </span>
                                                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-white/20 border-white/20 ${theme.text} w-fit opacity-80`}>
                                                                        PER GUEST
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
                                                                            <span className={`text-3xl font-bold ${theme.text} truncate`}>
                                                                                {t.price === 0 ? 'Free' : formatPrice(t.price)}
                                                                            </span>
                                                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-white/20 border-white/20 ${theme.text} w-fit opacity-80`}>
                                                                                PER GUEST
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
