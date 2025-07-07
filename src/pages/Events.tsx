import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Calendar, Users, Plus, TrendingUp } from 'lucide-react';

const Events = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = [
    { id: 'all', name: 'All Events' },
    { id: 'music', name: 'Music' },
    { id: 'tech', name: 'Tech' },
    { id: 'art', name: 'Art' },
    { id: 'business', name: 'Business' },
  ];

  const events = [
    {
      id: 1,
      title: 'Electronic Fusion Night',
      artist: 'DJ Synthesis',
      date: 'Feb 15, 2025',
      time: '8:00 PM',
      location: 'Virtual Event',
      type: 'music',
      image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      price: '$25',
      attendees: 234,
      investment: 75,
      trending: true,
    },
    {
      id: 2,
      title: 'Acoustic Sessions',
      artist: 'Luna & The Waves',
      date: 'Feb 22, 2025',
      time: '7:30 PM',
      location: 'Brooklyn, NY',
      type: 'music',
      image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      price: '$35',
      attendees: 156,
      investment: 60,
      trending: false,
    },
    {
      id: 3,
      title: 'Tech Talk: AI in Music',
      artist: 'Innovation Labs',
      date: 'Mar 1, 2025',
      time: '6:00 PM',
      location: 'San Francisco, CA',
      type: 'tech',
      image: 'https://images.pexels.com/photos/2004161/pexels-photo-2004161.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      price: '$15',
      attendees: 89,
      investment: 90,
      trending: true,
    },
    {
      id: 4,
      title: 'Digital Art Showcase',
      artist: 'Pixel Collective',
      date: 'Mar 5, 2025',
      time: '5:00 PM',
      location: 'Los Angeles, CA',
      type: 'art',
      image: 'https://images.pexels.com/photos/1269968/pexels-photo-1269968.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      price: '$20',
      attendees: 78,
      investment: 45,
      trending: false,
    },
    {
      id: 5,
      title: 'Startup Pitch Night',
      artist: 'Entrepreneur Hub',
      date: 'Mar 8, 2025',
      time: '7:00 PM',
      location: 'Austin, TX',
      type: 'business',
      image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      price: '$30',
      attendees: 123,
      investment: 80,
      trending: false,
    },
    {
      id: 6,
      title: 'Jazz & Wine Evening',
      artist: 'The Smooth Collective',
      date: 'Mar 12, 2025',
      time: '8:30 PM',
      location: 'New Orleans, LA',
      type: 'music',
      image: 'https://images.pexels.com/photos/1370545/pexels-photo-1370545.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      price: '$45',
      attendees: 67,
      investment: 30,
      trending: false,
    },
  ];

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.artist.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || event.type === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Discover Events
            </h1>
            <p className="text-gray-600">Find and create amazing experiences</p>
          </div>
          <Link
            to="/events/create"
            className="mt-4 md:mt-0 bg-gradient-to-r from-primary-600 to-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Event</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events, artists, or venues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`px-4 py-3 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
                    selectedFilter === filter.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
            >
              <div className="relative">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  {event.trending && (
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Trending</span>
                    </span>
                  )}
                </div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-gray-900">
                  {event.price}
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {event.title}
                </h3>
                <p className="text-gray-600 mb-4">{event.artist}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{event.date} at {event.time}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{event.attendees} attending</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Investment Progress</span>
                    <span className="text-sm font-medium text-primary-600">{event.investment}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary-600 to-electric-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${event.investment}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* No Results */}
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
            <Link
              to="/events/create"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create the first event</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;