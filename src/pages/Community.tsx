import React, { useState } from 'react';
import { Search, Filter, Users, DollarSign, Clock, Calendar, Plus, TrendingUp, Award } from 'lucide-react';

const Community = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = [
    { id: 'all', name: 'All Tasks' },
    { id: 'survey', name: 'Surveys' },
    { id: 'review', name: 'Reviews' },
    { id: 'social', name: 'Social Media' },
    { id: 'content', name: 'Content Creation' },
  ];

  const tasks = [
    {
      id: 1,
      title: 'Music Festival Survey 2025',
      company: 'Festival Productions',
      type: 'survey',
      reward: 25,
      duration: '10 minutes',
      deadline: '5 days',
      participants: 234,
      maxParticipants: 500,
      difficulty: 'Easy',
      description: 'Share your thoughts on music festival experiences and preferences.',
      requirements: ['Age 18+', 'Music festival attendee'],
      verified: true,
    },
    {
      id: 2,
      title: 'Review New Audio Plugin',
      company: 'SoundTech Labs',
      type: 'review',
      reward: 50,
      duration: '30 minutes',
      deadline: '12 days',
      participants: 89,
      maxParticipants: 100,
      difficulty: 'Medium',
      description: 'Test and review our new audio processing plugin for music producers.',
      requirements: ['Music production experience', 'DAW software'],
      verified: true,
    },
    {
      id: 3,
      title: 'Instagram Story Campaign',
      company: 'Creative Brands Co.',
      type: 'social',
      reward: 35,
      duration: '15 minutes',
      deadline: '3 days',
      participants: 156,
      maxParticipants: 200,
      difficulty: 'Easy',
      description: 'Create and share Instagram stories featuring our new product line.',
      requirements: ['1K+ followers', 'Active Instagram account'],
      verified: true,
    },
    {
      id: 4,
      title: 'Event Photography Content',
      company: 'Event Solutions Inc.',
      type: 'content',
      reward: 100,
      duration: '2 hours',
      deadline: '8 days',
      participants: 23,
      maxParticipants: 50,
      difficulty: 'Hard',
      description: 'Create promotional content for upcoming events in your city.',
      requirements: ['Photography skills', 'Professional camera'],
      verified: true,
    },
    {
      id: 5,
      title: 'Podcast Listening Survey',
      company: 'Audio Research Group',
      type: 'survey',
      reward: 15,
      duration: '5 minutes',
      deadline: '10 days',
      participants: 445,
      maxParticipants: 1000,
      difficulty: 'Easy',
      description: 'Quick survey about your podcast listening habits and preferences.',
      requirements: ['Regular podcast listener'],
      verified: true,
    },
    {
      id: 6,
      title: 'Beta Test Music App',
      company: 'Harmony Tech',
      type: 'review',
      reward: 75,
      duration: '1 hour',
      deadline: '15 days',
      participants: 67,
      maxParticipants: 150,
      difficulty: 'Medium',
      description: 'Test our new music streaming app and provide detailed feedback.',
      requirements: ['iOS/Android device', 'Music streaming experience'],
      verified: true,
    },
  ];

  const myEarnings = [
    { month: 'January', amount: 185 },
    { month: 'February', amount: 230 },
    { month: 'March', amount: 156 },
  ];

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || task.type === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'Hard': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'survey': return '📊';
      case 'review': return '⭐';
      case 'social': return '📱';
      case 'content': return '🎨';
      default: return '📋';
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Community Tasks
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Complete tasks for brands and communities. Earn rewards while helping shape the future of creative products and services.
          </p>
        </div>

        {/* Earnings Dashboard */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Earnings</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">$571</div>
              <div className="text-gray-600">Total Earned</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-1">23</div>
              <div className="text-gray-600">Tasks Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-electric-600 mb-1">$156</div>
              <div className="text-gray-600">This Month</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">4.9</div>
              <div className="text-gray-600">Rating</div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              {myEarnings.map((earning, index) => (
                <div key={index} className="text-center">
                  <div className="text-lg font-semibold text-gray-900">${earning.amount}</div>
                  <div className="text-sm text-gray-600">{earning.month}</div>
                </div>
              ))}
            </div>
            <button className="bg-gradient-to-r from-primary-600 to-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tasks, companies, or keywords..."
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

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getTypeIcon(task.type)}</span>
                    {task.verified && (
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                        <Award className="w-3 h-3" />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(task.difficulty)}`}>
                    {task.difficulty}
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {task.title}
                </h3>
                <p className="text-gray-600 font-medium mb-4">{task.company}</p>
                
                <p className="text-gray-600 text-sm mb-6">{task.description}</p>

                {/* Task Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                    <span className="font-semibold text-green-600">${task.reward}</span>
                    <span className="ml-1">reward</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{task.duration} duration</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{task.deadline} left</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{task.participants}/{task.maxParticipants} participants</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{Math.round((task.participants / task.maxParticipants) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary-600 to-electric-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(task.participants / task.maxParticipants) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Requirements */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Requirements:</h4>
                  <div className="flex flex-wrap gap-2">
                    {task.requirements.map((req, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Apply Button */}
                <button className="w-full bg-gradient-to-r from-primary-600 to-electric-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200">
                  Apply for Task
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Task CTA */}
        <div className="mt-16 bg-gradient-to-r from-primary-600 to-electric-600 text-white p-8 rounded-2xl">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Need Community Input for Your Project?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Create tasks for the Amptive community and get valuable feedback, content, and insights for your brand or project.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">Engaged Community</h3>
                <p className="text-white/90 text-sm">Access thousands of active creators and community members.</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">Quality Results</h3>
                <p className="text-white/90 text-sm">Our verification system ensures high-quality submissions.</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">Fair Pricing</h3>
                <p className="text-white/90 text-sm">Set your budget and reward participants fairly for their time.</p>
              </div>
            </div>
            <button className="bg-white text-primary-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-200 transform hover:scale-105">
              Create Your First Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;