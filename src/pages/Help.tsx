import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, HelpCircle, Book, MessageCircle, Mail } from 'lucide-react';

const Help = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openFAQ, setOpenFAQ] = useState(null);

  const helpCategories = [
    {
      title: 'Getting Started',
      icon: Book,
      articles: [
        'How to create your first event',
        'Setting up your profile',
        
        'Understanding the investment system',
        'Joining community tasks',
      ],
    },
    {
      title: 'Events & Tickets',
      icon: HelpCircle,
      articles: [
        'Creating and managing events',
        'Ticket pricing strategies',
        'Event promotion tips',
        'Handling refunds and cancellations',
      ],
    },
    {
      title: 'Investments',
      icon: HelpCircle,
      articles: [
        'How event investments work',
        'Understanding returns and risks',
        'Investment portfolio management',
        'Withdrawal and payout process',
      ],
    },
    {
      title: 'Community Tasks',
      icon: HelpCircle,
      articles: [
        'Finding and applying for tasks',
        'Task completion guidelines',
        'Payment and rewards system',
        'Creating tasks for your brand',
      ],
    },
  ];

  const faqs = [
    {
      question: 'How do I create my first event on Amptive?',
      answer: 'Creating an event is simple! Download the mobile app, complete your profile, then tap "Create Event" from the main menu. Fill in your event details, set ticket prices, and optionally enable investment opportunities. Our AI tool can help generate cover photos for your event.',
    },
    {
      question: 'How does the investment system work?',
      answer: 'Event creators can open their events for investment, allowing community members to fund events in exchange for a share of profits. Investors receive returns based on ticket sales and event success. All investments are clearly outlined with expected returns and risk levels.',
    },
    {
      question: 'What types of community tasks are available?',
      answer: 'Community tasks include surveys, product reviews, social media campaigns, content creation, and beta testing. Tasks are posted by verified brands and community managers, with clear requirements and reward amounts.',
    },
    {
      question: 'How do I get paid for completed tasks?',
      answer: 'Payments for completed tasks are processed within 5-7 business days after approval. You can track your earnings in the app and withdraw funds to your connected bank account or digital wallet.',
    },
    {
      question: 'Is my investment money safe?',
      answer: 'While all investments carry risk, we work only with verified creators and provide detailed risk assessments. We recommend diversifying your investments and only investing amounts you can afford to lose.',
    },
    {
      question: 'Can I get a refund for event tickets?',
      answer: 'Refund policies vary by event and are set by the event creator. Most events offer refunds up to 48 hours before the event date. Check the specific event\'s refund policy before purchasing.',
    },
    {
      question: 'How do I contact customer support?',
      answer: 'You can reach our support team through the in-app chat, email us at support@amptive.com, or use the contact form below. We typically respond within 24 hours.',
    },
    {
      question: 'What makes Amptive different from other platforms?',
      answer: 'Amptive uniquely combines event creation, investment opportunities, and community tasks in one platform. We focus on empowering creators while providing multiple ways for community members to earn and engage.',
    },
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Help Center
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to common questions and learn how to make the most of Amptive.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for help articles, FAQs, or topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Help Categories */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
            <div className="space-y-4">
              {helpCategories.map((category, index) => (
                <div key={index} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-electric-500 rounded-lg flex items-center justify-center mr-3">
                      <category.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {category.articles.map((article, articleIndex) => (
                      <li key={articleIndex}>
                        <a
                          href="#"
                          className="text-gray-600 hover:text-primary-600 transition-colors text-sm"
                        >
                          {article}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {filteredFAQs.map((faq, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-lg font-medium text-gray-900 pr-4">{faq.question}</h3>
                    {openFAQ === index ? (
                      <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                  {openFAQ === index && (
                    <div className="px-6 pb-4">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredFAQs.length === 0 && searchTerm && (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600">Try different keywords or browse our categories above.</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-16 bg-white p-8 rounded-2xl shadow-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Still Need Help?</h2>
            <p className="text-gray-600">Our support team is here to help you with any questions or issues.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-electric-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Live Chat</h3>
              <p className="text-gray-600 mb-4">Chat with our support team in real-time through the mobile app.</p>
              <button className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors">
                Open Chat
              </button>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-electric-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Email Support</h3>
              <p className="text-gray-600 mb-4">Send us an email and we'll respond within 24 hours.</p>
              <a
                href="mailto:support@amptive.com"
                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-block"
              >
                Email Us
              </a>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-electric-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Book className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Documentation</h3>
              <p className="text-gray-600 mb-4">Detailed guides and API documentation for developers.</p>
              <button className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors">
                View Docs
              </button>
            </div>
          </div>
        </div>

        {/* Community Guidelines */}
        <div className="mt-12 bg-gradient-to-r from-primary-600 to-electric-600 text-white p-8 rounded-2xl">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Community Guidelines</h2>
            <p className="text-white/90 mb-6">
              Amptive is built on trust, creativity, and mutual respect. Our community guidelines ensure 
              a safe and positive experience for all users.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">For Creators</h3>
                <ul className="text-white/90 text-sm space-y-1">
                  <li>• Provide accurate event information</li>
                  <li>• Deliver promised experiences</li>
                  <li>• Communicate transparently with investors</li>
                  <li>• Respect intellectual property rights</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">For Community Members</h3>
                <ul className="text-white/90 text-sm space-y-1">
                  <li>• Complete tasks honestly and thoroughly</li>
                  <li>• Provide constructive feedback</li>
                  <li>• Respect other community members</li>
                  <li>• Follow task requirements carefully</li>
                </ul>
              </div>
            </div>
            <div className="mt-6">
              <button className="bg-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30 transition-colors">
                Read Full Guidelines
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;