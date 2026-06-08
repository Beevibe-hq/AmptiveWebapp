import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, Filter, ChevronDown, ExternalLink, Eye } from 'lucide-react';
import { getPurchasesByEvent } from '@/lib/api/purchases';
import { getCurrentUser } from '@/lib/api/auth';

const DUMMY_ORDERS = [
    { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', created_at: '2025-02-28T14:30:00Z', total_amount: 25000, status: 'completed', profiles: { display_name: 'Adaeze Okafor', email: 'adaeze@mail.com' } },
    { id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', created_at: '2025-02-27T10:15:00Z', total_amount: 15000, status: 'completed', profiles: { display_name: 'Chukwuma Eze', email: 'chukwuma@mail.com' } },
    { id: 'c3d4e5f6-a7b8-9012-cdef-123456789012', created_at: '2025-02-26T18:45:00Z', total_amount: 50000, status: 'completed', profiles: { display_name: 'Fatima Bello', email: 'fatima.b@mail.com' } },
    { id: 'd4e5f6a7-b8c9-0123-defa-234567890123', created_at: '2025-02-25T09:00:00Z', total_amount: 7500, status: 'completed', profiles: { display_name: 'Joseph Achilonu', email: 'joseph@mail.com' } },
    { id: 'e5f6a7b8-c9d0-1234-efab-345678901234', created_at: '2025-02-24T16:20:00Z', total_amount: 32000, status: 'cancelled', profiles: { display_name: 'Grace Nwosu', email: 'grace.n@mail.com' } },
    { id: 'f6a7b8c9-d0e1-2345-fabc-456789012345', created_at: '2025-02-23T12:00:00Z', total_amount: 18500, status: 'completed', profiles: { display_name: 'Emeka Obi', email: 'emeka.obi@mail.com' } },
    { id: 'a7b8c9d0-e1f2-3456-abcd-567890123456', created_at: '2025-02-22T08:30:00Z', total_amount: 42000, status: 'processing', profiles: { display_name: 'Blessing Adekunle', email: 'blessing@mail.com' } },
    { id: 'b8c9d0e1-f2a3-4567-bcde-678901234567', created_at: '2025-02-21T20:10:00Z', total_amount: 10000, status: 'completed', profiles: { display_name: 'Tunde Bakare', email: 'tunde.b@mail.com' } },
    { id: 'c9d0e1f2-a3b4-5678-cdef-789012345678', created_at: '2025-02-20T15:45:00Z', total_amount: 65000, status: 'refunded', profiles: { display_name: 'Amina Yusuf', email: 'amina.y@mail.com' } },
    { id: 'd0e1f2a3-b4c5-6789-defa-890123456789', created_at: '2025-02-19T11:30:00Z', total_amount: 22000, status: 'completed', profiles: { display_name: 'Oluwaseun Martins', email: 'seun@mail.com' } },
    { id: 'e1f2a3b4-c5d6-7890-efab-901234567890', created_at: '2025-02-18T07:00:00Z', total_amount: 35000, status: 'completed', profiles: { display_name: 'Chidinma Agu', email: 'chidinma@mail.com' } },
    { id: 'f2a3b4c5-d6e7-8901-fabc-012345678901', created_at: '2025-02-17T19:25:00Z', total_amount: 8000, status: 'completed', profiles: { display_name: 'Ibrahim Musa', email: 'ibrahim.m@mail.com' } },
];

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
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isTicketDetailsOpen, setIsTicketDetailsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSearchingOrders, setIsSearchingOrders] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const user = await getCurrentUser();
                if (!user) {
                    setOrders(DUMMY_ORDERS);
                    return;
                }
                
                const data = await getPurchasesByEvent(user.id);

                const mappedData = (data || []).map(order => ({
                    ...order,
                    status: order.ticket_status,
                    profiles: {
                        display_name: order.buyer_name,
                        email: order.buyer_email
                    }
                }));

                setOrders(mappedData.length > 0 ? mappedData : DUMMY_ORDERS);
            } catch (error) {
                console.error('Error fetching orders:', error);
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };

        const fetchStats = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { count } = await supabase
                    .from('events')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', session.user.id)
                    .gte('start_time', new Date().toISOString());

                setUpcomingCount(count || 0);
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

        if (profile?.avatar_url) {
            return (
                <img
                    src={profile.avatar_url}
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
            order.profiles?.email?.toLowerCase().includes(search)
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = Math.min(startIndex + ordersPerPage, filteredOrders.length);
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

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
                    <p className="text-2xl font-bold tracking-tight text-black">{orders.length}</p>
                </div>
                <div className="bg-white border border-black/5 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-black/40 text-xs font-sans uppercase tracking-widest mb-1">Completed</h3>
                    <p className="text-2xl font-bold tracking-tight text-green-600">{orders.filter(o => o.status?.toLowerCase() === 'completed').length}</p>
                </div>
                <div className="bg-white border border-black/5 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-black/40 text-xs font-sans uppercase tracking-widest mb-1">Pending</h3>
                    <p className="text-2xl font-bold tracking-tight text-yellow-600">{orders.filter(o => o.status?.toLowerCase() === 'pending').length}</p>
                </div>
                <div className="bg-white border border-black/5 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-black/40 text-xs font-sans uppercase tracking-widest mb-1">Revenue</h3>
                    <p className="text-2xl font-bold tracking-tight text-black">
                        {formatCurrency(orders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0))}
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
                        className="w-full pl-11 pr-4 py-3 border border-black/10 focus:outline-none focus:border-black transition-colors"
                    />
                </div>
                <div className="relative">
                    <div className="hidden md:block relative min-w-[160px]">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                        <select className="w-full pl-10 pr-10 py-3 border border-black/10 focus:outline-none focus:border-black transition-colors appearance-none bg-white text-sm">
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
                                                {order.tickets.length > 1 && (
                                                    <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-tight">
                                                        {order.tickets.length} Tickets
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
                                                    {order.tickets.length > 1 && (
                                                        <span className="text-[11px] text-blue-600 font-bold uppercase tracking-tight">
                                                            {order.tickets.length} Tickets
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
        </div>
    );
}
