import React, { useEffect, useState } from 'react';
import { RefreshCw, Plus, Search, Filter, ChevronDown, Star, ExternalLink, Pen, Trash2, FileText, LayoutList, CalendarDays, History, Ticket } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Link } from 'react-router-dom';

const supabase = createClient();

export default function DashboardEvents() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState('Upcoming');
    const eventsPerPage = 10;

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select('*, event_tickets(id)')
                    .order('created_at', { ascending: false });

                if (error) throw error;
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

    const filteredEvents = events.filter((event) => {
        if (activeFilter === 'All') return true;
        if (activeFilter === 'Upcoming') return new Date(event.start_time || event.created_at) >= new Date();
        if (activeFilter === 'Past') return new Date(event.start_time || event.created_at) < new Date();
        if (activeFilter === 'Draft') return event.status === 'draft' || event.status === 'Draft';
        return true;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / eventsPerPage));
    const startIndex = (currentPage - 1) * eventsPerPage;
    const endIndex = Math.min(startIndex + eventsPerPage, filteredEvents.length);
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

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
            <header className="mb-4 md:mb-5 w-full">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
                        Events
                    </h1>
                    <p className="text-[15px] text-black/40 font-sans mt-1">Manage and track all your events in one place.</p>
                </div>
            </header>

            {/* Filter Pills and Actions */}
            <div className="flex items-center justify-between mb-8 overflow-x-auto no-scrollbar">
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
            </div>

            {/* Card Grid Structure */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8 max-w-6xl">
                {paginatedEvents.map((event) => (
                    <Link to={`/dashboard/events/${event.id}/edit`} key={event.id} className="bg-white rounded-lg overflow-hidden shadow-sm transition-colors border border-gray-200 hover:border-gray-300 text-sm block group">
                        <div className="relative aspect-square bg-white px-2 pt-2 rounded-t-xl overflow-hidden">
                            <img src={event.cover_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'} alt={event.title} className="w-full h-full object-cover rounded-lg group-hover:scale-[1.02] transition-transform duration-300" />

                            {/* Ticket Count Pill */}
                            <div className="absolute top-4 right-4">
                                <div className="bg-white/90 backdrop-blur-sm text-black text-[10px] font-bold px-2 py-1 rounded-full border border-black/5 flex items-center gap-1 shadow-sm">
                                    <Ticket className="w-3 h-3 text-black/70" />
                                    <span className="text-black/70">{event.event_tickets?.length || 0}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-3">
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
                                <CalendarDays className="w-[1.2em] h-[1.2em] mr-1 text-red-500 -mt-0.5" />
                                <span>{event.start_time ? formatDate(event.start_time) : formatDate(event.created_at)}</span>
                            </div>
                            <h3 className="text-[13px] font-semibold text-gray-900 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{event.title}</h3>
                            <div className="flex flex-col mb-2 mt-1">
                                <span className="text-xs text-gray-500">Location</span>
                                <span className="font-medium text-sm text-gray-600 line-clamp-1">{event.venue || event.city || 'TBA'}</span>
                            </div>
                            <div className="mt-1.5 w-full">
                                <div className="rounded-lg py-1.5 px-3 text-center w-full bg-[#F1F7FE] group-hover:bg-blue-100 transition-colors">
                                    <span className="font-medium text-[13px] text-[#0C61D9]">Edit Event</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {!loading && filteredEvents.length === 0 && (
                <div className="bg-white border rounded-2xl py-12 text-center text-black/40 text-sm shadow-sm mb-8">
                    No events found.
                </div>
            )}

            {/* Pagination Controls */}
            {filteredEvents.length > eventsPerPage && (
                <div className="w-full flex items-center justify-between pt-6 border-t border-black/5">
                    <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-xs font-sans font-medium uppercase tracking-wider bg-white border border-black/10 rounded-lg text-black hover:bg-black/5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-medium text-black/60">
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

            <div className="mt-8 flex justify-center md:justify-between items-center text-xs font-sans font-medium uppercase tracking-[0.2em] text-black/30">
                <div className="text-center md:text-left">
                    Showing {filteredEvents.length > 0 ? startIndex + 1 : 0} to {endIndex} of {filteredEvents.length} total entries
                </div>
                <div className="hidden md:block">Amptive Event Feed</div>
            </div>
        </div >
    );
}
