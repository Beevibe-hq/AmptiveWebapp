import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Search, Filter, ChevronDown, ExternalLink, Eye, X, XCircle, Clock, CheckCircle2, Ban, UserCheck, CircleSlash, Check, Scan } from 'lucide-react';
import { getEventOrders, getEventsByUser } from '@/lib/api/events';
import { getEventOwnerPurchases } from '@/lib/api/finance';
import { getProfileByUserId } from '@/lib/api/profiles';

const BillIcon = ({ className, fill }: { className?: string, fill?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill || "none"} viewBox="0 0 256 256">
        <path d="M244.24,60a8,8,0,0,0-7.75-.4c-42.93,21-73.59,11.16-106,.78C96.4,49.53,61.2,38.28,12.49,62.06A8,8,0,0,0,8,69.24V189.17a8,8,0,0,0,11.51,7.19c42.93-21,73.59-11.16,106.05-.78,19.24,6.15,38.84,12.42,61,12.42,17.09,0,35.73-3.72,56.91-14.06a8,8,0,0,0,4.49-7.18V66.83A8,8,0,0,0,244.24,60ZM48,152a8,8,0,0,1-16,0V88a8,8,0,0,1,16,0Zm80,8a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm96,8a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path>
    </svg>
);

const CancelledIcon = ({ className, fill }: { className?: string, fill?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill || "none"} viewBox="0 0 256 256">
        <path d="M216,40H40A16,16,0,0,0,24,56V208a8,8,0,0,0,11.58,7.15L64,200.94l28.42,14.21a8,8,0,0,0,7.16,0L128,200.94l28.42,14.21a8,8,0,0,0,7.16,0L192,200.94l28.42,14.21A8,8,0,0,0,232,208V56A16,16,0,0,0,216,40Zm-58.34,98.34a8,8,0,0,1-11.32,11.32L128,131.31l-18.34,18.35a8,8,0,0,1-11.32-11.32L116.69,120,98.34,101.66a8,8,0,0,1,11.32-11.32L128,108.69l18.34-18.35a8,8,0,0,1,11.32,11.32L139.31,120Z"></path>
    </svg>
);

const AttendedIcon = ({ className, fill }: { className?: string, fill?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill || "none"} viewBox="0 0 256 256">
        <path d="M232,128A104,104,0,0,0,54.46,54.46,104,104,0,0,0,128,232h.09A104,104,0,0,0,232,128ZM49.18,88.92l51.21,9.35L46.65,161.53A88.39,88.39,0,0,1,49.18,88.92Zm160.17,5.54a88.41,88.41,0,0,1-2.53,72.62l-51.21-9.35Zm-8.08-15.2L167.55,119,139.63,40.78a87.38,87.38,0,0,1,50.6,25A88.74,88.74,0,0,1,201.27,79.26ZM122.43,40.19l17.51,49L58.3,74.32a89.28,89.28,0,0,1,7.47-8.55A87.37,87.37,0,0,1,122.43,40.19ZM54.73,176.74,88.45,137l27.92,78.18a88,88,0,0,1-61.64-38.48Zm78.84,39.06-17.51-49L139.14,171h0l58.52,10.69a87.5,87.5,0,0,1-64.13,34.12Z"></path>
    </svg>
);

