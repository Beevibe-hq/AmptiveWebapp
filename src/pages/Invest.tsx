import React, { useState } from 'react';
import { TrendingUp, DollarSign, Users, Calendar, ArrowRight, Star, Filter } from 'lucide-react';

const Invest = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [investmentAmount, setInvestmentAmount] = useState('');

  const filters = [
    { id: 'all', name: 'All Opportunities' },
    { id: 'music', name: 'Music' },
    { id: 'tech', name: 'Tech' },
    { id: 'art', name: 'Art' },
    { id: 'high-return', name: 'High Return' },
  ];

  const investments = [
    {
      id: 1,
      title: 'Electronic Fusion Night',
      artist: 'DJ Synthesis',
      category: 'music',
      image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      goal: 10000,
      raised: 7500,
      progress: 75,
      minInvestment: 50,
      expectedReturn: '15-25%',
      duration: '3 months',
      investors: 23,
      daysLeft: 12,
      riskLevel: 'Medium',
      featured: true,
    },
    {
      id: 2,
      title: 'Tech Conference 2025',
      artist: 'Innovation Labs',
      category: 'tech',
      image: 'https://images.pexels.com/photos/2004161/pexels-photo-2004161.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      goal: 25000,
      raised: 22500,
      progress: 90,
      minInvestment: 100,
      expectedReturn: '20-30%',
      duration: '4 months',
      investors: 45,
      daysLeft: 5,
      riskLevel: 'Low',
      featured: true,
    },
    {
      id: 3,
      title: 'Acoustic Sessions',
      artist: 'Luna & The Waves',
      category: 'music',
      image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      goal: 5000,
      raised: 3000,
      progress: 60,
      minInvestment: 25,
      expectedReturn: '10-20%',
      duration: '2 months',
      investors: 18,
      daysLeft: 20,
      riskLevel: 'Medium',
      featured: false,
    },
    {
      id: 4,
      title: 'Digital Art Showcase',
      artist: 'Pixel Collective',
      category: 'art',
      image: 'https://images.pexels.com/photos/1269968/pexels-photo-1269968.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      goal: 8000,
      raised: 3600,
      progress: 45,
      minInvestment: 40,
      expectedReturn: '12-22%',
      duration: '3 months',
      investors: 12,
      daysLeft: 25,
      riskLevel: 'High',
      featured: false,
    },
  ];

  const myInvestments = [
    {
      id: 1,
      title: 'Jazz & Wine Evening',
      invested: 250,
      currentValue: 287.50,
      return: 15,
      status: 'active',
    },
    {
      id: 2,
      title: 'Startup Pitch Night',
      invested: 500,
      currentValue: 620,
      return: 24,
      status: 'completed',
    },
  ];

  const filteredInvestments = investments.filter(investment => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'high-return') return parseInt(investment.expectedReturn.split('-')[1]) >= 25;
    return investment.category === selectedFilter;
  });

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'High': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Invest in Creative Events
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Support creators and earn returns by investing in promising events and experiences.
          </p>
        </div>

        {/* My Investments Dashboard */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Investment Portfolio</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">$750</div>
              <div className="text-gray-600">Total Invested</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">$907.50</div>
              <div className="text-gray-600">Current Value</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-1">+21%</div>
              <div className="text-gray-600">Total Return</div>
            </div>
          </div>

          <div className="space-y-4">
            {myInvestments.map((investment) => (
              <div key={investment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900">{investment.title}</h3>
                  <p className="text-sm text-gray-600">Invested: ${investment.invested}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">${investment.currentValue}</div>
                  <div className={`text-sm ${investment.return > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    +{investment.return}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
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

        {/* Investment Opportunities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredInvestments.map((investment) => (
            <div
              key={investment.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="relative">
                <img
                  src={investment.image}
                  alt={investment.title}
                  className="w-full h-48 object-cover"
                />
                {investment.featured && (
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Star className="w-3 h-3" />
                    <span>Featured</span>
                  </div>
                )}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(investment.riskLevel)}`}>
                  {investment.riskLevel} Risk
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{investment.title}</h3>
                <p className="text-gray-600 mb-4">{investment.artist}</p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{investment.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary-600 to-electric-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${investment.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>${investment.raised.toLocaleString()} raised</span>
                    <span>${investment.goal.toLocaleString()} goal</span>
                  </div>
                </div>

                {/* Investment Details */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-600">Min. Investment</div>
                    <div className="font-semibold text-gray-900">${investment.minInvestment}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Expected Return</div>
                    <div className="font-semibold text-green-600">{investment.expectedReturn}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Duration</div>
                    <div className="font-semibold text-gray-900">{investment.duration}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Investors</div>
                    <div className="font-semibold text-gray-900">{investment.investors}</div>
                  </div>
                </div>

                {/* Investment Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Investment Amount
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="number"
                        min={investment.minInvestment}
                        placeholder={investment.minInvestment.toString()}
                        value={investmentAmount}
                        onChange={(e) => setInvestmentAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <button className="w-full bg-gradient-to-r from-primary-600 to-electric-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Invest Now</span>
                  </button>
                </div>

                {/* Time Remaining */}
                <div className="flex items-center justify-center mt-4 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{investment.daysLeft} days left</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Investment Tips */}
        <div className="mt-12 bg-gradient-to-r from-primary-600 to-electric-600 text-white p-8 rounded-2xl">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Smart Investment Tips
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">Diversify Your Portfolio</h3>
                <p className="text-white/90 text-sm">Spread your investments across different event types and risk levels.</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">Research Creators</h3>
                <p className="text-white/90 text-sm">Look at the creator's track record and audience engagement.</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">Start Small</h3>
                <p className="text-white/90 text-sm">Begin with minimum investments to learn the platform.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invest;