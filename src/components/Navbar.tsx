import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from './Logo';
import TextLogo from './TextLogo';
import MobileMenu from './MobileMenu';
import UserAvatar from './UserAvatar';
import { getCurrentUser, signOutSilent } from '@/lib/supabase/auth';
import { getProfileById, isProfileComplete } from '@/lib/supabase/profiles';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';

const supabase = createClient();

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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { dominantColor } = useTheme();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          setUser(null);
          return;
        }
        const profile = await getProfileById(currentUser.id);
        if (!isProfileComplete(profile)) {
          await signOutSilent();
          setUser(null);
        } else {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error fetching user/profile:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user || null;
      if (!u) { setUser(null); return; }
      try {
        const profile = await getProfileById(u.id);
        if (!isProfileComplete(profile)) {
          await signOutSilent();
          setUser(null);
        } else {
          setUser(u);
        }
      } catch (e) {
        console.error('Auth state profile check failed:', e);
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const isProfilePage = location.pathname === '/profile' || location.pathname === '/profile/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Removed auto-redirect on route change; incomplete sessions are signed out silently instead.

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Navigation links for authenticated users
  const authLinks: NavLink[] = [
    { name: 'Create Event', path: '/events' },
    { name: 'Explore', path: '/explore' },
    { name: 'My Tickets', path: '/my-tickets' },
    {
      name: 'More',
      hasDropdown: true,
      dropdownItems: [
        { name: 'View Profile', path: '/profile' },
        { name: 'Settings', path: '/settings' },
        { name: 'Community Task', path: '/community' },
        { name: 'Help Center', path: '/help' }
      ]
    }
  ];

  // Navigation links for unauthenticated users (original)
  const guestLinks: NavLink[] = [
    { name: 'Explore', path: '/explore' },
    { name: 'Create Event', path: '/events' },
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

  const links = user ? authLinks : guestLinks;

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

  const isAIChatPage = location.pathname === '/ai-chat' || location.pathname === '/ai-chat/' || location.pathname === '/chat-mode' || location.pathname === '/chat-mode/';
  const isChatModePage = location.pathname === '/chat-mode' || location.pathname === '/chat-mode/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/login/' || location.pathname === '/signup' || location.pathname === '/signup/';
  const isCompleteProfilePage = location.pathname === '/complete-profile' || location.pathname === '/complete-profile/';
  const isOtpPage = location.pathname === '/verify-otp' || location.pathname === '/verify-otp/';

  return (
    <nav
      className={`fixed top-0 w-full z-50 ${isCompleteProfilePage
        ? 'bg-transparent backdrop-blur-0 shadow-none border-none'
        : isChatModePage
          ? 'bg-white lg:bg-transparent lg:backdrop-blur-0 lg:shadow-none lg:border-none'
          : isAIChatPage
            ? 'bg-transparent backdrop-blur-0 shadow-none border-none'
            : isScrolled
              ? 'backdrop-blur-md shadow-sm border-b border-gray-100'
              : (isProfilePage ? 'bg-transparent' : 'bg-transparent')
        } transition-colors duration-300`}
      style={{
        backgroundColor: !isCompleteProfilePage && !isChatModePage && !isAIChatPage && !isProfilePage && isScrolled
          ? 'rgba(255, 255, 255, 0.95)'
          : undefined
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <motion.div
          className={`flex justify-between items-center ${isAIChatPage ? 'h-16 py-1.5' : 'h-20 py-2'}`}
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
              {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && (
                <div className="sm:hidden">
                  <button
                    className="p-1.5 text-black hover:text-gray-800"
                    onClick={() => { }}
                    aria-label="Search"
                  >
                    <Search className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </motion.div>

            {/* Search Box - shown on medium screens and up with expand-on-focus animation */}
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && (
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
            )}

            {/* Desktop Navigation - shown only on large (lg) and up */}
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && (
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
                        className={`text-[15px] font-bold flex items-center ${isActive(link.path)
                          ? 'text-black'
                          : 'text-black/50 hover:text-black/90 transition-colors'
                          }`}
                      >
                        {link.name}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={`text-[15px] font-bold ${activeDropdown === link.name
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
                            className={`block px-4 py-2 text-sm font-bold ${isActive(item.path)
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
            )}
          </div>

          {/* Right Section: Auth Buttons */}
          <div className="flex items-center space-x-4">
            {/* New Chat Button - Only shown on chat pages */}
            {isAIChatPage && (
              <motion.div
                whileHover={location.pathname !== '/ai-chat' && location.pathname !== '/ai-chat/' ? { scale: 1.03 } : {}}
                whileTap={location.pathname !== '/ai-chat' && location.pathname !== '/ai-chat/' ? { scale: 0.98 } : {}}
              >
                {location.pathname === '/ai-chat' || location.pathname === '/ai-chat/' ? (
                  <div className="text-gray-400 text-sm font-medium flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-default">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>New Chat</span>
                  </div>
                ) : (
                  <Link
                    to="/ai-chat"
                    className="text-black hover:text-gray-800 text-sm font-medium flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>New Chat</span>
                  </Link>
                )}
              </motion.div>
            )}

            {/* Generate with AI Button - Medium - shown only on lg (1024px) and up */}
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden lg:block xl:hidden"
              >
                <Link
                  to="/ai-chat"
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
                    <span className="hidden sm:inline">Generate with AI</span>
                    <span className="sm:hidden">Generate</span>
                  </span>
                  <div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)'
                    }}
                  />
                </Link>
              </motion.div>
            )}

            {/* Generate with AI Button - Desktop - shown only on xl (1240px) and up */}
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden xl:block"
              >
                <Link
                  to="/ai-chat"
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
                    <span className="hidden sm:inline">Generate with AI</span>
                    <span className="sm:hidden">Generate</span>
                  </span>
                  <div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)'
                    }}
                  />
                </Link>
              </motion.div>
            )}

            {/* User Avatar or Sign In button - hidden on chat pages */}
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && (
              <div className="hidden xl:flex items-center">
                {user ? (
                  <UserAvatar user={user} />
                ) : (
                  <Link
                    to="/login"
                    className="bg-black text-white px-4 py-2 rounded-full text-[15px] font-bold hover:bg-gray-800 transition-colors whitespace-nowrap"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            )}
            {/* Generate with AI Button - Mobile/Tablet */}
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="lg:hidden mr-2"
              >
                <Link
                  to="/ai-chat"
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
                    <span className="hidden sm:inline">Generate with AI</span>
                    <span className="sm:hidden">Generate</span>
                  </span>
                </Link>
              </motion.div>
            )}

            {/* Mobile menu button - hidden on chat pages */}
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && (
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
            )}
          </div>
        </motion.div>
      </div>

      {/* Mobile Menu */}
      {!isCompleteProfilePage && !isOtpPage && (
        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
