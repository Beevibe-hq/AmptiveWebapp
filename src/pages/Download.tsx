import React, { useState } from 'react';
import { Smartphone, Download, QrCode, Star, Users, TrendingUp, Zap } from 'lucide-react';

const DownloadPage = () => {
  const [showQR, setShowQR] = useState(false);

  const features = [
    {
      icon: TrendingUp,
      title: 'Create & Invest',
      description: 'Host events and invest in creators with just a few taps.',
    },
    {
      icon: Users,
      title: 'Community Tasks',
      description: 'Complete tasks and earn rewards on the go.',
    },
    {
      icon: Zap,
      title: 'Real-time Updates',
      description: 'Get instant notifications about events and opportunities.',
    },
  ];

  const stats = [
    { number: '50K+', label: 'Active Users' },
    { number: '4.8', label: 'App Store Rating' },
    { number: '10K+', label: 'Events Created' },
    { number: '$2M+', label: 'Creator Earnings' },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Event Creator',
      image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
      quote: 'The mobile app makes managing my events so much easier. I can track investments and communicate with attendees anywhere.',
    },
    {
      name: 'Mike Chen',
      role: 'Community Member',
      image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
      quote: 'I love completing tasks during my commute. The app is intuitive and payments are always on time.',
    },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-electric-600 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Take Amptive<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                  Everywhere
                </span>
              </h1>
              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                Download the Amptive mobile app and access all platform features on the go. 
                Create events, invest in creators, complete tasks, and connect with the community 
                from anywhere.
              </p>

              {/* Download Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a
                  href="#"
                  className="bg-black text-white px-8 py-4 rounded-2xl font-semibold hover:bg-gray-800 transition-all duration-200 flex items-center justify-center space-x-3"
                >
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-sm">📱</span>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-gray-300">Download on the</div>
                    <div className="text-lg font-bold">App Store</div>
                  </div>
                </a>
                <a
                  href="#"
                  className="bg-black text-white px-8 py-4 rounded-2xl font-semibold hover:bg-gray-800 transition-all duration-200 flex items-center justify-center space-x-3"
                >
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-sm">🤖</span>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-gray-300">Get it on</div>
                    <div className="text-lg font-bold">Google Play</div>
                  </div>
                </a>
              </div>

              {/* QR Code Toggle */}
              <button
                onClick={() => setShowQR(!showQR)}
                className="border-2 border-white/30 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-all duration-200 flex items-center space-x-2"
              >
                <QrCode className="w-5 h-5" />
                <span>{showQR ? 'Hide' : 'Show'} QR Code</span>
              </button>
            </div>

            {/* Phone Mockup */}
            <div className="relative">
              <div className="relative z-10 max-w-sm mx-auto">
                <div className="bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
                  <div className="bg-white rounded-[2.5rem] overflow-hidden">
                    <img
                      src="https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg?auto=compress&cs=tinysrgb&w=300&h=600&dpr=2"
                      alt="Amptive Mobile App"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-yellow-400/20 rounded-full animate-bounce-subtle"></div>
              <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-electric-400/20 rounded-full animate-bounce-subtle delay-1000"></div>
            </div>
          </div>

          {/* QR Code Modal */}
          {showQR && (
            <div className="mt-12 bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">Scan to Download</h3>
              <div className="w-48 h-48 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <div className="w-40 h-40 bg-gray-900 rounded-lg flex items-center justify-center">
                  <QrCode className="w-32 h-32 text-white" />
                </div>
              </div>
              <p className="text-white/80">Scan with your phone's camera to download the app</p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Join Thousands of Happy Users
            </h2>
            <p className="text-xl text-gray-600">
              The Amptive community is growing every day
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-primary-600 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Love, Now Mobile
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Access all Amptive features optimized for mobile with exclusive app-only features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-primary-600 to-electric-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What Users Are Saying
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gray-50 p-8 rounded-2xl"
              >
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Features List */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary-600 to-electric-600 text-white p-12 rounded-2xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Mobile-Exclusive Features</h2>
              <p className="text-xl text-white/90">
                Get access to features only available in the mobile app
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="font-semibold mb-2">Push Notifications</h3>
                <p className="text-white/90 text-sm">Get instant updates about events, investments, and tasks.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📍</span>
                </div>
                <h3 className="font-semibold mb-2">Location-Based Events</h3>
                <p className="text-white/90 text-sm">Discover events and tasks near your current location.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📸</span>
                </div>
                <h3 className="font-semibold mb-2">Camera Integration</h3>
                <p className="text-white/90 text-sm">Upload photos directly for tasks and event documentation.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="font-semibold mb-2">Live Chat Support</h3>
                <p className="text-white/90 text-sm">Get instant help from our support team.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔔</span>
                </div>
                <h3 className="font-semibold mb-2">Smart Reminders</h3>
                <p className="text-white/90 text-sm">Never miss an event or task deadline.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="font-semibold mb-2">Offline Mode</h3>
                <p className="text-white/90 text-sm">Access your data even without internet connection.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Download the Amptive app today and join the creative economy revolution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="bg-gradient-to-r from-primary-600 to-electric-500 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download for iOS</span>
            </a>
            <a
              href="#"
              className="bg-gradient-to-r from-primary-600 to-electric-500 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download for Android</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DownloadPage;