const RefundedIcon = ({ className }: { className?: string, fill?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
    </svg>
);

const CHECK_IN_STORAGE_KEY = 'amptive.dashboard.checkins';

const normalizeValue = (value: unknown) => String(value || '').trim().toLowerCase();

const getLocalCheckIns = (): Record<string, string> => {
    try {
        const stored = localStorage.getItem(CHECK_IN_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

const extractTicketTokens = (value: unknown) => {
    const raw = String(value || '').trim();
    if (!raw) return [];

    const tokens = new Set<string>([raw]);
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            [
                'id',
                'ticket_id',
                'ticketId',
                'ticket_code',
                'ticketCode',
                'code',
                'qr_code_data',
                'qrCodeData',
                'access_code',
                'accessCode',
            ].forEach(key => {
                const parsedValue = (parsed as Record<string, unknown>)[key];
                if (parsedValue) tokens.add(String(parsedValue));
            });
        }
    } catch {
        raw.split(/[?&/#:=,\s]+/).forEach(part => {
            if (part) tokens.add(part);
        });
    }

    return Array.from(tokens);
};

const getTicketCheckInKeys = (ticket: any) => {
    const eventId = ticket.event_id || ticket.eventId || ticket.purchase?.event_id || 'event';
    return [
        ticket.id,
        ticket.ticket_id,
        ticket.ticketId,
        ticket.purchase_ticket_id,
        ticket.purchaseTicketId,
        ticket.ticket_code,
        ticket.ticketCode,
        ticket.code,
        ticket.access_code,
        ticket.accessCode,
        ticket.qr_code_data,
        ticket.qrCodeData,
    ]
        .flatMap(value => extractTicketTokens(value))
        .map(normalizeValue)
        .filter(Boolean)
        .map(value => `${eventId}:${value}`);
};

const getDisplayTicketId = (ticket: any) => String(
    ticket.ticket_code ||
    ticket.ticketCode ||
    ticket.code ||
    ticket.access_code ||
    ticket.accessCode ||
    ticket.qr_code_data ||
    ticket.qrCodeData ||
    ticket.ticket_id ||
    ticket.ticketId ||
    ticket.purchase_ticket_id ||
    ticket.purchaseTicketId ||
    ticket.id ||
    ''
);

const isTicketCheckedIn = (ticket: any) => {
    const status = normalizeValue(ticket.ticket_status || ticket.status || ticket.check_in_status || ticket.checkInStatus);
    if (['used', 'scanned', 'attended', 'checked-in', 'checked_in', 'check-in', 'check_in', 'validated', 'redeemed'].includes(status)) return true;
    if (ticket.checked_in || ticket.checkedIn || ticket.is_checked_in || ticket.isCheckedIn) return true;
    if (ticket.checked_in_at || ticket.checkedInAt || ticket.scanned_at || ticket.scannedAt || ticket.used_at || ticket.usedAt || ticket.validated_at || ticket.validatedAt || ticket.redeemed_at || ticket.redeemedAt) return true;

    const localCheckIns = getLocalCheckIns();
    return getTicketCheckInKeys(ticket).some(key => Boolean(localCheckIns[key]));
};

export default function DashboardOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [upcomingCount, setUpcomingCount] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();
    const activeFilter = searchParams.get('filter') || 'All';
    const setActiveFilter = (newFilter: string) => {
        setSearchParams({ filter: newFilter });
        setCurrentPage(1);
    };

    const ordersPerPage = 10;

    const handleAcceptChanges = async () => {
        if (!selectedOrder || !selectedAction || isUpdating) return;
        setIsUpdating(true);
        try {
            const statusMap: Record<string, string> = {
                'Paid': 'valid',
                'Attended': 'used',
                'Cancelled': 'cancelled',
                'Refunded': 'refunded'
            };
            const dbStatus = statusMap[selectedAction] || selectedAction.toLowerCase();
            const updatedOrders = orders.map(order => {
                if (order.id === selectedOrder.id) {
                    return {
                        ...order,
                        status: selectedAction,
                        ticket_status: dbStatus,
                        tickets: (order.tickets || []).map((t: any) => ({ ...t, ticket_status: dbStatus }))
                    };
                }
                return order;
            });
            setOrders(updatedOrders);
            setIsModalOpen(false);
            setSelectedOrder(null);
            setSelectedAction(null);
            setIsActionDropdownOpen(false);
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const ACTIONS = [
        { label: 'Paid', icon: BillIcon, color: 'text-emerald-500' },
        { label: 'Cancelled', icon: CancelledIcon, color: 'text-red-500' },
        { label: 'Attended', icon: AttendedIcon, color: 'text-blue-500' },
        { label: 'Refunded', icon: RefundedIcon, color: 'text-amber-500' }
    ];

    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isTicketDetailsOpen, setIsTicketDetailsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSearchingOrders, setIsSearchingOrders] = useState(false);

    const getRawStatus = (order: any) => String(
        order?.ticket_status ||
        order?.status ||
        order?.payment_status ||
        order?.purchase?.status ||
        'paid'
    ).toLowerCase();

    const normalizeStatus = (order: any) => {
        const status = getRawStatus(order);
        if (['valid', 'completed', 'success', 'successful', 'paid'].includes(status)) return 'paid';
        if (['used', 'scanned', 'attended'].includes(status)) return 'attended';
        if (['cancelled', 'canceled'].includes(status)) return 'cancelled';
        if (status === 'refunded') return 'refunded';
        if (status === 'pending' || status === 'processing') return 'pending';
        return status || 'paid';
    };

    const getOrderAmount = (order: any) => Number(
        order?.total_amount ??
        order?.total_price ??
        order?.amount ??
        order?.purchase?.amount ??
        order?.purchase?.total_amount ??
        order?.price_paid ??
        order?.ticket_price ??
        order?.event_tickets?.price ??
        0
    ) || 0;

    const getOrderUnitCount = (order: any) => Math.max(1, Number(order?.order_count || order?.quantity || 1) || 1);

    const getBuyerUserId = (order: any) => {
        const purchase = order.purchase || {};
        const firstTicket = Array.isArray(order.tickets) ? order.tickets[0] : null;
        const metadata = purchase.metadata || order.metadata || {};
        return String(
            order.buyer_user_id ||
            order.buyer_id ||
            order.customer_user_id ||
            order.customer_id ||
            order.user_id ||
            purchase.buyer_user_id ||
            purchase.buyer_id ||
            purchase.customer_user_id ||
            purchase.customer_id ||
            purchase.user_id ||
            metadata.buyer_user_id ||
            metadata.buyer_id ||
            metadata.customer_user_id ||
            metadata.customer_id ||
            metadata.user_id ||
            order.user?.user_id ||
            order.user?.id ||
            order.buyer?.user_id ||
            order.buyer?.id ||
            order.customer?.user_id ||
            order.customer?.id ||
            order.profile?.user_id ||
            order.profiles?.user_id ||
            firstTicket?.buyer_user_id ||
            firstTicket?.buyer_id ||
            firstTicket?.customer_user_id ||
            firstTicket?.customer_id ||
            firstTicket?.user_id ||
            ''
        ).trim();
    };

    const enrichOrdersWithBuyerProfiles = async (orderRows: any[]) => {
        const ids = Array.from(new Set(
            orderRows
                .map(order => order.buyer_user_id || order.profiles?.user_id)
                .filter((id): id is string => Boolean(id))
        ));

        if (ids.length === 0) return orderRows;

        const profiles = new Map<string, any>();
        await Promise.all(ids.map(async id => {
            const profile = await getProfileByUserId(id);
            if (profile) profiles.set(id, profile);
        }));

        if (profiles.size === 0) return orderRows;

        return orderRows.map(order => {
            const buyerUserId = order.buyer_user_id || order.profiles?.user_id;
            const profile = buyerUserId ? profiles.get(buyerUserId) : null;
            if (!profile) return order;

            const profileAvatar = profile.avatar_url || profile.profile_picture || (profile as any).profile_image_url || '';

            return {
                ...order,
                profiles: {
                    ...(order.profiles || {}),
                    user_id: buyerUserId,
                    display_name: order.profiles?.display_name || profile.name || profile.username || order.buyer_name,
                    username: order.profiles?.username || profile.username,
                    email: order.profiles?.email || profile.email || order.buyer_email,
                    avatar_url: order.profiles?.avatar_url || profileAvatar,
                    profile_picture: order.profiles?.profile_picture || profileAvatar,
                },
            };
        });
    };

    const normalizeOrder = (order: any) => {
        const purchase = order.purchase || {};
        const firstTicket = Array.isArray(order.tickets) ? order.tickets[0] : null;
        const metadata = purchase.metadata || order.metadata || {};
        const buyerUserId = getBuyerUserId(order);
        const status = normalizeStatus(order);
        const amount = getOrderAmount(order);
        const buyerName = (
            order.buyer_name ||
            purchase.buyer_name ||
            metadata.buyer_name ||
            order.customer_name ||
            order.attendee_name ||
            firstTicket?.attendee_name ||
            order.user?.name ||
            order.user?.full_name ||
            order.buyer?.name ||
            order.buyer?.full_name ||
            order.customer?.name ||
            order.customer?.full_name ||
            order.profiles?.display_name ||
            order.profile?.display_name ||
            'Guest'
        );
        const buyerEmail = (
            order.buyer_email ||
            purchase.buyer_email ||
            metadata.buyer_email ||
            order.customer_email ||
            order.attendee_email ||
            firstTicket?.attendee_email ||
            order.user?.email ||
            order.buyer?.email ||
            order.customer?.email ||
            order.profiles?.email ||
            order.profile?.email ||
            ''
        );
        const buyerAvatar = (
            order.profiles?.avatar_url ||
            order.profiles?.profile_picture ||
            order.profiles?.profile_image_url ||
            order.profile?.avatar_url ||
            order.profile?.profile_picture ||
            order.profile?.profile_image_url ||
            order.buyer_avatar_url ||
            order.buyer_profile_picture ||
            order.buyer_profile_image_url ||
            purchase.buyer_avatar_url ||
            purchase.buyer_profile_picture ||
            metadata.buyer_avatar_url ||
            metadata.buyer_profile_picture ||
            order.user?.avatar_url ||
            order.user?.profile_picture ||
            order.user?.profile_image_url ||
            order.buyer?.avatar_url ||
            order.buyer?.profile_picture ||
            order.buyer?.profile_image_url ||
            order.customer?.avatar_url ||
            order.customer?.profile_picture ||
            firstTicket?.profile?.avatar_url ||
            firstTicket?.profiles?.avatar_url ||
            firstTicket?.buyer_avatar_url ||
            ''
        );
        const ticketStatus = order.ticket_status || order.status || status;
        const tickets = Array.isArray(order.tickets) && order.tickets.length > 0
            ? order.tickets.map((ticket: any) => ({
                ...ticket,
                event_id: ticket.event_id || order.event_id || purchase.event_id,
                attendee_name: ticket.attendee_name || ticket.attendeeName || ticket.name || '',
                attendee_email: ticket.attendee_email || ticket.attendeeEmail || ticket.email || '',
                attendee_phone: ticket.attendee_phone || ticket.attendeePhone || ticket.phone || ticket.phone_number || '',
                total_amount: ticket.total_amount ?? ticket.price_paid ?? ticket.event_tickets?.price ?? 0,
                ticket_status: ticket.ticket_status || ticket.status || ticketStatus,
                event_tickets: {
                    ...(ticket.event_tickets || {}),
                    label: ticket.event_tickets?.label || ticket.label || order.ticket_label || 'Ticket',
                    price: ticket.event_tickets?.price ?? ticket.price_paid ?? ticket.total_amount ?? 0,
                    color_theme: ticket.event_tickets?.color_theme || ticket.color_theme || 'silver',
                },
            }))
            : [{
                id: order.ticket_id || firstTicket?.id || order.id || purchase.id,
                event_id: order.event_id || purchase.event_id,
                attendee_name: order.attendee_name || firstTicket?.attendee_name || buyerName,
                attendee_email: order.attendee_email || firstTicket?.attendee_email || buyerEmail,
                attendee_phone: order.attendee_phone || firstTicket?.attendee_phone || firstTicket?.phone || order.phone_number || '',
                total_amount: amount,
                ticket_status: ticketStatus,
                created_at: order.created_at || purchase.created_at || order.purchase_date || order.purchased_at || firstTicket?.created_at,
                event_tickets: {
                    label: order.ticket_label || order.label || firstTicket?.label || 'Ticket',
                    price: order.ticket_price || firstTicket?.price_paid || amount,
                    color_theme: order.color_theme || firstTicket?.color_theme || 'silver',
                },
            }];

        return {
            ...order,
            id: order.id || purchase.id || order.purchase_id || firstTicket?.purchase_id || order.ticket_id,
            transaction_id: order.transaction_id || purchase.transaction_id,
            created_at: order.created_at || purchase.created_at || order.purchase_date || order.purchased_at || firstTicket?.created_at || new Date().toISOString(),
            total_amount: amount,
            status,
            ticket_status: ticketStatus,
            event_title: order.event_title || order.events?.title || order.event?.title || firstTicket?.event_title || 'Untitled event',
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            buyer_user_id: buyerUserId,
            profiles: {
                ...(order.profiles || {}),
                user_id: buyerUserId || order.profiles?.user_id,
                display_name: buyerName,
                email: buyerEmail,
                avatar_url: buyerAvatar,
            },
            tickets,
        };
    };

    const isCompletedOrder = (order: any) => {
        const statuses = [
            order.status,
            order.ticket_status,
            order.payment_status,
            order.transaction_status,
            order.purchase?.status,
            order.purchase?.payment_status,
            order.payment?.status,
            order.transaction?.status,
            ...(order.tickets || []).map((ticket: any) => ticket.ticket_status || ticket.status),
        ].map(status => String(status || '').toLowerCase()).filter(Boolean);

        if (statuses.some(status => ['pending', 'cancelled', 'canceled', 'refunded', 'failed', 'void'].includes(status))) return false;
        return statuses.some(status => ['paid', 'completed', 'valid', 'attended', 'used', 'scanned', 'success', 'successful'].includes(status));
    };

    const getOrdersFromOwnedEvents = async () => {
        const events = await getEventsByUser();
        const rows = await Promise.all((events || []).map(async (event: any) => {
            const eventId = event.event_id || event.id;
            if (!eventId) return [];
            const eventOrders = await getEventOrders(eventId).catch(() => []);
            return (eventOrders || []).map((order: any) => normalizeOrder({
                ...order,
                event_id: order.event_id || eventId,
                event_title: order.event_title || order.events?.title || order.event?.title || event.title,
            }));
        }));
        return rows.flat();
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = await getEventOwnerPurchases();
                let mappedData = (data || [])
                    .map(normalizeOrder)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                if (mappedData.length === 0) {
                    mappedData = (await getOrdersFromOwnedEvents())
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                }

                setOrders(await enrichOrdersWithBuyerProfiles(mappedData));
            } catch (error) {
                console.error('Error fetching owner purchase orders:', error);
                try {
                    const eventOrders = (await getOrdersFromOwnedEvents())
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    setOrders(await enrichOrdersWithBuyerProfiles(eventOrders));
                } catch (fallbackError) {
                    console.error('Error fetching event orders:', fallbackError);
                    setOrders([]);
                }
            } finally {
                setLoading(false);
            }
        };

        const fetchStats = async () => {
            try {
                const events = await getEventsByUser();
                const now = new Date().toISOString();
                const upcoming = events.filter(e =>
                    e.scheduled_for && e.scheduled_for >= now
                );
                setUpcomingCount(upcoming.length);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };

        fetchOrders();
        fetchStats();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    const formatCondensed = (amount: number) => {
        if (amount >= 1000000000) return `₦${(amount / 1000000000).toFixed(1).replace(/\.0$/, '')}b`;
        if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
        if (amount >= 1000) return `₦${(amount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
        return formatCurrency(amount);
    };

    const renderCustomerAvatar = (order: any) => {
        const profile = order.profiles;
        const name = profile?.display_name || order.buyer_name || 'Guest';
        const email = profile?.email || order.buyer_email || order.id;
        const avatarUrl = profile?.avatar_url ||
            profile?.profile_picture ||
            profile?.profile_image_url ||
            order.profile?.avatar_url ||
            order.profile?.profile_picture ||
            order.buyer_avatar_url ||
            order.buyer_profile_picture ||
            order.user?.avatar_url ||
            order.user?.profile_picture ||
            order.buyer?.avatar_url ||
            order.buyer?.profile_picture ||
            order.customer?.avatar_url ||
            order.customer?.profile_picture;

        if (avatarUrl) {
            return (
                <img
                    src={avatarUrl}
                    alt={name}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                />
            );
        }

        // Deterministic Fallback (Initials + Color)
        const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        const colors = [
            'bg-blue-100 text-blue-600',
            'bg-purple-100 text-purple-600',
            'bg-emerald-100 text-emerald-600',
            'bg-amber-100 text-amber-600',
            'bg-rose-100 text-rose-600',
            'bg-indigo-100 text-indigo-600',
            'bg-cyan-100 text-cyan-600',
        ];

        // Simple hash for consistent color per customer
        let hash = 0;
        const seed = email.toString();
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorClass = colors[Math.abs(hash) % colors.length];

        return (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold tracking-tighter shrink-0 ${colorClass}`}>
                {initials}
            </div>
        );
    };

    const getStatusPill = (status: string) => {
        const config: Record<string, { bg: string; dot: string; text: string }> = {
            paid: { bg: 'bg-emerald-50 border-emerald-200/60', dot: 'bg-emerald-500', text: 'text-emerald-700' },
            unscanned: { bg: 'bg-emerald-50 border-emerald-200/60', dot: 'bg-emerald-500', text: 'text-emerald-700' },
            pending: { bg: 'bg-amber-50 border-amber-200/60', dot: 'bg-amber-500', text: 'text-amber-700' },
            cancelled: { bg: 'bg-rose-50 border-rose-200/60', dot: 'bg-rose-500', text: 'text-rose-700' },
            scanned: { bg: 'bg-slate-50 border-slate-200/60', dot: 'bg-slate-400', text: 'text-slate-600' },
            attended: { bg: 'bg-slate-50 border-slate-200/60', dot: 'bg-slate-400', text: 'text-slate-600' },
            refunded: { bg: 'bg-slate-50 border-slate-200/60', dot: 'bg-slate-400', text: 'text-slate-600' },
        };
        const s = config[status?.toLowerCase()] || config.pending;
        return (
            <span className={`inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-bold uppercase tracking-wider border ${s.bg} ${s.text}`}>
                {status}
            </span>
        );
    };

    // Filtering logic
    const filteredOrders = orders.filter(order => {
        // First apply status filter
        const s = order.status?.toLowerCase();
        const f = activeFilter.toLowerCase();
        let matchesFilter = activeFilter === 'All';
        
        if (!matchesFilter) {
            if (f === 'completed') matchesFilter = s === 'paid' || s === 'attended' || s === 'completed' || s === 'valid';
            else matchesFilter = s === f;
        }
        if (!matchesFilter) return false;
        return true;
    });

    // Global Search Results (Independent of active tab filter)
    const searchResultOrders = orders.filter(order => {
        if (!searchTerm) return false;
        
        const search = searchTerm.toLowerCase();
        return (
            order.id?.toLowerCase().includes(search) ||
            order.profiles?.display_name?.toLowerCase().includes(search) ||
            order.profiles?.email?.toLowerCase().includes(search) ||
            order.event_title?.toLowerCase().includes(search)
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = Math.min(startIndex + ordersPerPage, filteredOrders.length);
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    const totalOrderCount = orders.reduce((sum, order) => sum + getOrderUnitCount(order), 0);
    const completedOrderCount = orders.filter(isCompletedOrder).reduce((sum, order) => sum + getOrderUnitCount(order), 0);
    const pendingOrderCount = orders
        .filter(order => String(order.status || '').toLowerCase() === 'pending')
        .reduce((sum, order) => sum + getOrderUnitCount(order), 0);
    const revenueTotal = orders.filter(isCompletedOrder).reduce((acc, order) => acc + getOrderAmount(order), 0);

    return (
        <div className="px-4 md:px-8 py-8 w-full">
            <div className="flex items-center justify-between gap-4 mb-6 md:mb-12">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
                        Orders
                    </h1>
                    <p className="hidden sm:block text-[15px] text-black/40 font-sans mt-1">Manage orders, update buyer info, and process refunds. For data exports, view the orders report.</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="p-2 md:p-2 bg-[#FDFDFD] border border-gray-200 text-black rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Search Orders"
                    >
                        <Search className="w-4 h-4 text-black/70" />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white border border-black/5 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-black/40 text-xs font-sans uppercase tracking-widest mb-1">Total Orders</h3>
                    <p className="text-2xl font-bold tracking-tight text-black">{totalOrderCount}</p>
                </div>
                <div className="bg-white border border-black/5 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-black/40 text-xs font-sans uppercase tracking-widest mb-1">Completed</h3>
                    <p className="text-2xl font-bold tracking-tight text-green-600">{completedOrderCount}</p>
                </div>
                <div className="bg-white border border-black/5 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-black/40 text-xs font-sans uppercase tracking-widest mb-1">Pending</h3>
                    <p className="text-2xl font-bold tracking-tight text-yellow-600">{pendingOrderCount}</p>
                </div>
                <div className="bg-white border border-black/5 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-black/40 text-xs font-sans uppercase tracking-widest mb-1">Revenue</h3>
                    <p className="text-2xl font-bold tracking-tight text-black">
                        {formatCurrency(revenueTotal)}
                    </p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-3 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-black/10 focus:outline-none focus:border-black transition-colors"
                    />
                </div>
                <div className="relative">
                    <div className="hidden md:block relative min-w-[160px]">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                        <select
                            value={activeFilter}
                            onChange={(event) => setActiveFilter(event.target.value)}
                            className="w-full pl-10 pr-10 py-3 border border-black/10 focus:outline-none focus:border-black transition-colors appearance-none bg-white text-sm"
                        >
                            <option value="All">All Orders</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 pointer-events-none" />
                    </div>
                </div>

            </div>

            {/* Filter Pills */}
            <div className="flex items-center mb-8 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setActiveFilter('All')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'All' ? 'bg-[#F2F2F2] text-black' : 'bg-transparent text-black/60 hover:bg-black/5'}`}
                    >
                        All Orders
                    </button>
                    <button
                        onClick={() => setActiveFilter('completed')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'completed' ? 'bg-[#F2F2F2] text-black' : 'bg-transparent text-black/60 hover:bg-black/5'}`}
                    >
                        Completed
                    </button>
                    <button
                        onClick={() => setActiveFilter('cancelled')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'cancelled' ? 'bg-[#F2F2F2] text-black' : 'bg-transparent text-black/60 hover:bg-black/5'}`}
                    >
                        Cancelled
                    </button>
                    <button
                        onClick={() => setActiveFilter('refunded')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'refunded' ? 'bg-[#F2F2F2] text-black' : 'bg-transparent text-black/60 hover:bg-black/5'}`}
                    >
                        Refunded
                    </button>
                </div>
            </div>

            {/* Orders Table / List */}
            <div className="bg-white border md:border-black/5 overflow-hidden border-transparent rounded-2xl shadow-sm">

                {/* Mobile View */}
                <div className="md:hidden flex flex-col divide-y divide-black/5">
                    {loading ? (
                        // Mobile Skeletons
                        [1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="p-4 flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-2">
                                        <div className="skeleton-shimmer h-4 w-24 rounded-md" />
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="skeleton-shimmer w-8 h-8 rounded-full shrink-0" />
                                            <div className="flex flex-col gap-1">
                                                <div className="skeleton-shimmer h-3 w-32 rounded-full" />
                                                <div className="skeleton-shimmer h-2 w-16 rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="skeleton-shimmer h-5 w-16 rounded-full" />
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-black/5">
                                    <div className="flex items-center gap-3">
                                        <div className="skeleton-shimmer h-3 w-20 rounded-full" />
                                        <div className="skeleton-shimmer h-3 w-16 rounded-full" />
                                    </div>
                                    <div className="skeleton-shimmer h-7 w-16 rounded-lg" />
                                </div>
                            </div>
                        ))
                    ) : (
                        paginatedOrders.map((order) => (
                            <div key={order.id} className="p-4 flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-medium text-black text-[14px]">#{order.id?.slice(0, 8)?.toUpperCase()}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {renderCustomerAvatar(order)}
                                            <div className="flex flex-col">
                                                <p className="text-xs text-black/40 font-medium">
                                                    {order.profiles?.display_name || order.buyer_name || 'Guest'}
                                                </p>
                                                {(order.tickets?.length || 0) > 1 && (
                                                    <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-tight">
                                                        {(order.tickets?.length || 0)} Tickets
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {getStatusPill(order.status)}
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-black/5">
                                    <div className="flex items-center gap-3 text-xs text-black/40">
                                        <span className="text-black">{formatDate(order.created_at)}</span>
                                        <span>•</span>
                                        <span className="font-bold text-black">{formatCurrency(Number(order.total_amount) || 0)}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setSelectedAction(order.status);
                                            setIsModalOpen(true);
                                        }}
                                        className="px-4 py-1.5 text-xs font-semibold text-black bg-white border border-black/10 rounded-lg hover:bg-black/5 transition-all duration-200"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                    {!loading && paginatedOrders.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-3xl">
                                {activeFilter === 'All' ? '🛍️' :
                                    activeFilter === 'completed' ? '✅' :
                                            activeFilter === 'cancelled' ? '🚫' : '💰'}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {activeFilter === 'All' ? 'No orders yet' :
                                    `No ${activeFilter.toLowerCase()} orders`}
                            </h3>
                            <p className="text-sm text-gray-500 max-w-xs mt-2 px-4">
                                {activeFilter === 'All'
                                    ? "When people buy tickets for your events, they'll show up here."
                                    : `There are currently no orders with the ${activeFilter.toLowerCase()} status.`}
                            </p>
                        </div>
                    )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-black/5 bg-gray-50/50">
                                <th className="px-6 py-4 text-[13px] font-medium text-black/40">Order id</th>
                                <th className="px-6 py-4 text-[13px] font-medium text-black/40">Customer</th>
                                <th className="px-6 py-4 text-[13px] font-medium text-black/40">Date</th>
                                <th className="px-6 py-4 text-[13px] font-medium text-black/40">Amount</th>
                                <th className="px-6 py-4 text-[13px] font-medium text-black/40">Status</th>
                                <th className="px-6 py-4 text-[13px] font-medium text-black/40">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 text-[14px]">
                            {loading ? (
                                // Desktop Skeletons
                                [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-5">
                                            <div className="skeleton-shimmer h-4 w-20 rounded-md" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="skeleton-shimmer w-10 h-10 rounded-full shrink-0" />
                                                <div className="flex flex-col gap-1">
                                                    <div className="skeleton-shimmer h-4 w-32 rounded-full" />
                                                    <div className="skeleton-shimmer h-3 w-16 rounded-full" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="skeleton-shimmer h-4 w-24 rounded-full" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="skeleton-shimmer h-4 w-16 rounded-full" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="skeleton-shimmer h-6 w-20 rounded-full" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="skeleton-shimmer h-8 w-16 rounded-lg" />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                paginatedOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <span className="font-medium text-black text-[14px]">#{order.id?.slice(0, 8)?.toUpperCase()}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                {renderCustomerAvatar(order)}
                                                <div className="flex flex-col">
                                                    <p className="text-sm font-medium text-black">
                                                        {order.profiles?.display_name || order.buyer_name || 'Guest'}
                                                    </p>
                                                    {(order.tickets?.length || 0) > 1 && (
                                                        <span className="text-[11px] text-blue-600 font-bold uppercase tracking-tight">
                                                            {(order.tickets?.length || 0)} Tickets
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-black font-sans">{formatDate(order.created_at)}</td>
                                        <td className="px-6 py-5 text-sm font-bold text-black">{formatCurrency(Number(order.total_amount) || 0)}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex">
                                                {getStatusPill(order.status)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setSelectedAction(order.status);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="px-4 py-1.5 text-xs font-semibold text-black bg-white border border-black/10 rounded-lg hover:bg-black/5 transition-all duration-200"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            {!loading && paginatedOrders.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20">
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-3xl">
                                                {activeFilter === 'All' ? '🛍️' :
                                                    activeFilter === 'completed' ? '✅' :
                                                            activeFilter === 'cancelled' ? '🚫' : '💰'}
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {activeFilter === 'All' ? 'No orders yet' :
                                                    `No ${activeFilter.toLowerCase()} orders`}
                                            </h3>
                                            <p className="text-sm text-gray-500 max-w-xs mt-2">
                                                {activeFilter === 'All'
                                                    ? "When people buy tickets for your events, they'll show up here."
                                                    : `There are currently no orders with the ${activeFilter.toLowerCase()} status.`}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {orders.length > ordersPerPage && (
                    <div className="w-full flex items-center justify-between px-6 py-4 border-t border-black/5 bg-gray-50/50">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-xs font-sans font-medium uppercase tracking-wider bg-white border border-black/10 rounded-lg text-black hover:bg-black/5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                            Previous
                        </button>
                        <span className="text-sm font-medium text-black/60">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-xs font-sans font-medium uppercase tracking-wider bg-white border border-black/10 rounded-lg text-black hover:bg-black/5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-8 flex justify-center md:justify-between items-center text-xs font-sans font-medium uppercase tracking-[0.2em] text-black/30">
                <div className="text-center md:text-left">
                    Showing {orders.length > 0 ? startIndex + 1 : 0} to {endIndex} of {orders.length} total entries
                </div>
                <div className="hidden md:block">Amptive Order Feed</div>
            </div>
            {/* Order Details Modal (Side Drawer) */}
            <AnimatePresence mode="wait">
                {isModalOpen && selectedOrder && (
                    <div className="fixed inset-0 z-[110] flex justify-end overflow-hidden">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setIsModalOpen(false)}
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ 
                                    x: isTicketDetailsOpen ? (window.innerWidth < 768 ? '-15%' : -320) : 0,
                                    scale: isTicketDetailsOpen ? 0.95 : 1,
                                    filter: isTicketDetailsOpen ? 'brightness(0.8) blur(0.5px)' : 'brightness(1) blur(0px)'
                                }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
                                className="relative h-full w-full md:w-[420px] md:h-[95vh] bg-white flex flex-col overflow-y-auto no-scrollbar md:rounded-2xl md:mt-[2.5vh] md:mr-4 md:drop-shadow-[-10px_0_25px_rgba(0,0,0,0.15)] z-[11]"
                            >
                                {/* Modal Header */}
                                <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
                                    <div>
                                        <p className="text-sm font-normal text-black tracking-tighter">
                                            Order ID <span className="font-semibold">#{selectedOrder.id?.slice(0, 12)?.toUpperCase()}</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-1 hover:bg-black/5 rounded-full transition-colors group"
                                    >
                                        <X className="w-5 h-5 text-black/40 group-hover:text-black transition-colors" />
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-8">
                                    <div className="space-y-12">
                                        {/* Change Action Dropdown */}
                                        <section>
                                            <h3 className="text-[13px] font-semibold text-black tracking-tight mb-3">Change Action</h3>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setIsActionDropdownOpen(!isActionDropdownOpen)}
                                                    className="w-full px-4 py-3 text-sm bg-gray-50/50 border border-black/5 rounded-xl flex items-center justify-between hover:bg-gray-100/50 transition-all duration-200"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {selectedAction ? (
                                                            <>
                                                                {(() => {
                                                                    const action = ACTIONS.find(a => a.label === selectedAction);
                                                                    return action ? <action.icon className={`w-4 h-4 ${action.color}`} fill="currentColor" /> : null;
                                                                })()}
                                                                <span className="text-black font-medium text-[13px]">{selectedAction}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-black/60">Select an action</span>
                                                        )}
                                                    </div>
                                                    <ChevronDown className={`w-4 h-4 text-black/40 transition-transform duration-300 ${isActionDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>

                                                <AnimatePresence>
                                                    {isActionDropdownOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0, y: -4 }}
                                                            animate={{ opacity: 1, height: 'auto', y: 4 }}
                                                            exit={{ opacity: 0, height: 0, y: -4 }}
                                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                                            className="absolute top-full left-0 right-0 z-50 bg-white border border-black/5 rounded-xl shadow-xl overflow-hidden p-1.5"
                                                        >
                                                            {ACTIONS.map((action) => (
                                                                    <button
                                                                        key={action.label}
                                                                        onClick={() => {
                                                                            setSelectedAction(action.label);
                                                                            setIsActionDropdownOpen(false);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-3 text-[13px] font-medium rounded-lg transition-colors flex items-center justify-between group/item ${selectedAction === action.label ? 'bg-black/5 text-black' : 'text-black/70 hover:bg-black/5 hover:text-black'}`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <action.icon className={`w-4 h-4 ${action.color}`} fill="currentColor" />
                                                                            {action.label}
                                                                        </div>
                                                                        {selectedAction === action.label && (
                                                                            <Check className="w-4 h-4 text-blue-600" />
                                                                        )}
                                                                    </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </section>

                                        {/* Order Metadata */}
                                        <div className="flex flex-col gap-6 !mt-8">
                                            <div>
                                                <p className="text-[10px] font-bold text-black/30 uppercase mb-1">Event</p>
                                                <p className="text-sm font-semibold text-black leading-tight">{selectedOrder.event_title}</p>
                                            </div>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-[10px] font-bold text-black/30 uppercase mb-1">Customer</p>
                                                    <p className="text-sm font-semibold text-black">{selectedOrder.profiles?.display_name || selectedOrder.buyer_email}</p>
                                                    {selectedOrder.profiles?.username && (
                                                        <p className="text-[12px] text-black mt-0.5">@{selectedOrder.profiles.username}</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-black/30 uppercase mb-1">Date</p>
                                                    <p className="text-[12px] font-medium text-black">{new Date(selectedOrder.created_at).toLocaleDateString('en-GB')}</p>
                                                    <div className="mt-1 flex justify-end">
                                                        {getStatusPill(selectedAction || selectedOrder.status)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <section className="!mt-6">
                                            <div className="overflow-hidden border border-black/5 rounded-xl">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-black/5 bg-gray-50/50">
                                                            <th className="px-4 py-4 text-[10px] font-bold text-black/30 uppercase tracking-wider">Ticket</th>
                                                            <th className="px-4 py-4 text-[10px] font-bold text-black/30 uppercase tracking-wider text-right">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-black/5">
                                                        {(() => {
                                                            const getTicketColor = (theme?: string) => {
                                                                switch (theme?.toLowerCase()) {
                                                                    case 'bronze': return 'text-orange-600';
                                                                    case 'silver': return 'text-slate-400';
                                                                    case 'gold': return 'text-amber-500';
                                                                    case 'platinum': return 'text-indigo-400';
                                                                    case 'obsidian': return 'text-black';
                                                                    default: return 'text-black/70';
                                                                }
                                                            };

                                                            return (selectedOrder.tickets || []).map((ticket: any) => {
                                                                const label = ticket.event_tickets?.label || ticket.label || 'Ticket';
                                                                const theme = ticket.event_tickets?.color_theme || 'silver';
                                                                const price = Number(ticket.total_amount) || Number(ticket.event_tickets?.price) || 0;
                                                                
                                                                // Map DB status to Scanned/Unscanned for individual tickets
                                                                const dbStatus = ticket.ticket_status?.toLowerCase();
                                                                let individualStatus = 'Unscanned';
                                                                if (isTicketCheckedIn(ticket)) individualStatus = 'Attended';
                                                                else if (dbStatus === 'cancelled') individualStatus = 'Cancelled';
                                                                else if (dbStatus === 'refunded') individualStatus = 'Refunded';

                                                                const renderStatusIndicator = () => {
                                                                    if (individualStatus === 'Attended') {
                                                                        return (
                                                                            <div title="Checked in" className="text-blue-500">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
                                                                                    <path d="M96.26,37A8,8,0,0,1,102,27.29a104.11,104.11,0,0,1,52,0,8,8,0,0,1-2,15.75,8.15,8.15,0,0,1-2-.26,88,88,0,0,0-44,0A8,8,0,0,1,96.26,37ZM33.35,110a8,8,0,0,0,9.85-5.57,87.88,87.88,0,0,1,22-38.09A8,8,0,0,0,53.8,55.14a103.92,103.92,0,0,0-26,45A8,8,0,0,0,33.35,110ZM150,213.22a88,88,0,0,1-44,0,8,8,0,0,0-4,15.49,104.11,104.11,0,0,0,52,0,8,8,0,0,0-4-15.49Zm62.8-108.77a8,8,0,0,0,15.42-4.28,104,104,0,0,0-26-45,8,8,0,1,0-11.41,11.21A88.14,88.14,0,0,1,212.79,104.45Zm15.44,51.39a103.68,103.68,0,0,1-30.68,49.47A8,8,0,0,1,185.07,203a64,64,0,0,0-114.14,0,8,8,0,0,1-12.48,2.32,103.74,103.74,0,0,1-30.68-49.49,8,8,0,0,1,15.42-4.27,87.58,87.58,0,0,0,19,34.88,79.57,79.57,0,0,1,36.1-28.77,48,48,0,1,1,59.38,0,79.57,79.57,0,0,1,36.1,28.77,87.58,87.58,0,0,0,19-34.88,8,8,0,1,1,15.42,4.28ZM128,152a32,32,0,1,0-32-32A32,32,0,0,0,128,152Z" />
                                                                                </svg>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (individualStatus === 'Unscanned') {
                                                                        return (
                                                                            <div title="Unscanned" className="text-black/20">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
                                                                                    <path d="M96.26,37A8,8,0,0,1,102,27.29a104.11,104.11,0,0,1,52,0,8,8,0,0,1-2,15.75,8.15,8.15,0,0,1-2-.26,88,88,0,0,0-44,0A8,8,0,0,1,96.26,37ZM33.35,110a8,8,0,0,0,9.85-5.57,87.88,87.88,0,0,1,22-38.09A8,8,0,0,0,53.8,55.14a103.92,103.92,0,0,0-26,45A8,8,0,0,0,33.35,110ZM150,213.22a88,88,0,0,1-44,0,8,8,0,0,0-4,15.49,104.11,104.11,0,0,0,52,0,8,8,0,0,0-4-15.49Zm62.8-108.77a8,8,0,0,0,15.42-4.28,104,104,0,0,0-26-45,8,8,0,1,0-11.41,11.21A88.14,88.14,0,0,1,212.79,104.45Zm15.44,51.39a103.68,103.68,0,0,1-30.68,49.47A8,8,0,0,1,185.07,203a64,64,0,0,0-114.14,0,8,8,0,0,1-12.48,2.32,103.74,103.74,0,0,1-30.68-49.49,8,8,0,0,1,15.42-4.27,87.58,87.58,0,0,0,19,34.88,79.57,79.57,0,0,1,36.1-28.77,48,48,0,1,1,59.38,0,79.57,79.57,0,0,1,36.1,28.77,87.58,87.58,0,0,0,19-34.88,8,8,0,1,1,15.42,4.28ZM128,152a32,32,0,1,0-32-32A32,32,0,0,0,128,152Z" />
                                                                                </svg>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return getStatusPill(individualStatus);
                                                                };

                                                                return (
                                                                    <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors group">
                                                                        <td className="px-4 py-5">
                                                                            <div className="flex items-center gap-2">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`lucide lucide-ticket w-3.5 h-3.5 ${getTicketColor(theme)} shrink-0 mt-0.5`}>
                                                                                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                                                                                    <path d="M13 5v2" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                                                                    <path d="M13 17v2" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                                                                    <path d="M13 11v2" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                                                                </svg>
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <p className="text-[14px] font-semibold text-black">{label}</p>
                                                                                        {renderStatusIndicator()}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-5 text-right">
                                                                            <p className="text-[13px] font-medium text-black">{formatCurrency(price)}</p>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            });
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="-mt-4 flex justify-center relative z-10">
                                                <button 
                                                    onClick={() => setIsTicketDetailsOpen(true)}
                                                    className="px-4 py-2 rounded-full border border-black/5 bg-white text-[11px] font-bold text-blue-600 hover:bg-black/5 hover:text-black transition-all active:scale-[0.98] shadow-sm"
                                                >
                                                    View Details
                                                </button>
                                            </div>

                                            {/* Financial Summary */}
                                            <div className="flex flex-col gap-4 !mt-10 px-1">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider">Subtotal</p>
                                                    <p className="text-[13px] font-semibold text-black">{formatCurrency(selectedOrder.total_amount)}</p>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider">Tax</p>
                                                    <p className="text-[13px] font-semibold text-black">{formatCurrency(0)}</p>
                                                </div>
                                                <div className="flex justify-between items-center pt-4 border-t border-black/5">
                                                    <p className="text-[11px] font-bold text-black uppercase tracking-wider">Total</p>
                                                    <p className="text-xl font-black text-black tracking-tight">{formatCurrency(selectedOrder.total_amount)}</p>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="p-8 bg-gray-50/50 border-t border-black/5 sticky bottom-0">
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            const hasChanges = selectedAction && 
                                                selectedAction !== selectedOrder.status;
                                                
                                            return (
                                                <button 
                                                    disabled={!hasChanges || isUpdating}
                                                    onClick={handleAcceptChanges}
                                                    className={`flex-1 px-6 py-4 text-sm font-bold text-white bg-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-2xl active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed ${hasChanges && !isUpdating ? 'hover:bg-black/90 shadow-black/20' : 'shadow-transparent'}`}
                                                >
                                                    {isUpdating ? (
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    )}
                                                    {isUpdating ? 'Updating...' : 'Accept Changes'}
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Nested Ticket Details Modal */}
                            <AnimatePresence>
                                {isTicketDetailsOpen && (
                                    <motion.div
                                        initial={{ x: '100%' }}
                                        animate={{ x: 0 }}
                                        exit={{ x: '100%' }}
                                        transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
                                        className="absolute inset-y-0 right-0 h-full w-full md:w-[400px] md:h-[92vh] bg-white md:rounded-2xl md:mt-[4vh] md:mr-6 flex flex-col shadow-2xl z-20 border-l border-black/5 overflow-hidden"
                                    >
                                        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
                                            <div>
                                                <p className="text-sm font-normal text-black tracking-tighter">
                                                    Ticket Detail <span className="font-semibold">#{selectedOrder.id?.slice(0, 12)?.toUpperCase()}</span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setIsTicketDetailsOpen(false)}
                                                className="p-1 hover:bg-black/5 rounded-full transition-colors group"
                                            >
                                                <X className="w-5 h-5 text-black/40 group-hover:text-black transition-colors" />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                                            <div className="space-y-8">
                                                {(selectedOrder.tickets || []).map((ticket: any, index: number) => {
                                                    const checkedIn = isTicketCheckedIn(ticket);
                                                    const attendeeName = ticket.attendee_name || ticket.attendeeName || ticket.name || selectedOrder.profiles?.display_name || selectedOrder.buyer_name || 'Guest';
                                                    const attendeeEmail = ticket.attendee_email || ticket.attendeeEmail || ticket.email || selectedOrder.profiles?.email || selectedOrder.buyer_email || 'No email';
                                                    const attendeePhone = ticket.attendee_phone || ticket.attendeePhone || ticket.phone || ticket.phone_number || selectedOrder.profiles?.phone_number || 'Not provided';

                                                    return (
                                                    <div key={ticket.id} className="relative">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-[10px] font-bold text-black/40">
                                                                    {index + 1}
                                                                </div>
                                                                <p className="text-[13px] font-bold text-black uppercase tracking-tight">
                                                                    {ticket.event_tickets?.label || ticket.label || 'Ticket'}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {checkedIn ? (
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100/60">
                                                                        <Scan className="w-3 h-3 text-blue-500" />
                                                                        <span className="text-[9px] font-bold text-blue-600 uppercase">Checked in</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100/60">
                                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Awaiting Scan</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="bg-gray-50/50 p-4 rounded-xl border border-black/5 space-y-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mb-1">Full Name</p>
                                                                    <p className="text-[13px] font-semibold text-black leading-tight">
                                                                        {attendeeName}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mb-1">Email Address</p>
                                                                    <p className="text-[11px] font-medium text-black truncate">
                                                                        {attendeeEmail}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-black/5">
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mb-1">Phone Number</p>
                                                                    <p className="text-[11px] font-medium text-black">
                                                                        {attendeePhone}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mb-1">Price</p>
                                                                    <p className="text-[11px] font-bold text-black">{formatCurrency(ticket.total_amount || ticket.event_tickets?.price || 0)}</p>
                                                                </div>
                                                            </div>

                                                            <div className="pt-3 border-t border-black/5">
                                                                <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mb-1">Ticket ID</p>
                                                                <p className="text-[11px] font-mono text-black break-all leading-relaxed">{getDisplayTicketId(ticket).toUpperCase()}</p>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-black/5">
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mb-1">Purchase Date</p>
                                                                    <p className="text-[11px] font-medium text-black">{new Date(ticket.created_at).toLocaleDateString('en-GB')}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mb-1">Time</p>
                                                                    <p className="text-[11px] font-medium text-black">{new Date(ticket.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {index < (selectedOrder.tickets?.length || 0) - 1 && (
                                                            <div className="absolute -bottom-4 left-3 w-[1px] h-4 bg-black/5" />
                                                        )}
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="p-6 bg-gray-50/50 border-t border-black/5 mt-auto">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <p className="text-black/40 font-medium">Order Total Items: <span className="text-black">{(selectedOrder.tickets?.length || 0)}</span></p>
                                                <p className="text-black/40 font-medium">Ref No: <span className="text-black">{selectedOrder.id.slice(0, 8).toUpperCase()}</span></p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </AnimatePresence>
                {/* Search Side Drawer */}
            <AnimatePresence mode="wait">
                {isSearchOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => {
                                setIsSearchOpen(false);
                                setSearchTerm('');
                            }}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
                            className="relative h-full w-full md:w-[420px] md:h-[95vh] bg-white flex flex-col overflow-y-auto no-scrollbar md:rounded-2xl md:mt-[2.5vh] md:mr-4 md:drop-shadow-[-10px_0_25px_rgba(0,0,0,0.15)] z-10"
                        >
                            {/* Drawer Header */}
                            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
                                <div>
                                    <p className="text-sm font-semibold text-black tracking-tighter">
                                        Search Orders
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsSearchOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className="p-1 hover:bg-black/5 rounded-full transition-colors group"
                                >
                                    <X className="w-5 h-5 text-black/40 group-hover:text-black transition-colors" />
                                </button>
                            </div>

                            {/* Search Input Section */}
                            <div className="p-6 bg-white">
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 z-10">
                                        <Search className="w-5 h-5 text-black/40" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search by ID, Name, or Email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-4 py-2 pl-10 h-10 text-sm text-gray-700 bg-gray-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all duration-200 shadow-sm"
                                        style={{ minWidth: '200px', boxSizing: 'border-box' }}
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-4 p-1 hover:bg-black/5 rounded-full transition-colors"
                                        >
                                            <XCircle className="w-4 h-4 text-black/30 hover:text-black/60 transition-colors" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Search Results */}
                            <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-8">
                                <div className="space-y-3">
                                    {isSearchingOrders ? (
                                        <div className="space-y-4 pt-4">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="p-4 bg-white border border-black/5 rounded-xl animate-pulse">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="space-y-2 flex-1">
                                                            <div className="h-4 w-1/2 bg-black/5 rounded" />
                                                            <div className="h-3 w-1/3 bg-black/5 rounded" />
                                                        </div>
                                                        <div className="w-16 h-6 bg-black/5 rounded" />
                                                    </div>
                                                    <div className="flex items-center justify-between pt-3 border-t border-black/5">
                                                        <div className="h-3 w-1/4 bg-black/5 rounded" />
                                                        <div className="h-4 w-1/6 bg-black/5 rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : !searchTerm ? (
                                        <div className="flex flex-col items-center justify-center text-center pt-24 pb-12 opacity-80">
                                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-3xl">
                                                🔍
                                            </div>
                                            <h3 className="text-sm font-semibold text-black">Find an Order</h3>
                                            <p className="text-[13px] text-black/50 mt-1">Start typing to search your orders</p>
                                        </div>
                                    ) : searchResultOrders.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center text-center pt-24 pb-12">
                                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                                                <CircleSlash className="w-8 h-8 text-red-400" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-black">No results found</h3>
                                            <p className="text-[13px] text-black/50 mt-1 px-4">We couldn't find any orders matching "{searchTerm}"</p>
                                        </div>
                                    ) : (
                                        searchResultOrders.map((order) => {
                                            const status = order.status?.toLowerCase() || '';
                                            let statusColor = "bg-gray-50 text-gray-600 border-gray-200";
                                            let StatusIcon = Clock;

                                            if (status === 'paid' || status === 'completed' || status === 'valid') {
                                                statusColor = "bg-green-50 text-green-700 border-green-200";
                                                StatusIcon = CheckCircle2;
                                            } else if (status === 'cancelled' || status === 'refunded') {
                                                statusColor = "bg-red-50 text-red-700 border-red-200";
                                                StatusIcon = Ban;
                                            } else if (status === 'attended' || status === 'used') {
                                                statusColor = "bg-blue-50 text-blue-700 border-blue-200";
                                                StatusIcon = UserCheck;
                                            }

                                            return (
                                                <div 
                                                    key={order.id}
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setSelectedAction(order.status);
                                                        setIsSearchOpen(false);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="group p-4 bg-white border border-black/5 hover:border-black/15 shadow-sm rounded-xl cursor-pointer transition-all active:scale-[0.99] flex flex-col gap-3"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="text-[13px] font-bold text-black mb-1">{order.profiles?.display_name || 'Guest User'}</p>
                                                            <p className="text-[12px] font-medium text-black/50 font-mono tracking-tight">{order.id?.slice(0, 8)?.toUpperCase()}...{order.id?.slice(-4)?.toUpperCase()}</p>
                                                        </div>
                                                        <div className={`px-2 py-1 rounded-md border flex items-center gap-1.5 ${statusColor}`}>
                                                            <StatusIcon className="w-3 h-3" />
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">{order.status}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-3 border-t border-black/5">
                                                        <p className="text-[12px] font-medium text-black/60">{new Date(order.created_at).toLocaleDateString('en-GB')}</p>
                                                        <p className="text-[14px] font-bold tracking-tight text-black">{formatCurrency(order.total_amount)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

