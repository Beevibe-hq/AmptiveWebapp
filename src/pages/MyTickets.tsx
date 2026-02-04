import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket as TicketIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = createClient();

type TicketPurchase = {
    id: string;
    ticket_id: string;
    event_id: string;
    ticket_type_id: string;
    status: string;
    purchase_date: string;
    qr_code_data: string;
    events?: {
        title: string;
        cover_image: string;
        start_time: string;
        venue: string;
        city: string;
        location_type: string;
    };
    metadata?: {
        price_paid: number;
        currency: string;
        physical_delivery: boolean;
    };
};

// Theme definitions copied from CreateEvent for consistency
type TicketTheme = 'silver' | 'bronze' | 'gold' | 'platinum' | 'obsidian';

const TICKET_THEMES: Record<TicketTheme, {
    name: string;
    gradient: string;
    border: string;
    text: string;
    badge: string;
    badgeText: string;
}> = {
    silver: {
        name: 'Silver',
        gradient: 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200',
        border: 'border-gray-200',
        text: 'text-gray-900',
        badge: 'bg-gray-100 border-gray-200',
        badgeText: 'text-gray-700'
    },
    bronze: {
        name: 'Bronze',
        gradient: 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200',
        border: 'border-orange-200',
        text: 'text-orange-900',
        badge: 'bg-orange-100 border-orange-200',
        badgeText: 'text-orange-800'
    },
    gold: {
        name: 'Gold',
        gradient: 'bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-200',
        border: 'border-yellow-200',
        text: 'text-yellow-900',
        badge: 'bg-yellow-100 border-yellow-200',
        badgeText: 'text-yellow-800'
    },
    platinum: {
        name: 'Platinum',
        gradient: 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200',
        border: 'border-slate-200',
        text: 'text-slate-900',
        badge: 'bg-slate-100 border-slate-200',
        badgeText: 'text-slate-700'
    },
    obsidian: {
        name: 'Obsidian',
        gradient: 'bg-gradient-to-br from-gray-800 via-gray-900 to-black',
        border: 'border-gray-700',
        text: 'text-white',
        badge: 'bg-gray-800 border-gray-700',
        badgeText: 'text-gray-300'
    }
};

const formatCompactPrice = (price: number, currency: string = 'NGN'): string => {
    if (price === 0) return 'Free';

    const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    });

    if (price >= 1000000) {
        return formatter.format(price / 1000000).replace(currency, '').trim() + 'M';
    }
    if (price >= 100000) {
        return formatter.format(price / 1000).replace(currency, '').trim() + 'K';
    }

    return formatter.format(price);
};

const MyTickets = () => {
    const [tickets, setTickets] = useState<TicketPurchase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('ticket_purchases')
                .select(`
          *,
          events!event_id (
            title,
            cover_image,
            start_time,
            venue,
            city,
            location_type
          ),
          event_tickets!ticket_type_id (
            color_theme,
            label
          )
        `)
                .eq('buyer_id', user.id)
                .order('purchase_date', { ascending: false });

            if (error) {
                console.error('Error fetching tickets:', error);
            } else {
                setTickets(data || []);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Tickets</h1>

                {tickets.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <TicketIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
                        <p className="text-gray-500 mb-6">You haven't purchased any tickets yet.</p>
                        <Link
                            to="/explore"
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-black hover:bg-gray-800 transition-colors"
                        >
                            Explore Events
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-8 justify-center">
                        {tickets.map((ticket, index) => {
                            // Map theme from event_tickets or default to silver
                            // @ts-ignore - event_tickets might not be fully typed in the specific Supabase generated types yet
                            const themeName = (ticket.event_tickets?.color_theme || 'silver') as TicketTheme;
                            const theme = TICKET_THEMES[themeName] || TICKET_THEMES['silver'];
                            const price = ticket.metadata?.price_paid || 0;
                            const currency = ticket.metadata?.currency || 'NGN';

                            return (<motion.div
                                key={ticket.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group relative w-full max-w-[360px] sm:max-w-[420px] min-h-[15rem] [perspective:1600px]"
                            >
                                <div className="relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                                    {/* Front */}
                                    <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-[2rem] border ${theme.border} ${theme.gradient} px-6 py-6 backdrop-blur-sm shadow-xl [backface-visibility:hidden]`}>
                                        <span className={`pointer-events-none absolute inset-y-6 -right-3 z-0 h-10 w-10 rounded-full border ${theme.border} bg-white/50`} aria-hidden="true" />
                                        <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                                        <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                                        <div className="relative z-10 flex items-start justify-between gap-3">
                                            <div className="space-y-1.5 flex-1 min-w-0">
                                                <p className={`text-xs uppercase tracking-[0.28em] ${theme.text} opacity-60`}>
                                                    {ticket.events?.start_time ? format(new Date(ticket.events.start_time), 'MMM d, yyyy') : 'DATE TBA'}
                                                </p>
                                                <p className={`text-lg font-semibold ${theme.text} line-clamp-2 break-words`}>
                                                    {ticket.events?.title || 'Unknown Event'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 mt-6 flex items-baseline justify-between gap-2">
                                            <span className={`text-3xl font-bold ${theme.text} truncate`}>
                                                {formatCompactPrice(price, currency)}
                                            </span>
                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${theme.badge} ${theme.badgeText} flex-shrink-0 opacity-80`}>
                                                Per guest
                                            </span>
                                        </div>
                                    </div>

                                    {/* Back */}
                                    <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-[2rem] border ${theme.border} ${theme.gradient} px-6 py-6 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]`}>
                                        <span className={`pointer-events-none absolute inset-y-6 -right-3 z-0 h-10 w-10 rounded-full border ${theme.border} bg-white/50`} aria-hidden="true" />
                                        <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                                        <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                                        <div className="relative z-10 space-y-4">
                                            <div className="space-y-2">
                                                <p className={`text-xs uppercase tracking-[0.32em] ${theme.text} opacity-60`}>Event Details</p>
                                                <ul className={`space-y-2 text-sm ${theme.text} opacity-90 list-disc list-inside`}>
                                                    <li className="leading-snug flex items-center gap-2">
                                                        <MapPin className="w-4 h-4" />
                                                        <span className="truncate">
                                                            {ticket.events?.location_type === 'online' ? 'Online' : ticket.events?.city || 'Venue TBA'}
                                                        </span>
                                                    </li>
                                                    <li className="leading-snug flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>
                                                            {ticket.events?.start_time ? format(new Date(ticket.events.start_time), 'h:mm a') : 'Time TBA'}
                                                        </span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="relative z-10 mt-4 flex items-center justify-between">
                                            <span className={`text-xl font-semibold ${theme.text}`}>
                                                {formatCompactPrice(price, currency)}
                                            </span>
                                        </div>

                                        {/* QR Code & Ticket ID - Bottom Right */}
                                        <div className={`absolute bottom-4 right-4 z-20 flex flex-col items-end gap-1 ${theme.text}`}>
                                            <QRCodeSVG
                                                value={ticket.qr_code_data}
                                                size={72}
                                                level="M"
                                                includeMargin={false}
                                                fgColor="currentColor"
                                                bgColor="transparent"
                                            />
                                            <p className="text-[9px] font-mono opacity-60">{ticket.ticket_id}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="hidden mt-6 text-xs text-gray-400 text-center w-full lg:block absolute -bottom-8">
                                    Hover to flip
                                </p>
                            </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyTickets;
