import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, Plus } from 'lucide-react';
import { listEvents, StandaloneEvent } from '@/lib/api/events';
import EventCard, { EventCardSkeleton } from '../components/EventCard';

const Events = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [events, setEvents] = useState<StandaloneEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const filters = [
    { id: 'all', name: 'All Events' },
    { id: 'music', name: 'Music' },
    { id: 'tech', name: 'Tech' },
    { id: 'art', name: 'Art' },
    { id: 'business', name: 'Business' },
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const eventsData = await listEvents({ page_size: 100 });
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || event.tags?.some(tag => tag.name?.toLowerCase() === selectedFilter);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
              Discover Events
            </h1>
            <p className="text-lg text-gray-600">Find and create amazing experiences.</p>
          </div>
          <button
            onClick={() => navigate('/events/create')}
            className="group relative inline-flex items-center justify-center bg-black hover:bg-gray-800 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Event
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-10">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="w-full md:w-96 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black focus:bg-white transition-all text-gray-900 font-medium placeholder:text-gray-400"
              />
            </div>

            {/* Filters */}
            <div className="flex-1 w-full overflow-x-auto hide-scrollbar">
              <div className="flex gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`px-5 py-3 rounded-xl font-bold whitespace-nowrap transition-all duration-200 ${
                      selectedFilter === filter.id
                        ? 'bg-black text-white shadow-md'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <EventCardSkeleton key={`events-skeleton-${i}`} />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map((event) => {
              const rawPrice = (event as any).price_from;
              const price = rawPrice != null ? Number(rawPrice) : 0;
              const mappedLocation = event.venue?.name || event.location?.venue || event.location?.city || 'Online';
              const mappedStatus = (event as any).is_sold_out ? 'Sold Out' : 'On Sale';
              const mappedDate = event.scheduled_for ? new Date(event.scheduled_for).toISOString() : '';
              
              return (
                <div 
                  key={event.event_id} 
                  onClick={() => navigate(`/events/${event.event_id}`)}
                  className="cursor-pointer"
                >
                  <EventCard
                    title={event.title}
                    location={mappedLocation}
                    status={mappedStatus}
                    price={price}
                    date={mappedDate}
                    media={{
                      type: 'image',
                      src: event.thumbnail_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
                      alt: event.title
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedFilter('all');
              }}
              className="bg-gray-100 text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;