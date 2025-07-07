import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

type MenuLink = {
  name: string;
  path: string;
};

type DropdownLink = {
  name: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

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

  const links: LinkItem[] = [
    { name: 'Events', path: '/events' },
    { name: 'Explore', path: '/explore' },
    { name: 'Store', path: '/store' },
    { name: 'Community Task', path: '/community' },
    { name: 'Help Center', path: '/help' }
  ];

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
              {links.map((link) => {
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
                                className="block px-6 py-3 text-sm text-gray-600 hover:bg-gray-100"
                                onClick={onClose}
                              >
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
              <Link
                to="/signin"
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
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
