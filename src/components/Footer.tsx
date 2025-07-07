import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Twitter, Instagram, Youtube, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Amptive</span>
            </div>
            <p className="text-gray-600 text-sm">
              Connecting creators, investors, and communities through innovative events and experiences.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Platform</h3>
            <ul className="space-y-2">
              <li><Link to="/events" className="text-gray-600 hover:text-gray-900 transition-colors">Browse Events</Link></li>
              <li><Link to="/invest" className="text-gray-600 hover:text-gray-900 transition-colors">Investment Opportunities</Link></li>
              <li><Link to="/community" className="text-gray-600 hover:text-gray-900 transition-colors">Community Tasks</Link></li>
              <li><Link to="/ai-tool" className="text-gray-600 hover:text-gray-900 transition-colors">AI Cover Generator</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Resources</h3>
            <ul className="space-y-2">
              <li><Link to="/help" className="text-gray-600 hover:text-gray-900 transition-colors">Help Center</Link></li>
              <li><Link to="/help#faq" className="text-gray-600 hover:text-gray-900 transition-colors">FAQs</Link></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Community Guidelines</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">API Documentation</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            © 2025 Amptive. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/download" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
              Download Mobile App
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;