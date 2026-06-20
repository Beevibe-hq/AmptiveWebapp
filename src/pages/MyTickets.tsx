import { useEffect, useState, useCallback, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Ticket as TicketIcon, X, ChevronDown, User, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPurchasesByUser, transferTicket, type TicketPurchase } from '@/lib/api/purchases';
import { getEvent } from '@/lib/api/events';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';
import { TICKET_THEMES } from '@/lib/constants';
import { toastError, toastSuccess } from '@/lib/ui/toast';
import amptiveLogo from '@/assets/amptivelogo.svg';

const CARD_PLACEHOLDER_GRADIENTS = [
    'from-[#2d1b69] via-[#312558] to-[#10142a]',
    'from-[#0f172a] via-[#1e293b] to-[#111827]',
    'from-[#1b1a55] via-[#2d3a8c] to-[#0b172d]',
    'from-[#2f2346] via-[#3b1d6b] to-[#120c1f]',
];

interface GroupedEvent {
    event_id: string;
    tickets: TicketPurchase[];
    // Convenience accessors from the first ticket
    event: TicketPurchase['events'];
    start_time: string | undefined;
}

type TicketDetailOverride = {
    attendee_name?: string;
    attendee_email?: string;
    attendee_phone?: string;
};

const TICKET_DETAIL_OVERRIDES_KEY = 'amptive.my_tickets.detail_overrides';

