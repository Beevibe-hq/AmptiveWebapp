import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, Share2, Heart, DollarSign, TrendingUp, Clock, Star } from 'lucide-react';

const EventDetail = () => {
  const { id } = useParams();
  const [isLiked, setIsLiked] = useState(false);

  // Mock event data - in real app, this would come from API
  const event = {
    id: 1,
    title: 'Electronic Fusion Night',
    artist: 'DJ Synthesis',
    date: 'Feb 15, 2025',
    time: '8:00 PM - 12:00 AM',
    location: 'Virtual Event',
    image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&dpr=2',
    price: '$25',
    attendees: 234,
    investment: 75,
    investmentGoal: '$10,000',
    investmentRaised: '$7,500',
    description: `Join us for an unforgettable night of electronic music featuring DJ Synthesis, known for blending deep house with ambient soundscapes. This virtual event will feature interactive elements, live chat, and exclusive behind-the-scenes content.

Experience cutting-edge music from the comfort of your home with high-quality streaming and professional lighting effects. Limited capacity ensures an intimate atmosphere despite the virtual format.`,
    features: [
      'High-quality audio streaming',
      'Interactive live chat',
      'Exclusive behind-the-scenes content',
      'Digital meet & greet opportunity',
    ],
    artist_info: {
      name: 'DJ Synthesis',
      bio: 'With over 10 years in the electronic music scene, DJ Synthesis has performed at major festivals worldwide and has a dedicated following of electronic music enthusiasts.',
      image: 'https://images.pexels.com/photos/1389429/pexels-photo-1389429.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      followers: '12.5K',
    },
    reviews: [
      {
        name: 'Alex Chen',
        rating: 5,
        comment: "Amazing experience! The sound quality was incredible and the interactive elements made it feel like a real concert.",
        date: '2 days ago',
      },
      {
        name: 'Maria Garcia',
        rating: 5,
        comment: "DJ Synthesis never disappoints. Great investment opportunity too!",
        date: '1 week ago',
      },
    ],
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link
          to="/events"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Events
        </Link>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="relative">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-64 md:h-80 object-cover"
            />
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.title}</h1>
              <p className="text-xl text-white/90">{event.artist}</p>
            </div>
            <div className="absolute top-6 right-6 flex gap-2">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`p-3 rounded-full backdrop-blur-sm transition-all duration-200 ${
                  isLiked ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <button className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm transition-all duration-200">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Details */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-primary-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{event.date}</p>
                    <p className="text-sm text-gray-600">{event.time}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-primary-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{event.location}</p>
                    <p className="text-sm text-gray-600">Online Event</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-primary-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{event.attendees} Attending</p>
                    <p className="text-sm text-gray-600">Limited capacity</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 text-primary-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{event.price}</p>
                    <p className="text-sm text-gray-600">Per ticket</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-gray max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Event</h3>
                <p className="text-gray-600 whitespace-pre-line">{event.description}</p>
              </div>

              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">What's Included</h4>
                <ul className="space-y-2">
                  {event.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-600">
                      <div className="w-2 h-2 bg-primary-600 rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Artist Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">About the Artist</h2>
              <div className="flex items-start space-x-4">
                <img
                  src={event.artist_info.image}
                  alt={event.artist_info.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{event.artist_info.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{event.artist_info.followers} followers</p>
                  <p className="text-gray-600">{event.artist_info.bio}</p>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>
              <div className="space-y-4">
                {event.reviews.map((review, index) => (
                  <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{review.name}</h4>
                      <span className="text-sm text-gray-500">{review.date}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Purchase */}
            <div className="bg-white p-6 rounded-2xl shadow-sm sticky top-24">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">{event.price}</div>
                <p className="text-gray-600">per ticket</p>
              </div>

              <button className="w-full bg-gradient-to-r from-primary-600 to-electric-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 mb-4">
                Get Tickets
              </button>

              <div className="text-center text-sm text-gray-600 mb-6">
                <Clock className="w-4 h-4 inline mr-1" />
                Early bird pricing ends in 5 days
              </div>

              {/* Investment Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900">Investment Progress</span>
                  <span className="text-sm font-bold text-primary-600">{event.investment}%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div
                    className="bg-gradient-to-r from-primary-600 to-electric-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${event.investment}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-sm text-gray-600 mb-4">
                  <span>Raised: {event.investmentRaised}</span>
                  <span>Goal: {event.investmentGoal}</span>
                </div>

                <Link
                  to="/invest"
                  className="w-full border-2 border-primary-600 text-primary-600 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-all duration-200 text-center block"
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Invest in This Event
                </Link>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Attendees</span>
                  <span className="font-medium text-gray-900">{event.attendees}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Investment Progress</span>
                  <span className="font-medium text-primary-600">{event.investment}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days Until Event</span>
                  <span className="font-medium text-gray-900">12</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;