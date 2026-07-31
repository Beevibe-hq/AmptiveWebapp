import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import TextLogo from './TextLogo';
import MobileMenu from './MobileMenu';
import UserAvatar from './UserAvatar';
import SearchOverlay from './SearchOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { isProfileComplete } from '@/lib/api/profiles';

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

const Navbar = ({ hideMenu = false }: { hideMenu?: boolean }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const location = useLocation();
  const checkedProfileRef = useRef(false);
  const { user: authUser, loading, refreshUser, logout } = useAuth();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Handle user and profile fetching side-effects in response to session changes
  // completely outside of the onAuthStateChange synchronous callback to prevent deadlocks.
  useEffect(() => {
    const handleIncompleteProfile = async () => {
      if (loading || checkingProfile || checkedProfileRef.current) return;
      if (!authUser) return;
      checkedProfileRef.current = true;
      setCheckingProfile(true);
      try {
        if (!isProfileComplete(authUser)) {
          navigate('/complete-profile');
        }
      } finally {
        setCheckingProfile(false);
      }
    };
    void handleIncompleteProfile();
  }, [authUser, loading, refreshUser]);

  const isProfilePage = location.pathname === '/profile' || location.pathname === '/profile/';
  const isBlogPage = location.pathname === '/blog' || location.pathname === '/blog/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle overlay on Cmd+K or Ctrl+K
      if (
        (e.metaKey && e.key.toLowerCase() === 'k') ||
        (e.ctrlKey && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        setIsSearchOverlayOpen((prev) => !prev);
      }

      // '/' key (when not typing in inputs/textareas)
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setIsSearchOverlayOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!activeDropdown) return;

    const closeDropdown = () => setActiveDropdown(null);
    window.addEventListener('click', closeDropdown);
    return () => window.removeEventListener('click', closeDropdown);
  }, [activeDropdown]);

  // Removed auto-redirect on route change; incomplete sessions are signed out silently instead.

  // Navigation links for authenticated users
  const hasEnabledTips = authUser?.support_enabled === true || (authUser as any)?.accept_tips === true;
  const shouldShowAcceptTips = !hasEnabledTips;

  const authLinks: NavLink[] = [
    ...(shouldShowAcceptTips ? [{ name: 'Accept Gifts', path: '/profile/support-setup' } as MenuItem] : []),
    { name: 'Create Event', path: '/events/create' },
    { name: 'Explore', path: '/explore' },
    {
      name: 'More',
      hasDropdown: true,
      dropdownItems: [
        { name: 'Store', path: '/store' },
        { name: 'Community Task', path: '/community' },
        { name: 'Help Center', path: '/help' }
      ]
    }
  ];

  // Navigation links for unauthenticated users (original)
  const guestLinks: NavLink[] = [
    { name: 'Accept Gifts', path: '/profile/support-setup' },
    { name: 'Explore', path: '/explore' },
    { name: 'Create Event', path: '/login?redirect=/events/create' },
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

  const links = authUser ? authLinks : guestLinks;

  // Search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsMobileMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setActiveDropdown(null);
    navigate('/');
  };

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const isAIChatPage = location.pathname === '/ai-chat' || location.pathname === '/ai-chat/' || location.pathname === '/chat-mode' || location.pathname === '/chat-mode/';
  const isChatModePage = location.pathname === '/chat-mode' || location.pathname === '/chat-mode/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/login/' || location.pathname === '/signup' || location.pathname === '/signup/';
  const isCompleteProfilePage = location.pathname === '/complete-profile' || location.pathname === '/complete-profile/';
  const isOtpPage = location.pathname === '/verify-otp' || location.pathname === '/verify-otp/';
  const isSupportPage = location.pathname.startsWith('/support/');

  const isExplorePage = location.pathname === '/explore' || location.pathname === '/explore/';

  return (
    <nav
      className={`fixed top-0 w-full z-50 ${isCompleteProfilePage
        ? 'bg-transparent backdrop-blur-0 shadow-none border-none'
        : isChatModePage
          ? 'bg-white lg:bg-transparent lg:backdrop-blur-0 lg:shadow-none lg:border-none'
          : isAIChatPage
            ? 'bg-transparent backdrop-blur-0 shadow-none border-none'
            : isExplorePage
              ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/80'
              : isScrolled || isBlogPage
                ? 'bg-white backdrop-blur-md shadow-sm border-b border-gray-100'
                : (isProfilePage ? 'bg-transparent' : 'bg-transparent')
        } transition-colors duration-300`}
      style={{
        backgroundColor: isExplorePage
          ? 'rgba(255, 255, 255, 0.95)'
          : (!isCompleteProfilePage && !isChatModePage && !isAIChatPage && !isProfilePage && (isScrolled || isBlogPage)
            ? 'rgba(255, 255, 255, 0.95)'
            : undefined)
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
                <Logo variant={isSupportPage && !isScrolled ? 'white' : 'black'} />
                <TextLogo variant={isSupportPage && !isScrolled ? 'white' : 'black'} />
              </Link>

              {/* Search Icon - Only shown on mobile when search box is hidden */}
              {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && !isSupportPage && (
                <div className="sm:hidden">
                  <button
                    className="p-1.5 text-black hover:text-gray-800 animate-pulse-subtle"
                    onClick={() => setIsSearchOverlayOpen(true)}
                    aria-label="Search"
                  >
                    <Search className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </motion.div>

            {/* Search Box Trigger - shown on medium screens and up */}
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && !isSupportPage && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => setIsSearchOverlayOpen(true)}
                className="relative hidden sm:flex items-center text-left bg-gray-100/80 hover:bg-gray-200/50 border border-transparent hover:border-gray-200/80 rounded-full px-3.5 py-2 text-sm text-gray-500 w-[180px] transition-all duration-200 cursor-pointer select-none"
              >
                <Search className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                <span className="truncate flex-1 text-gray-400 font-medium">Search...</span>
              </motion.button>
            )}

            {/* Desktop Navigation - shown only on large (lg) and up */}
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && !isSupportPage && (
              <div className="hidden lg:flex items-center space-x-8">
                {links.map((link) => (
                  <div
                    key={link.name}
                    className="relative"
                  >
                    {'path' in link && link.path ? (
                      <Link
                        to={link.path}
                        className={`text-[15px] font-semibold flex items-center ${isActive(link.path)
                          ? 'text-black'
                          : 'text-black/50 hover:text-black/90 transition-colors'
                          }`}
                      >
                        {link.name}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveDropdown(activeDropdown === link.name ? null : link.name);
                        }}
                        className={`text-[15px] font-semibold ${activeDropdown === link.name
                          ? 'text-black'
                          : 'text-black/50 hover:text-black/90 transition-colors'
                          }`}
                      >
                        {link.name}
                      </button>
                    )}

                    <AnimatePresence>
                      {'hasDropdown' in link && activeDropdown === link.name && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 360, damping: 26, mass: 0.7 }}
                          className="absolute left-0 top-full pt-3 w-[190px] z-50 origin-top-left"
                          style={{ originX: 0, originY: 0 }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="rounded-[18px] border border-black/10 bg-white p-2 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                            {link.dropdownItems.map((item) => (
                              <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center rounded-[12px] px-3 py-2.5 text-[14px] font-semibold transition-colors ${isActive(item.path)
                                  ? 'bg-black/[0.04] text-gray-950'
                                  : 'text-gray-700 hover:bg-black/[0.03] hover:text-gray-950'
                                  }`}
                                onClick={() => setActiveDropdown(null)}
                              >
                                <span className="flex-1">{item.name}</span>
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Section: Auth Buttons */}
          <div className="flex items-center space-x-4">
            {/* Back to Profile Button - Only shown on support page */}
            {isSupportPage && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Link
                  to="/profile"
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${
                    isScrolled 
                      ? 'bg-black text-white hover:bg-gray-800' 
                      : 'bg-white/20 text-white backdrop-blur-md border border-white/30 hover:bg-white/40'
                  }`}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Profile</span>
                </Link>
              </motion.div>
            )}

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
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && !isSupportPage && (
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
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isSupportPage && (
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

            {/* User Avatar or Sign In button - hidden on chat pages and support page */}
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && !loading && !checkingProfile && !isSupportPage && (
              <div className="hidden xl:flex items-center">
                {authUser ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDropdown(activeDropdown === 'avatar' ? null : 'avatar');
                      }}
                      className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-black/80 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                      aria-label="Account menu"
                    >
                      {authUser?.avatar_url ? (
                        <img
                          src={authUser.avatar_url}
                          alt={authUser?.name || authUser?.email || 'Profile'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-black text-sm font-semibold uppercase text-white">
                          {(authUser?.name || authUser?.email || 'A').charAt(0)}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {activeDropdown === 'avatar' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 360, damping: 26, mass: 0.7 }}
                          className="absolute right-0 top-full pt-3 w-[286px] z-50 origin-top-right"
                          style={{ originX: 1, originY: 0 }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="rounded-[18px] border border-black/10 bg-white p-2 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                            <Link
                              to="/profile"
                              className="flex items-center gap-3 rounded-[14px] px-3 py-3 transition-colors hover:bg-black/[0.03]"
                              onClick={() => setActiveDropdown(null)}
                            >
                              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100">
                                {authUser?.avatar_url ? (
                                  <img
                                    src={authUser.avatar_url}
                                    alt={authUser?.name || authUser?.email || 'Profile'}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-black text-xs font-bold uppercase text-white">
                                    {(authUser?.name || authUser?.email || 'A').charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[16px] font-semibold leading-tight text-gray-950">
                                  {authUser?.name || authUser?.username || authUser?.email?.split('@')[0] || 'Your profile'}
                                </div>
                                <div className="mt-1 truncate text-[13px] font-medium leading-tight text-gray-500">
                                  {authUser?.email}
                                </div>
                              </div>
                            </Link>
                            <div className="my-2 h-px bg-black/10" />
                            {[
                              { name: 'My Dashboard', path: '/dashboard' },
                              { name: 'View Profile', path: '/profile' },
                              { name: 'My Tickets', path: '/my-tickets' },
                              { name: 'Settings', path: '/settings' }
                            ].map((item) => (
                              <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center rounded-[12px] px-3 py-2.5 text-[14px] font-semibold transition-colors ${isActive(item.path)
                                  ? 'bg-black/[0.04] text-gray-950'
                                  : 'text-gray-700 hover:bg-black/[0.03] hover:text-gray-950'
                                  }`}
                                onClick={() => setActiveDropdown(null)}
                              >
                                <span className="flex-1">{item.name}</span>
                              </Link>
                            ))}
                            <div className="my-2 h-px bg-black/10" />
                            <button
                              type="button"
                              onClick={handleSignOut}
                              className="flex w-full items-center rounded-[12px] px-3 py-2.5 text-left text-[14px] font-semibold text-gray-700 transition-colors hover:bg-black/[0.03] hover:text-gray-950"
                            >
                              <span className="flex-1">Sign Out</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && !isSupportPage && (
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
            {!isAIChatPage && !isAuthPage && !isCompleteProfilePage && !isOtpPage && !hideMenu && (
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
          onOpenSearch={() => {
            setIsMobileMenuOpen(false);
            setIsSearchOverlayOpen(true);
          }}
        />
      )}

      {/* Spotlight Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOverlayOpen}
        onClose={() => setIsSearchOverlayOpen(false)}
      />
    </nav>
  );
};

export default Navbar;
