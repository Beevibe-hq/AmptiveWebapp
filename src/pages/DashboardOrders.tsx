import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, Filter, ChevronDown, ExternalLink, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const DUMMY_ORDERS = [
    { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', created_at: '2025-02-28T14:30:00Z', total_amount: 25000, status: 'completed', profiles: { display_name: 'Adaeze Okafor', email: 'adaeze@mail.com' } },
    { id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', created_at: '2025-02-27T10:15:00Z', total_amount: 15000, status: 'completed', profiles: { display_name: 'Chukwuma Eze', email: 'chukwuma@mail.com' } },
    { id: 'c3d4e5f6-a7b8-9012-cdef-123456789012', created_at: '2025-02-26T18:45:00Z', total_amount: 50000, status: 'pending', profiles: { display_name: 'Fatima Bello', email: 'fatima.b@mail.com' } },
    { id: 'd4e5f6a7-b8c9-0123-defa-234567890123', created_at: '2025-02-25T09:00:00Z', total_amount: 7500, status: 'completed', profiles: { display_name: 'Joseph Achilonu', email: 'joseph@mail.com' } },
    { id: 'e5f6a7b8-c9d0-1234-efab-345678901234', created_at: '2025-02-24T16:20:00Z', total_amount: 32000, status: 'cancelled', profiles: { display_name: 'Grace Nwosu', email: 'grace.n@mail.com' } },
    { id: 'f6a7b8c9-d0e1-2345-fabc-456789012345', created_at: '2025-02-23T12:00:00Z', total_amount: 18500, status: 'completed', profiles: { display_name: 'Emeka Obi', email: 'emeka.obi@mail.com' } },
    { id: 'a7b8c9d0-e1f2-3456-abcd-567890123456', created_at: '2025-02-22T08:30:00Z', total_amount: 42000, status: 'processing', profiles: { display_name: 'Blessing Adekunle', email: 'blessing@mail.com' } },
    { id: 'b8c9d0e1-f2a3-4567-bcde-678901234567', created_at: '2025-02-21T20:10:00Z', total_amount: 10000, status: 'completed', profiles: { display_name: 'Tunde Bakare', email: 'tunde.b@mail.com' } },
    { id: 'c9d0e1f2-a3b4-5678-cdef-789012345678', created_at: '2025-02-20T15:45:00Z', total_amount: 65000, status: 'refunded', profiles: { display_name: 'Amina Yusuf', email: 'amina.y@mail.com' } },
    { id: 'd0e1f2a3-b4c5-6789-defa-890123456789', created_at: '2025-02-19T11:30:00Z', total_amount: 22000, status: 'completed', profiles: { display_name: 'Oluwaseun Martins', email: 'seun@mail.com' } },
    { id: 'e1f2a3b4-c5d6-7890-efab-901234567890', created_at: '2025-02-18T07:00:00Z', total_amount: 35000, status: 'pending', profiles: { display_name: 'Chidinma Agu', email: 'chidinma@mail.com' } },
    { id: 'f2a3b4c5-d6e7-8901-fabc-012345678901', created_at: '2025-02-17T19:25:00Z', total_amount: 8000, status: 'completed', profiles: { display_name: 'Ibrahim Musa', email: 'ibrahim.m@mail.com' } },
];

export default function DashboardOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const ordersPerPage = 10;

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data, error } = await supabase
                    .from('ticket_purchases')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Map the data to match the UI expectations
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
                setOrders(DUMMY_ORDERS);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
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

    const getStatusPill = (status: string) => {
        const config: Record<string, { bg: string; dot: string; text: string }> = {
            completed: { bg: 'bg-emerald-50 border-emerald-200/60', dot: 'bg-emerald-500', text: 'text-emerald-700' },
            valid: { bg: 'bg-emerald-50 border-emerald-200/60', dot: 'bg-emerald-500', text: 'text-emerald-700' },
            pending: { bg: 'bg-amber-50 border-amber-200/60', dot: 'bg-amber-500', text: 'text-amber-700' },
            processing: { bg: 'bg-sky-50 border-sky-200/60', dot: 'bg-sky-500', text: 'text-sky-700' },
            cancelled: { bg: 'bg-rose-50 border-rose-200/60', dot: 'bg-rose-500', text: 'text-rose-700' },
            refunded: { bg: 'bg-slate-50 border-slate-200/60', dot: 'bg-slate-400', text: 'text-slate-600' },
            used: { bg: 'bg-slate-50 border-slate-200/60', dot: 'bg-slate-400', text: 'text-slate-600' },
        };
        const s = config[status?.toLowerCase()] || config.refunded;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${s.bg} ${s.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {status || 'Unknown'}
            </span>
        );
    };

    // Pagination
    const totalPages = Math.ceil(orders.length / ordersPerPage);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = Math.min(startIndex + ordersPerPage, orders.length);
    const paginatedOrders = orders.slice(startIndex, endIndex);

    return (
        <div className="px-4 md:px-8 py-8 w-full">
            <div className="flex items-center justify-between gap-4 mb-6 md:mb-12">
                <div>
                    <h1 className="text-[52px] font-bold tracking-tight text-black mb-2 leading-none">
                        Orders
                    </h1>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <button className="p-2 md:p-3 border border-black/10 hover:bg-black/5 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0" title="Refresh Data">
                        <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
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

            {/* Orders Table / List */}
            <div className="bg-white border md:border-black/5 overflow-hidden border-transparent rounded-2xl shadow-sm">

                {/* Mobile View */}
                <div className="md:hidden flex flex-col divide-y divide-black/5">
                    {paginatedOrders.map((order) => (
                        <div key={order.id} className="p-4 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="font-medium text-black text-sm">#{order.id?.slice(0, 8)?.toUpperCase()}</p>
                                    <p className="text-xs text-black/40 mt-0.5">
                                        {order.profiles?.display_name || order.profiles?.email || 'Guest'}
                                    </p>
                                </div>
                                {getStatusPill(order.status)}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-black/5">
                                <div className="flex items-center gap-3 text-xs text-black/40">
                                    <span>{formatDate(order.created_at)}</span>
                                    <span>•</span>
                                    <span className="font-bold text-black">{formatCurrency(Number(order.total_amount) || 0)}</span>
                                </div>
                                <button className="p-2 text-black/30 hover:text-black transition-colors rounded-lg hover:bg-black/5">
                                    <Eye className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {!loading && orders.length === 0 && (
                        <div className="p-8 text-center text-black/40 text-sm">No orders found.</div>
                    )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-black/5 bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Order ID</th>
                                <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Customer</th>
                                <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Date</th>
                                <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Amount</th>
                                <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40 text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {paginatedOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <span className="font-medium text-black">#{order.id?.slice(0, 8)?.toUpperCase()}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div>
                                            <p className="text-sm font-medium text-black">
                                                {order.profiles?.display_name || 'Guest'}
                                            </p>
                                            <p className="text-xs text-black/40 mt-0.5">
                                                {order.profiles?.email || '—'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm text-black/40 font-sans">{formatDate(order.created_at)}</td>
                                    <td className="px-6 py-5 text-sm font-bold text-black">{formatCurrency(Number(order.total_amount) || 0)}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex justify-center">
                                            {getStatusPill(order.status)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 text-black/30 hover:text-black transition-colors rounded-lg hover:bg-black/5" title="View Details">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-black/30 hover:text-black transition-colors rounded-lg hover:bg-black/5" title="Open">
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && orders.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-black/40 text-sm">
                                        No orders found.
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