const readTicketDetailOverrides = (): Record<string, TicketDetailOverride> => {
    try {
        const stored = localStorage.getItem(TICKET_DETAIL_OVERRIDES_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
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

const safeDateFormat = (dateString?: string, formatStr: string = 'PPP') => {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        return format(date, formatStr);
    } catch {
        return null;
    }
};

const formatDateLabel = (iso?: string) => {
    if (!iso) return 'Date to be announced';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Date to be announced';
    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const formatTimeLabel = (iso?: string) => {
    if (!iso) return 'Time TBA';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Time TBA';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour12 = ((hours % 12) + 12) % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}${suffix}`;
};

const MyTickets = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<TicketPurchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('Upcoming');
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [expandedQR, setExpandedQR] = useState<string | null>(null);
    const [viewingTicketCard, setViewingTicketCard] = useState<{group: GroupedEvent, ticket: TicketPurchase} | null>(null);
    const [editingTicket, setEditingTicket] = useState<TicketPurchase | null>(null);
    const [transferringTicket, setTransferringTicket] = useState<TicketPurchase | null>(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
    const [transferEmail, setTransferEmail] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);
    const [ticketOverrides, setTicketOverrides] = useState<Record<string, TicketDetailOverride>>(() => readTicketDetailOverrides());
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
    const [eventDetails, setEventDetails] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const data = await getPurchasesByUser();
            setTickets(data || []);
        } catch (err) {
            console.error('Unexpected error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    const ticketsWithOverrides = useMemo(() => {
        return tickets.map(ticket => ({
            ...ticket,
            ...(ticketOverrides[ticket.id] || {}),
        }));
    }, [tickets, ticketOverrides]);

    const openEditTicket = (ticket: TicketPurchase) => {
        setEditingTicket(ticket);
        setEditForm({
            name: ticket.attendee_name || '',
            email: ticket.attendee_email || '',
            phone: (ticket as TicketPurchase & { attendee_phone?: string }).attendee_phone || '',
        });
    };

    const saveTicketDetails = () => {
        if (!editingTicket) return;
        const nextOverrides = {
            ...ticketOverrides,
            [editingTicket.id]: {
                attendee_name: editForm.name.trim(),
                attendee_email: editForm.email.trim(),
                attendee_phone: editForm.phone.trim(),
            },
        };
        setTicketOverrides(nextOverrides);
        localStorage.setItem(TICKET_DETAIL_OVERRIDES_KEY, JSON.stringify(nextOverrides));
        setViewingTicketCard(prev => {
            if (!prev || prev.ticket.id !== editingTicket.id) return prev;
            return {
                ...prev,
                ticket: {
                    ...prev.ticket,
                    ...nextOverrides[editingTicket.id],
                },
            };
        });
        setEditingTicket(null);
    };

    const openTransferTicket = (ticket: TicketPurchase) => {
        setTransferringTicket(ticket);
        setTransferEmail('');
    };

    const submitTransferTicket = async () => {
        if (!transferringTicket || transferLoading) return;
        const email = transferEmail.trim();
        const ticketCode = transferringTicket.ticket_code || transferringTicket.id;
        if (!email) {
            toastError('Enter the recipient email.');
            return;
        }
        setTransferLoading(true);
        const result = await transferTicket(ticketCode, email);
        setTransferLoading(false);
        if (!result.ok) {
            toastError(result.error || 'We could not transfer this ticket.');
            return;
        }
        toastSuccess('Ticket transferred successfully.');
        setTransferringTicket(null);
        setViewingTicketCard(null);
        await fetchTickets();
    };

    useEffect(() => {
        if (tickets.length === 0) return;
        const fetchMissingEventDetails = async () => {
        const uniqueEventIds = [...new Set(ticketsWithOverrides.map(t => t.event_id))];
            for (const eventId of uniqueEventIds) {
                if (eventDetails[eventId]) continue;
                try {
                    const event = await getEvent(eventId);
                    if (event) {
                        setEventDetails(prev => ({
                            ...prev,
                            [eventId]: event
                        }));
                    }
                } catch (err) {
                    console.error(`Error fetching details for event ${eventId}:`, err);
                }
            }
        };
        fetchMissingEventDetails();
    }, [ticketsWithOverrides, eventDetails]);

    const now = new Date();

    // Group tickets by event_id
    const groupedEvents: GroupedEvent[] = useMemo(() => {
        const map = new Map<string, TicketPurchase[]>();
        ticketsWithOverrides.forEach((ticket) => {
            const key = ticket.event_id;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(ticket);
        });
        return Array.from(map.entries()).map(([event_id, eventTickets]) => {
            const fetchedEvent = eventDetails[event_id];
            const apiEvent = eventTickets[0].events;

            // Merge details: fallback to fetchedEvent properties if apiEvent has blank/missing values
            const mergedEvent = {
                title: apiEvent?.title || fetchedEvent?.title || 'Unknown Event',
                cover_image: apiEvent?.cover_image || fetchedEvent?.cover_image || fetchedEvent?.thumbnail_url || '',
                start_time: apiEvent?.start_time || fetchedEvent?.start_time || fetchedEvent?.scheduled_for || '',
                venue: apiEvent?.venue || fetchedEvent?.venue?.name || fetchedEvent?.location?.venue || fetchedEvent?.venue || '',
                city: apiEvent?.city || fetchedEvent?.venue?.city || fetchedEvent?.location?.city || fetchedEvent?.city || '',
                location_type: apiEvent?.location_type || fetchedEvent?.venue?.venue_type || fetchedEvent?.location?.type || 'physical',
            };

            return {
                event_id,
                tickets: eventTickets,
                event: mergedEvent,
                start_time: mergedEvent.start_time || undefined,
            };
        });
    }, [ticketsWithOverrides, eventDetails]);

    const filteredGroups = groupedEvents
        .filter((group) => {
            const eventDate = group.start_time ? new Date(group.start_time) : null;
            if (activeFilter === 'Upcoming') {
                return !eventDate || eventDate >= now;
            }
            if (activeFilter === 'Past') {
                return eventDate && eventDate < now;
            }
            return true;
        })
        .sort((a, b) => {
            const dateA = a.start_time ? new Date(a.start_time).getTime() : 0;
            const dateB = b.start_time ? new Date(b.start_time).getTime() : 0;
            if (activeFilter === 'Past') return dateB - dateA;
            return dateA - dateB;
        });

    const renderGroupedCard = useCallback(
        (group: GroupedEvent, index: number) => {
            const isPast = group.start_time ? new Date(group.start_time) < now : false;
            const firstTicket = group.tickets[0];
            const ticketCount = group.tickets.length;
            const totalPaid = group.tickets.reduce((sum, t) => sum + (t.metadata?.price_paid || 0), 0);
            const currency = firstTicket.metadata?.currency || 'NGN';

            const iconColorClass = isPast ? 'text-gray-400' : 'text-red-500';
            const accentTextClass = isPast ? 'text-gray-500' : 'text-black';
            const cardBorderClasses = isPast
                ? 'border-gray-200 hover:border-gray-300'
                : 'border-black/10 hover:border-black/40';

            const mobileHorizontalDashClass = isPast
                ? 'bg-[repeating-linear-gradient(to_right,rgba(148,163,184,0.6),rgba(148,163,184,0.6)_8px,transparent_8px,transparent_16px)]'
                : 'bg-[repeating-linear-gradient(to_right,rgba(0,0,0,0.65),rgba(0,0,0,0.65)_8px,transparent_8px,transparent_16px)]';
            const mobileVerticalDashClass = isPast
                ? 'bg-[repeating-linear-gradient(to_bottom,rgba(148,163,184,0.5),rgba(148,163,184,0.5)_8px,transparent_8px,transparent_16px)]'
                : 'bg-[repeating-linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.55)_8px,transparent_8px,transparent_16px)]';
            const desktopVerticalDashClass = mobileVerticalDashClass;
            const desktopHorizontalDashClass = mobileHorizontalDashClass;

            const isExpanded = expandedCard === group.event_id;

            // Collect unique ticket tier names from the group
            const tierNames = [...new Set(group.tickets.map((t) => {
                const themeName = t.color_theme || 'silver';
                return TICKET_THEMES[themeName]?.name || 'Silver';
            }))];

            return (
                <motion.div
                    key={group.event_id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3 min-w-0 w-full"
                >
                    {/* Time connector column */}
                    {!isPast && (
                        <>
                            {/* Mobile time and connector */}
                            <div className="flex items-center gap-3 sm:hidden">
                                <span className={`text-sm font-semibold ${accentTextClass}`}>
                                    {formatTimeLabel(group.start_time)}
                                </span>
                                <div className="relative flex-1 h-6">
                                    <div className={`absolute left-0 right-2 top-1/2 h-px -translate-y-1/2 ${mobileHorizontalDashClass}`} />
                                    <div className={`absolute right-2 top-1/2 h-6 w-px ${mobileVerticalDashClass}`} />
                                </div>
                            </div>

                            {/* Desktop time column */}
                            <div className="hidden sm:flex sm:w-20 sm:flex-col sm:items-center sm:pt-1">
                                <div className="text-center">
                                    <span className={`text-sm font-semibold ${accentTextClass}`}>
                                        {formatTimeLabel(group.start_time)}
                                    </span>
                                </div>
                                <div className="relative mt-3 flex-1 w-full">
                                    <div className={`absolute left-1/2 right-0 top-0 bottom-1/2 -translate-x-1/2 w-px ${desktopVerticalDashClass}`} />
                                    <div className={`absolute left-1/2 right-[-0.75rem] top-1/2 h-px -translate-y-1/2 ${desktopHorizontalDashClass}`} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* The card itself */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/events/${group.event_id}`)}
                        onKeyDown={(evt) => {
                            if (evt.key === 'Enter' || evt.key === ' ') {
                                evt.preventDefault();
                                navigate(`/events/${group.event_id}`);
                            }
                        }}
                        className={`relative w-full flex-1 overflow-hidden rounded-2xl border bg-gradient-to-br from-gray-100 via-orange-50/20 to-gray-100 text-sm shadow-sm shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2 focus:ring-offset-gray-100 sm:ml-0 ${cardBorderClasses}`}
                    >
                        <div className="relative z-10 flex flex-row gap-2.5 p-2.5 sm:items-start sm:gap-4 sm:p-5">
                            {/* Left content */}
                            <div className="flex-1 flex flex-col text-left min-w-0">
                                {/* Date row */}
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium uppercase tracking-[0.12em] sm:tracking-[0.18em] text-gray-500">
                                    <svg className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${iconColorClass}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                                    </svg>
                                    <span>{formatDateLabel(group.start_time)}</span>
                                </div>

                                {/* Title */}
                                <h3 className="mt-2.5 sm:mt-3 text-lg sm:text-2xl font-semibold text-gray-900 truncate" title={group.event?.title}>
                                    {group.event?.title || 'Unknown Event'}
                                </h3>

                                {/* Location */}
                                <p className="mt-1 text-xs sm:text-base font-medium text-gray-700">
                                    {group.event?.location_type === 'online' ? 'Online' : group.event?.venue || group.event?.city || 'Venue TBA'}
                                </p>

                                {/* Ticket count + tiers + total paid */}
                                <div className="mt-2.5 sm:mt-3.5 flex flex-wrap items-center gap-2">
                                    {/* Ticket count badge */}
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold ${isPast ? 'border border-black/10 bg-white/60 text-gray-800' : 'border border-black/10 bg-white text-gray-800'}`}>
                                        <TicketIcon className="w-3 h-3 flex-shrink-0" />
                                        <span>{ticketCount} {ticketCount === 1 ? 'Ticket' : 'Tickets'}</span>
                                    </span>

                                    {/* Tier badges */}
                                    {tierNames.map((tierName) => {
                                        const themeKey = Object.keys(TICKET_THEMES).find(k => TICKET_THEMES[k]?.name === tierName) || 'silver';
                                        const theme = TICKET_THEMES[themeKey] || TICKET_THEMES['silver'];
                                        return (
                                            <span
                                                key={tierName}
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold ${isPast ? 'border border-black/10 bg-white/60 text-gray-800' : 'border border-blue-200 bg-blue-50 text-blue-800'}`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${theme.gradient} border border-black/10 flex-shrink-0`} />
                                                <span>{tierName}</span>
                                            </span>
                                        );
                                    })}

                                    {/* Total paid */}
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold ${isPast ? 'border border-black/10 bg-white/60 text-gray-700' : 'border border-blue-200 bg-blue-50 text-blue-700'}`}>
                                        {formatCompactPrice(totalPaid, currency)}
                                    </span>
                                </div>

                                {/* Attendee summary for single ticket */}
                                {ticketCount === 1 && firstTicket.attendee_name && (
                                    <div className="mt-2 sm:mt-3 flex flex-col gap-0.5">
                                        <p className="text-[11px] sm:text-xs text-gray-500">
                                            <span className="font-semibold text-gray-700">{firstTicket.attendee_name}</span>
                                            {firstTicket.attendee_email && <span className="text-gray-400"> · {firstTicket.attendee_email}</span>}
                                        </p>
                                        <p className="text-[9px] sm:text-[10px] font-mono text-gray-400 tracking-wider">
                                            #{firstTicket.ticket_code || firstTicket.id.slice(0, 10)}
                                        </p>
                                    </div>
                                )}

                                {/* Attendee summary for multiple tickets */}
                                {ticketCount > 1 && (
                                    <div className="mt-2 sm:mt-3">
                                        <p className="text-[11px] sm:text-xs text-gray-500">
                                            {group.tickets.filter(t => t.attendee_name).slice(0, 2).map(t => t.attendee_name).join(', ')}
                                            {group.tickets.filter(t => t.attendee_name).length > 2 && (
                                                <span className="text-gray-400"> +{group.tickets.filter(t => t.attendee_name).length - 2} more</span>
                                            )}
                                        </p>
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="mt-auto w-full pt-3 sm:pt-6 text-left flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-black/10 bg-white px-3.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.10em] sm:tracking-[0.15em] text-gray-900 transition hover:border-black/40 hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            navigate(`/events/${group.event_id}`);
                                        }}
                                    >
                                        <span>{isPast ? 'View Recap' : 'View Event'}</span>
                                        <svg aria-hidden="true" className="h-3 w-3 sm:h-3.5 sm:w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.44 9.25H4.5a.75.75 0 0 0 0 1.5h8.94l-2.22 2.22a.75.75 0 1 0 1.06 1.06l3.5-3.5a.75.75 0 0 0 0-1.06l-3.5-3.5a.75.75 0 1 0-1.06 1.06l2.22 2.22Z" />
                                        </svg>
                                    </button>

                                    {ticketCount === 1 && (
                                        <>
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.10em] text-gray-900 transition hover:border-black/40 hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setViewingTicketCard({ group, ticket: firstTicket });
                                                }}
                                            >
                                                <TicketIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                <span>View Pass</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.10em] text-gray-900 transition hover:border-black/40 hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    openEditTicket(firstTicket);
                                                }}
                                            >
                                                <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.10em] text-gray-900 transition hover:border-black/40 hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    openTransferTicket(firstTicket);
                                                }}
                                            >
                                                <span>Transfer</span>
                                            </button>
                                        </>
                                    )}

                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.10em] text-gray-900 transition hover:border-black/40 hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setExpandedCard(isExpanded ? null : group.event_id);
                                            // Reset any individual QR expansion when toggling the card
                                            setExpandedQR(null);
                                        }}
                                    >
                                        <TicketIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                        <span>{ticketCount === 1 ? 'QR Code' : `${ticketCount} Passes`}</span>
                                        {ticketCount > 1 && (
                                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Cover image – right side */}
                            <div className="flex-shrink-0 self-start sm:self-start">
                                <div className="relative aspect-square w-16 sm:w-24 md:w-28 lg:w-40 xl:w-48 overflow-hidden rounded-xl">
                                    {group.event?.cover_image && !failedImages.has(group.event_id) ? (
                                        <img
                                            src={group.event.cover_image}
                                            alt={group.event.title}
                                            className={`h-full w-full object-cover ${isPast ? 'grayscale' : ''}`}
                                            loading="lazy"
                                            onError={() =>
                                                setFailedImages((prev) => {
                                                    const next = new Set(prev);
                                                    next.add(group.event_id);
                                                    return next;
                                                })
                                            }
                                        />
                                    ) : (
                                        <div
                                            className={`flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br ${CARD_PLACEHOLDER_GRADIENTS[index % CARD_PLACEHOLDER_GRADIENTS.length]} ${isPast ? 'opacity-90' : ''}`}
                                        >
                                            <img src={amptiveLogo} alt="Amptive" className="h-10 w-auto opacity-85 drop-shadow-[0_4px_14px_rgba(15,23,42,0.35)]" />
                                        </div>
                                    )}

                                    {/* Ticket count overlay badge (only when > 1) */}
                                    {ticketCount > 1 && (
                                        <div className="absolute top-1 right-1 bg-black/70 backdrop-blur-sm text-white text-[9px] sm:text-[10px] font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                                            {ticketCount}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Expandable Tickets / QR Section */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="border-t border-dashed border-black/10 mx-4 sm:mx-6" />

                                    {/* Individual ticket passes */}
                                    <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-3">
                                        {group.tickets.map((ticket, ticketIdx) => {
                                            const themeName = ticket.color_theme || 'silver';
                                            const theme = TICKET_THEMES[themeName] || TICKET_THEMES['silver'];
                                            const isThisQROpen = expandedQR === ticket.id;

                                            return (
                                                <div
                                                    key={ticket.id}
                                                    className="rounded-xl border border-black/5 bg-white/60 backdrop-blur-sm overflow-hidden"
                                                >
                                                    {/* Ticket row header */}
                                                    <div className="flex flex-wrap items-start gap-3 px-3.5 py-3 sm:flex-nowrap sm:items-center sm:px-4 sm:py-3.5">
                                                        {/* Number circle */}
                                                        <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-black/5 text-gray-700'}`}>
                                                            {ticketIdx + 1}
                                                        </div>

                                                        {/* Attendee info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                                                                {ticket.attendee_name || 'Attendee'}
                                                            </p>
                                                            <div className="mt-0.5 flex items-center gap-2">
                                                                <span className="text-[9px] sm:text-[10px] font-mono text-gray-400 tracking-wider">
                                                                    #{ticket.ticket_code || ticket.id.slice(0, 10)}
                                                                </span>
                                                                <span className={`hidden sm:inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${theme.gradient} border border-black/10 flex-shrink-0`} />
                                                                    {TICKET_THEMES[themeName]?.name || 'Silver'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <span className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold sm:hidden ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${theme.gradient} border border-black/10 flex-shrink-0`} />
                                                            {TICKET_THEMES[themeName]?.name || 'Silver'}
                                                        </span>

                                                        {/* QR toggle & View Pass buttons */}
                                                        <div className="flex w-full flex-wrap items-center gap-2 pt-1 sm:w-auto sm:flex-shrink-0 sm:flex-nowrap sm:pt-0">
                                                            <button
                                                                type="button"
                                                                className={`inline-flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[9px] sm:flex-none sm:text-[10px] font-semibold uppercase tracking-wider transition ${isThisQROpen ? 'bg-black text-white' : 'bg-black/5 text-gray-600 hover:bg-black/10'}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpandedQR(isThisQROpen ? null : ticket.id);
                                                                }}
                                                            >
                                                                <TicketIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                                QR
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[9px] sm:flex-none sm:text-[10px] font-semibold uppercase tracking-wider transition bg-black/5 text-gray-600 hover:bg-black hover:text-white"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setViewingTicketCard({ group, ticket });
                                                                }}
                                                            >
                                                                Pass
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[9px] sm:flex-none sm:text-[10px] font-semibold uppercase tracking-wider transition bg-black/5 text-gray-600 hover:bg-black hover:text-white"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditTicket(ticket);
                                                                }}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[9px] sm:flex-none sm:text-[10px] font-semibold uppercase tracking-wider transition bg-black/5 text-gray-600 hover:bg-black hover:text-white"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openTransferTicket(ticket);
                                                                }}
                                                            >
                                                                Transfer
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Expandable QR for this specific ticket */}
                                                    <AnimatePresence>
                                                        {isThisQROpen && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="border-t border-dashed border-black/5 mx-3.5" />
                                                                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 px-3.5 sm:px-4 py-4">
                                                                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                                                        <QRCodeSVG
                                                                            value={ticket.qr_code_data || ticket.ticket_code || ''}
                                                                            size={120}
                                                                            level="M"
                                                                            includeMargin={false}
                                                                            fgColor="#000000"
                                                                            bgColor="#ffffff"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-left">
                                                                        <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-gray-500 font-semibold">
                                                                            {ticket.ticket_code || ticket.id}
                                                                        </p>
                                                                        {ticket.attendee_email && (
                                                                            <p className="text-[10px] sm:text-[11px] text-gray-400">{ticket.attendee_email}</p>
                                                                        )}
                                                                        <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed max-w-[200px]">
                                                                            Present this QR code at the venue entrance.
                                                                        </p>
                                                                        <p className="text-[9px] text-gray-400 mt-0.5">
                                                                            Purchased {safeDateFormat(ticket.purchase_date, 'MMM d, yyyy') || 'recently'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            );
        },
        [navigate, expandedCard, expandedQR, failedImages]
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <AmptiveSpinner className="h-8 w-8 text-black" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-16 px-6 sm:px-10 lg:px-14">
            <div>
                {/* Page Header */}
                <header className="mb-4 md:mb-5 w-full flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
                            My Tickets
                        </h1>
                        <p className="hidden sm:block text-[15px] text-black/40 font-sans mt-1">
                            Your event passes and check-in codes, all in one place.
                        </p>
                    </div>
                </header>

                {/* Filter Pills – exactly matching DashboardEvents */}
                <div className="flex items-center mb-8 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setActiveFilter('Upcoming')}
                            className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'Upcoming' ? 'bg-[#F2F2F2] text-black' : 'bg-transparent text-black/60 hover:bg-black/5'}`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setActiveFilter('Past')}
                            className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'Past' ? 'bg-[#F2F2F2] text-black' : 'bg-transparent text-black/60 hover:bg-black/5'}`}
                        >
                            Past
                        </button>
                    </div>
                </div>

                {/* Ticket Cards */}
                {tickets.length === 0 ? (
                    <div className="text-center text-gray-500 border border-dashed border-gray-200 rounded-xl py-16 mb-8 mt-4 bg-white shadow-sm">
                        <div className="mx-auto mb-4 text-5xl">🎟️</div>
                        <h3 className="text-lg font-semibold text-gray-700">No tickets yet</h3>
                        <p className="mt-2 text-sm text-gray-500">You haven't purchased any event tickets yet.</p>
                        <Link
                            to="/explore"
                            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-black rounded-full hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                        >
                            <span>Explore Events</span>
                        </Link>
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center text-gray-500 border border-dashed border-gray-200 rounded-xl py-16 mb-8 mt-4 bg-white shadow-sm">
                        <div className="mx-auto mb-4 text-5xl">😮</div>
                        <h3 className="text-lg font-semibold text-gray-700">No {activeFilter.toLowerCase()} tickets</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            {activeFilter === 'Upcoming'
                                ? "You don't have any upcoming event tickets."
                                : "You don't have any past event tickets."}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 sm:gap-5">
                        {filteredGroups.map((group, index) => renderGroupedCard(group, index))}
                    </div>
                )}
            </div>

            {/* Edit Ticket Details Modal */}
            <AnimatePresence>
                {editingTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={() => setEditingTicket(null)}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 18 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                            className="relative z-10 w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/35">Ticket details</p>
                                    <h2 className="mt-1 text-[24px] font-semibold leading-tight text-black">Edit attendee</h2>
                                    <p className="mt-1 text-sm font-medium text-black/40">
                                        {editingTicket.ticket_code || editingTicket.id.slice(0, 10)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditingTicket(null)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/50 transition hover:bg-black/10 hover:text-black"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Full name</span>
                                    <input
                                        value={editForm.name}
                                        onChange={(event) => setEditForm(prev => ({ ...prev, name: event.target.value }))}
                                        placeholder="Attendee name"
                                        className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.03] px-4 text-sm font-medium text-black outline-none transition focus:border-black focus:bg-white"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Email</span>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(event) => setEditForm(prev => ({ ...prev, email: event.target.value }))}
                                        placeholder="name@example.com"
                                        className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.03] px-4 text-sm font-medium text-black outline-none transition focus:border-black focus:bg-white"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Phone</span>
                                    <input
                                        value={editForm.phone}
                                        onChange={(event) => setEditForm(prev => ({ ...prev, phone: event.target.value }))}
                                        placeholder="Optional"
                                        className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.03] px-4 text-sm font-medium text-black outline-none transition focus:border-black focus:bg-white"
                                    />
                                </label>
                            </div>

                            <div className="mt-7 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingTicket(null)}
                                    className="h-11 rounded-full px-5 text-sm font-semibold text-black/55 transition hover:bg-black/[0.04] hover:text-black"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveTicketDetails}
                                    disabled={!editForm.name.trim()}
                                    className="h-11 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Save changes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Transfer Ticket Modal */}
            <AnimatePresence>
                {transferringTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={() => setTransferringTicket(null)}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 18 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                            className="relative z-10 w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/35">Transfer ticket</p>
                                    <h2 className="mt-1 text-[24px] font-semibold leading-tight text-black">Send to another user</h2>
                                    <p className="mt-1 text-sm font-medium text-black/40">
                                        {transferringTicket.ticket_code || transferringTicket.id.slice(0, 10)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTransferringTicket(null)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/50 transition hover:bg-black/10 hover:text-black"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Recipient email</span>
                                <input
                                    type="email"
                                    value={transferEmail}
                                    onChange={(event) => setTransferEmail(event.target.value)}
                                    placeholder="recipient@example.com"
                                    className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.03] px-4 text-sm font-medium text-black outline-none transition focus:border-black focus:bg-white"
                                />
                            </label>
                            <p className="mt-3 text-sm font-medium leading-relaxed text-black/45">
                                This sends ownership of this ticket to the recipient email. It is different from editing attendee details.
                            </p>

                            <div className="mt-7 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setTransferringTicket(null)}
                                    className="h-11 rounded-full px-5 text-sm font-semibold text-black/55 transition hover:bg-black/[0.04] hover:text-black"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={submitTransferTicket}
                                    disabled={transferLoading || !transferEmail.trim()}
                                    className="h-11 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {transferLoading ? 'Transferring...' : 'Transfer ticket'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Ticket Pass Modal Overlay */}
            <AnimatePresence>
                {viewingTicketCard && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={() => setViewingTicketCard(null)}>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        
                        {/* Modal Container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="group relative w-full max-w-[360px] sm:max-w-[420px] h-[15rem] sm:h-[18rem] [perspective:1600px] mx-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {(() => {
                                const ticket = viewingTicketCard.ticket;
                                const group = viewingTicketCard.group;
                                const themeName = ticket.color_theme || 'silver';
                                const theme = TICKET_THEMES[themeName] || TICKET_THEMES['silver'];
                                const price = ticket.metadata?.price_paid || 0;
                                const currency = ticket.metadata?.currency || 'NGN';
                                const isEarlyBirdTicket = Boolean(
                                    ticket.metadata?.early_bird_applied ||
                                    (ticket.metadata?.base_price && price < ticket.metadata.base_price)
                                );
                                const event = group.event;

                                return (
                                    <>
                                        {/* Close Button */}
                                        <button 
                                            onClick={() => setViewingTicketCard(null)}
                                            className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors z-50 border border-white/20"
                                        >
                                            <X className="w-5 h-5 text-white" />
                                        </button>

                                        <div className="relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] cursor-pointer">
                                            {/* Front */}
                                            <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-[2rem] border ${theme.border} ${theme.gradient} px-6 py-6 backdrop-blur-sm shadow-xl [backface-visibility:hidden]`}>
                                                <span className={`pointer-events-none absolute inset-y-6 -right-3 z-0 h-10 w-10 rounded-full border ${theme.border} bg-black/10`} aria-hidden="true" />
                                                <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                                                <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                                                <div className="relative z-10 flex items-start justify-between gap-3">
                                                    <div className="space-y-1.5 flex-1 min-w-0">
                                                        <p className={`text-xs uppercase tracking-[0.28em] ${theme.text} opacity-60`}>
                                                            {group.start_time ? format(new Date(group.start_time), 'MMM d, yyyy') : 'DATE TBA'}
                                                        </p>
                                                        <p className={`text-lg font-semibold ${theme.text} line-clamp-2 break-words`}>
                                                            {event?.title || 'Unknown Event'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="relative z-10 mt-6 flex items-baseline justify-between gap-2">
                                                    <span className={`text-3xl font-bold ${theme.text} truncate`}>
                                                        {formatCompactPrice(price, currency)}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${theme.badge} ${theme.badgeText} flex-shrink-0 opacity-80`}>
                                                        {isEarlyBirdTicket ? 'Early Bird' : 'Per guest'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Back */}
                                            <div className={`absolute inset-0 flex flex-col justify-between overflow-visible rounded-[2rem] border ${theme.border} ${theme.gradient} px-6 py-6 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]`}>
                                                <span className={`pointer-events-none absolute inset-y-6 -right-3 z-0 h-10 w-10 rounded-full border ${theme.border} bg-black/10`} aria-hidden="true" />
                                                <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                                                <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                                                <div className="relative z-10 space-y-4">
                                                    <div className="space-y-2">
                                                        <p className={`text-xs uppercase tracking-[0.32em] ${theme.text} opacity-60`}>Event Details</p>
                                                        <ul className={`space-y-2 text-sm ${theme.text} opacity-90 list-disc list-inside`}>
                                                            <li className="leading-snug flex items-center gap-2">
                                                                <MapPin className="w-4 h-4" />
                                                                <span className="truncate">
                                                                    {event?.location_type === 'online' ? 'Online' : event?.venue || event?.city || 'Venue TBA'}
                                                                </span>
                                                            </li>
                                                        </ul>
                                                    </div>

                                                    {ticket.attendee_name && (
                                                        <div className="space-y-1">
                                                            <p className={`text-xs uppercase tracking-[0.32em] ${theme.text} opacity-60`}>Attendee</p>
                                                            <p className={`text-sm font-semibold ${theme.text} opacity-90`}>{ticket.attendee_name}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="relative z-10 mt-4 flex items-center justify-between">
                                                    <span className={`text-xl font-semibold ${theme.text}`}>
                                                        {formatCompactPrice(price, currency)}
                                                    </span>
                                                </div>

                                                {/* QR Code & Ticket ID - Bottom Right */}
                                                <div className={`absolute bottom-4 right-4 z-20 flex flex-col items-end gap-1 ${theme.text}`}>
                                                    <QRCodeSVG
                                                        value={ticket.qr_code_data || ticket.ticket_code || ''}
                                                        size={72}
                                                        level="M"
                                                        includeMargin={false}
                                                        fgColor="currentColor"
                                                        bgColor="transparent"
                                                    />
                                                    <p className="text-[9px] font-mono opacity-60 mt-1">{ticket.ticket_code || ticket.id.slice(0, 10)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="mt-6 text-xs text-white/70 text-center w-full absolute -bottom-8">
                                            Hover to flip
                                        </p>
                                    </>
                                );
                            })()}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MyTickets;
