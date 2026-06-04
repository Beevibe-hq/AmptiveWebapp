import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Compass,
  PlusSquare,
  Ticket,
  User,
  Settings,
  Users,
  HelpCircle,
  LogOut,
  ShoppingBag,
  LogIn,
  LayoutDashboard,
  Heart
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCurrentUser, signOut } from '@/lib/supabase/auth';
import { getProfileById } from '@/lib/supabase/profiles';
import UserAvatar from './UserAvatar';

type BaseLink = {
  name: string;
  path: string;
  icon?: React.ReactNode;
};

type MenuLink = BaseLink & {
  onClick?: () => void;
};

type DropdownLink = BaseLink & {
  hasDropdown: true;
  dropdownItems: MenuLink[];
};

type LinkItem = MenuLink | DropdownLink;

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSupportPage = location.pathname.startsWith('/support/');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        if (userData) {
          const profileData = await getProfileById(userData.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      getUser();
    }
  }, [isOpen]);

  // Track scroll position and handle body scroll
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Prevent body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      // Cleanup function to restore scroll position when menu closes
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Navigation links for authenticated users with icons
  const shouldShowAcceptTips = String(profile?.support_enabled).toLowerCase() !== 'true';

  const authLinks: LinkItem[] = [
    ...(shouldShowAcceptTips ? [{
      name: 'Accept Tip$',
      path: '/profile/support-setup',
      icon: <Heart className="w-5 h-5 mr-3" />
    } as MenuLink] : []),
    // First group (top items)
    {
      name: 'Explore',
      path: '/explore',
      icon: <Compass className="w-5 h-5 mr-3" />
    },
    {
      name: 'Create Event',
      path: '/login?redirect=/events/create',
      icon: <PlusSquare className="w-5 h-5 mr-3" />
    },

    // Divider after first 2 items
    { name: 'divider-small', path: '#' },

    // Second group (next 3 items)
    {
      name: 'My Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5 mr-3" />
    },
    {
      name: 'My Tickets',
      path: '/my-tickets',
      icon: <Ticket className="w-5 h-5 mr-3" />
    },
    {
      name: 'View Profile',
      path: '/profile',
      icon: <User className="w-5 h-5 mr-3" />
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: <Settings className="w-5 h-5 mr-3" />
    },

    // Divider item (hidden, only used for visual separation)
    { name: 'divider', path: '#' },

    // Second group (bottom 3 items)
    {
      name: 'Community Task',
      path: '/community',
      icon: <Users className="w-5 h-5 mr-3" />
    },
    {
      name: 'Help Center',
      path: '/help',
      icon: <HelpCircle className="w-5 h-5 mr-3" />
    },
    {
      name: 'Sign Out',
      path: '#',
      icon: <LogOut className="w-5 h-5 mr-3" />,
      onClick: async () => {
        await signOut();
        navigate('/');
        window.location.reload();
      }
    }
  ];

  // Navigation links for unauthenticated users with icons
  const guestLinks: LinkItem[] = [
    {
      name: 'Accept Tip$',
      path: '/profile/support-setup',
      icon: <Heart className="w-5 h-5 mr-3" />
    },
    {
      name: 'Explore',
      path: '/explore',
      icon: <Compass className="w-5 h-5 mr-3" />
    },
    {
      name: 'Create Event',
      path: '/events',
      icon: <PlusSquare className="w-5 h-5 mr-3" />
    },
    {
      name: 'Store',
      path: '/store',
      icon: <ShoppingBag className="w-5 h-5 mr-3" />
    },
    {
      name: 'Community Task',
      path: '/community',
      icon: <Users className="w-5 h-5 mr-3" />
    },
    {
      name: 'Help Center',
      path: '/help',
      icon: <HelpCircle className="w-5 h-5 mr-3" />
    },
    {
      name: 'Sign In',
      path: '/login',
      icon: <LogIn className="w-5 h-5 mr-3" />
    }
  ];

  const baseLinks = user ? authLinks : guestLinks;
  const links = isSupportPage 
    ? baseLinks.filter(l => !['My Dashboard', 'Explore', 'Create Event', 'My Tickets', 'Store', 'Community Task', 'More'].includes(l.name))
    : baseLinks;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="fixed inset-0 z-40 h-screen w-full"
              onClick={onClose}
              style={{
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                position: 'fixed',
                overflow: 'hidden',
                touchAction: 'none'
              }}
            >
              {/* White overlay */}
              <div className="absolute inset-0 bg-white/80" />
              {/* Blur layer */}
              <div className="absolute inset-0 backdrop-blur-lg" />
            </div>
          </motion.div>

          {/* Menu Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 right-0 h-full w-full md:w-[380px] md:h-[95vh] bg-white z-50 flex flex-col overflow-y-auto md:rounded-2xl md:mt-[2.5vh] md:mr-4 md:drop-shadow-[-4px_0_15px_rgba(0,0,0,0.1)]"
          >
            {/* Header with Search */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              {!isSupportPage && (
                <form onSubmit={handleSearch} className="relative flex-1 mr-2">
                  <input
                    type="text"
                    className="w-full px-4 py-2 pl-10 text-sm text-gray-700 bg-gray-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent"
                    placeholder="Search for events, tasks, and more..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-search absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </form>
              )}
              {isSupportPage && <div className="flex-1" />}
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto pr-4">
              {links.map((link, index) => {
                if (link.name === 'divider') {
                  return <div key="divider" className="h-6"></div>; // Larger space between main groups
                }
                if (link.name === 'divider-small') {
                  return <div key="divider-small" className="h-4"></div>; // Smaller space between first two and next three items
                }

                // Regular link with icon
                if (!('hasDropdown' in link)) {
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      className="flex items-center w-full text-left px-6 py-3 text-2xl font-semibold text-gray-900 hover:bg-gray-50 cursor-pointer leading-8"
                      onClick={() => onClose()}
                    >
                      {link.icon}
                      {link.name}
                    </Link>
                  );
                }

                // Sign out button with onClick
                if (link.onClick) {
                  return (
                    <div
                      key={link.name}
                      onClick={(e) => {
                        e.preventDefault();
                        link.onClick?.();
                        onClose();
                      }}
                      className="flex items-center w-full text-left px-6 py-3 text-2xl font-semibold text-gray-900 hover:bg-gray-50 cursor-pointer leading-8"
                    >
                      {link.icon}
                      {link.name}
                    </div>
                  );
                }
                if ('hasDropdown' in link) {
                  return (
                    <div key={link.name}>
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}
                          className="w-full flex items-center justify-between px-6 py-1.5 text-2xl font-semibold hover:bg-gray-50 leading-8"
                          style={{ color: 'rgb(22, 22, 26)' }}
                        >
                          <span>{link.name}</span>
                          <svg
                            className={`w-4 h-4 transition-transform ${activeDropdown === link.name ? 'transform rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {activeDropdown === link.name && (
                          <div className="pl-8 bg-gray-50">
                            {link.dropdownItems.map((item) => (
                              <Link
                                key={item.name}
                                to={item.path}
                                className="flex items-center px-6 py-3 text-sm text-gray-600 hover:bg-gray-100"
                                onClick={onClose}
                              >
                                {item.icon || <span className="w-5 h-5 mr-3"></span>}
                                {item.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={link.name}>
                    <Link
                      to={link.path}
                      className="block px-6 py-1.5 text-2xl font-semibold hover:bg-gray-50 leading-8"
                      style={{ color: 'rgb(22, 22, 26)' }}
                      onClick={onClose}
                    >
                      {link.name}
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Auth Buttons */}
            <div className="p-4 pr-6 space-y-3">
              {!loading && user && (
                <div className="flex justify-center py-2">
                  <UserAvatar user={user} />
                </div>
              )}
              {!loading && !user && (
                <>
                  <Link
                    to="/login"
                    className="block w-full px-4 py-2.5 text-center text-base font-medium hover:bg-gray-50 rounded-full border border-gray-200"
                    style={{ color: 'rgb(22, 22, 26)' }}
                    onClick={onClose}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/download"
                    className="block w-full px-4 py-2.5 text-center text-base font-bold text-white bg-black hover:bg-gray-800 rounded-full"
                    onClick={onClose}
                  >
                    Download App
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
