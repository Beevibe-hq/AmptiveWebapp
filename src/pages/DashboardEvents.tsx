import { useEffect, useState } from 'react';
import { Plus, Search, CalendarDays, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSession } from '@/lib/api/auth';
import { getEventsByUser, StandaloneEvent } from '@/lib/api/events';
import { getTicketsForEvent } from '@/lib/api/tickets';
import amptiveLogo from '@/assets/amptivelogo.svg';

export default function DashboardEvents() {
    const [events, setEvents] = useState<StandaloneEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState('Upcoming');
    const eventsPerPage = 10;

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const session = await getSession();
                if (!session || !session.user) {
                    setLoading(false);
                    return;
                }

                const data = await getEventsByUser();
                setEvents(data || []);
            } catch (error) {
                console.error('Error fetching events:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const filteredEvents = events
        .filter((event) => {
            if (activeFilter === 'All') return true;
            if (activeFilter === 'Upcoming') return event.status.toLowerCase() !== 'draft' && new Date(event.scheduled_for ?? '') >= new Date();
            if (activeFilter === 'Past') return event.status.toLowerCase() !== 'draft' && new Date(event.scheduled_for ?? '') < new Date();
            if (activeFilter === 'Draft') return event.status.toLowerCase() === 'draft';
            return true;
        })
        .sort((a, b) => {
            if (activeFilter === 'Upcoming') {
                return new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime();
            }
            if (activeFilter === 'Past') {
                return new Date(b.scheduled_for!).getTime() - new Date(a.scheduled_for!).getTime();
            }
            // Default to newest first for All/Drafts
            return new Date(b.scheduled_for!).getTime() - new Date(a.scheduled_for!).getTime();
        });

    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / eventsPerPage));
    const startIndex = (currentPage - 1) * eventsPerPage;
    const endIndex = Math.min(startIndex + eventsPerPage, filteredEvents.length);
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

    const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchTicketCounts = async () => {
            const counts: Record<string, number> = {};
            await Promise.all(paginatedEvents.map(async (event) => {
                // If we already have the count, or the event already includes it natively, skip
                if (ticketCounts[event.event_id] !== undefined) return;
                
                try {
                    const tickets = await getTicketsForEvent(event.event_id);
                    counts[event.event_id] = tickets.length;
                } catch {
                    counts[event.event_id] = 0;
                }
            }));
            if (Object.keys(counts).length > 0) {
                setTicketCounts(prev => ({ ...prev, ...counts }));
            }
        };
        
        if (paginatedEvents.length > 0) {
            fetchTicketCounts();
        }
    }, [paginatedEvents]);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage((prev) => prev - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    return (
        <div className="px-4 md:px-8 py-8 w-full">
            <header className="mb-4 md:mb-5 w-full flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
                        Events
                    </h1>
                    <p className="hidden sm:block text-[15px] text-black/40 font-sans mt-1">Manage and track all your events in one place.</p>
                </div>

                <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-4">
                    <button className="p-2 md:p-2 bg-[#FDFDFD] border border-gray-200 text-black rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center disabled:opacity-50" title="Search Events">
                        <Search className="w-4 h-4 text-black/70" />
                    </button>
                    <Link
                        to="/events/create"
                        className="bg-[#FDFDFD] border border-gray-200 text-black px-3 py-2 md:px-4 md:py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shrink-0 rounded-xl"
                        title="New Event"
                    >
                        <Plus className="w-4 h-4 text-black/70" />
                        <span>
                            <span className="md:hidden">New</span>
                            <span className="hidden md:inline">New Event</span>
                        </span>
                    </Link>
                </div>
            </header>

            {/* Filter Pills */}
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
                    <button
                        onClick={() => setActiveFilter('Draft')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'Draft' ? 'bg-[#F2F2F2] text-black' : 'bg-transparent text-black/60 hover:bg-black/5'}`}
                    >
                        Drafts
                    </button>
                </div>
            </div>

            {/* Card Grid Structure */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8 max-w-6xl">
                {loading ? (
                    // Skeleton Cards
                    [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="bg-white rounded-lg overflow-hidden border border-gray-200 text-sm">
                            <div className="relative aspect-square bg-gray-50 px-2 pt-2">
                                <div className="skeleton-shimmer w-full h-full rounded-lg" />
                                <div className="absolute top-4 right-4">
                                    <div className="skeleton-shimmer w-10 h-5 rounded-full" />
                                </div>
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="skeleton-shimmer h-3 w-1/2 rounded-full" />
                                <div className="skeleton-shimmer h-4 w-3/4 rounded-full" />
                                <div className="space-y-1">
                                    <div className="skeleton-shimmer h-2 w-1/4 rounded-full" />
                                    <div className="skeleton-shimmer h-3 w-1/2 rounded-full" />
                                </div>
                                <div className="pt-1">
                                    <div className="skeleton-shimmer h-8 w-full rounded-lg" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    paginatedEvents.map((event) => {
                        const isPast = new Date(event.scheduled_for ?? '') < new Date();
                        return (
                        <Link
                            to={isPast ? `/events/${event.event_id}` : `/dashboard/events/${event.event_id}/edit`}
                            key={event.event_id}
                            className="bg-white rounded-lg overflow-hidden shadow-sm transition-colors border border-gray-200 hover:border-gray-300 text-sm block group"
                        >
                            <div className="relative aspect-square bg-white px-2 pt-2 rounded-t-xl overflow-hidden">
                                {event.thumbnail_url ? (
                                    <img src={event.thumbnail_url} alt={event.title} className="w-full h-full object-cover rounded-lg group-hover:scale-[1.02] transition-transform duration-300" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-gray-50">
                                        <img src={amptiveLogo} alt="Amptive" className="h-14 w-auto opacity-20 grayscale" />
                                    </div>
                                )}

                                {/* Ticket Count Pill */}
                                <div className="absolute top-4 right-4">
                                    <div className="bg-white/90 backdrop-blur-sm text-black text-[10px] font-bold px-2 py-1 rounded-full border border-black/5 flex items-center gap-1 shadow-sm">
                                        <Ticket className="w-3 h-3 text-black/70" />
                                        <span className="text-black/70">
                                            {ticketCounts[event.event_id] ?? (event as any).ticket_count ?? event.event_tickets?.length ?? 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-3">
                                <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
                                    <CalendarDays className="w-[1.2em] h-[1.2em] text-red-500" />
                                    <span>{event.scheduled_for ? formatDate(event.scheduled_for!) : formatDate(event.created_at!)}</span>
                                </div>
                                <h3 className="text-[13px] font-semibold text-gray-900 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{event.title}</h3>
                                <div className="flex flex-col mb-2 mt-1">
                                    <span className="text-xs text-gray-500">Location</span>
                                    <span className="font-medium text-sm text-gray-600 line-clamp-1">{event.venue?.name || event.location?.venue || event.venue?.city || event.location?.city || 'TBA'}</span>
                                </div>
                                <div className="mt-1.5 w-full">
                                    <div className="rounded-lg py-1.5 px-3 text-center w-full bg-[#F1F7FE] group-hover:bg-blue-100 transition-colors">
                                        <span className="font-medium text-[13px] text-[#0C61D9]">{isPast ? 'View Event' : 'Edit Event'}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        );
                    })
                )}
            </div>

            {!loading && filteredEvents.length === 0 && (
                <div className="text-center text-gray-500 border border-dashed border-gray-200 rounded-xl py-16 mb-8 mt-4 bg-white shadow-sm">
                    <div className="mx-auto mb-4 text-5xl">😮</div>
                    <h3 className="text-lg font-semibold text-gray-700">No events found</h3>
                    <p className="mt-2 text-sm text-gray-500">Create your first event or adjust your filters.</p>
                    <Link
                        to="/events/create"
                        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-black rounded-full hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create event</span>
                    </Link>
                </div>
            )}

            {/* Pagination Controls & Status */}
            {filteredEvents.length > 0 && (
                <div className="w-full flex flex-col md:flex-row items-center justify-between pt-6 border-t border-black/5 gap-4">
                    <div className="text-sm text-gray-500 font-medium order-2 md:order-1">
                        Showing {startIndex + 1} to {endIndex} of {filteredEvents.length}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-4 order-1 md:order-2">
                            <button
                                onClick={handlePreviousPage}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-xs font-sans font-medium uppercase tracking-wider bg-white border border-black/10 rounded-lg text-black hover:bg-black/5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Previous
                            </button>
                            <span className="text-sm font-medium text-black/60 min-w-[80px] text-center">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 text-xs font-sans font-medium uppercase tracking-wider bg-white border border-black/10 rounded-lg text-black hover:bg-black/5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div >
    );
}
