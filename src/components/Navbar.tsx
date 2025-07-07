import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from './Logo';
import TextLogo from './TextLogo';
import MobileMenu from './MobileMenu';

type MenuItem = {
  name: string;
  path: string;
};

type DropdownItem = {
  name: string;
  path: string;
};

type NavLink = MenuItem | {
  name: string;
  hasDropdown: true;
  dropdownItems: DropdownItem[];
  path?: never;
};

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const links: NavLink[] = [
    { name: 'Events', path: '/events' },
    { name: 'Explore', path: '/explore' },
    { name: 'Store', path: '/store' },
    { 
      name: 'More', 
      hasDropdown: true, 
      dropdownItems: [
        { name: 'Community Task', path: '/community' },
        { name: 'Help Center', path: '/help' }
      ]
    }
  ];

  // Search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsMobileMenuOpen(false);
    }
  };

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <nav 
      className={`fixed top-0 w-full z-50 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-white'
      }`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="flex justify-between items-center h-20 py-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Left Section: Logo, Search, and Navigation */}
          <div className="flex items-center space-x-4 md:space-x-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center space-x-1.5 ${isScrolled ? 'h-10' : 'h-12'} sm:ml-4`}
            >
              <Link to="/" className="flex items-center space-x-1.5">
                <Logo />
                <TextLogo />
              </Link>
              
              {/* Search Icon - Only shown on mobile when search box is hidden */}
              <div className="sm:hidden">
                <button 
                  className="p-1.5 text-black hover:text-gray-800"
                  onClick={() => {}}
                  aria-label="Search"
                >
                  <Search className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
            
            {/* Search Box - shown on medium screens and up with expand-on-focus animation */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="relative hidden sm:flex items-center flex-shrink min-w-0"
              style={{ flex: '0 1 auto' }}
            >
              <div className="relative">
                <motion.div 
                  className="relative"
                  initial={false}
                  animate={{
                    width: isSearchFocused ? '280px' : '200px',
                  }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                    className={`w-full px-4 py-2 pl-10 text-sm text-gray-700 bg-gray-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all duration-200`}
                    placeholder="Search for events, shows, and creators..."
                    style={{
                      minWidth: '200px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </motion.div>
              </div>
            </motion.div>

            {/* Desktop Navigation - shown only on large (lg) and up */}
            <div className="hidden lg:flex items-center space-x-8">
              {links.map((link) => (
                <div 
                  key={link.name} 
                  className="relative"
                  onMouseEnter={() => 'hasDropdown' in link && setActiveDropdown(link.name)}
                  onMouseLeave={() => 'hasDropdown' in link && setActiveDropdown(null)}
                >
                  {'path' in link && link.path ? (
                    <Link
                      to={link.path}
                      className={`text-[15px] font-bold flex items-center ${
                        isActive(link.path)
                          ? 'text-black'
                          : 'text-black/50 hover:text-black/90 transition-colors'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`text-[15px] font-bold ${
                        activeDropdown === link.name
                          ? 'text-black'
                          : 'text-black/50 hover:text-black/90 transition-colors'
                      }`}
                    >
                      {link.name}
                    </button>
                  )}
                  
                  {/* Dropdown Menu */}
                  {'hasDropdown' in link && activeDropdown === link.name && (
                    <div 
                      className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                      onMouseEnter={() => setActiveDropdown(link.name)}
                      onMouseLeave={() => setActiveDropdown(null)}
                    >
                      {link.dropdownItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.path}
                          className={`block px-4 py-2 text-sm font-bold ${
                            isActive(item.path)
                              ? 'text-black bg-gray-50'
                              : 'text-gray-700/80 hover:text-gray-900 hover:bg-gray-100 transition-colors'
                          }`}
                          onClick={() => setActiveDropdown(null)}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Section: Auth Buttons */}
          <div className="flex items-center space-x-4">
            {/* Generate with AI Button - Medium - shown only on lg (1024px) and up */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden lg:block xl:hidden"
            >
              <Link
                to="/generate"
                className="group relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors duration-200"
                style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  color: '#8b5cf6',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="w-4 h-4"
                  >
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline">Generate with AI</span><span className="sm:hidden">Generate</span>
                </span>
                <div 
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)'
                  }}
                />
              </Link>
            </motion.div>

            {/* Generate with AI Button - Desktop - shown only on xl (1240px) and up */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden xl:block"
            >
              <Link
                to="/generate"
                className="group relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors duration-200"
                style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  color: '#8b5cf6',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="w-4 h-4"
                  >
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline">Generate with AI</span><span className="sm:hidden">Generate</span>
                </span>
                <div 
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)'
                  }}
                />
              </Link>
            </motion.div>

            {/* Sign In button - shown until the main menu disappears */}
            <div className="hidden xl:block">
              <Link
                to="/signin"
                className="bg-black text-white px-4 py-2 rounded-full text-[15px] font-bold hover:bg-gray-800 transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
            </div>
            {/* Generate with AI Button - Mobile/Tablet */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="lg:hidden mr-2"
            >
              <Link
                to="/generate"
                className="group relative flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200"
                style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  color: '#8b5cf6',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}
              >
                <span className="relative z-10 flex items-center gap-1">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="w-3.5 h-3.5"
                  >
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline">Generate with AI</span><span className="sm:hidden">Generate</span>
                </span>
              </Link>
            </motion.div>
            
            {/* Mobile menu button - shown on medium and small screens */}
            <div className="flex items-center lg:hidden ml-2">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex items-center justify-center p-2 text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none"
                aria-label="Open menu"
              >
                <svg
                  className="w-6 h-6 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
    </nav>
  );
};

export default Navbar;
