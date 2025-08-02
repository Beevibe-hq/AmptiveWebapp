import { Link } from 'react-router-dom';
import { Apple, Play } from 'lucide-react';


const Footer = () => {
  return (
    <footer className="bg-white w-full">
      <div className="w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 lg:pt-16 lg:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8">
          {/* Brand - Only logo */}
          <div className="flex items-start lg:col-span-4 min-h-0 lg:min-h-[240px] pb-6 md:pb-0">
            <div className="flex items-center">
              <img 
                src="/src/assets/amptive_logotype.svg" 
                alt="Amptive Logo" 
                className="h-16 w-auto invert-[100%]"
              />
            </div>
          </div>

          {/* Platform - Medium width column */}
          <div className="lg:col-span-3 min-h-0 lg:min-h-[240px] pb-6 md:pb-0">
            <h3 className="text-[22px] font-semibold mb-4 text-gray-900">Platform</h3>
            <ul className="space-y-3">
              <li><Link to="/events" className="text-[15px] text-gray-600/80 hover:text-gray-900 transition-colors font-medium">Browse Events</Link></li>
              <li><Link to="/community" className="text-[15px] text-gray-600/80 hover:text-gray-900 transition-colors font-medium">Community Tasks</Link></li>
              <li><Link to="/ai-tool" className="text-[15px] text-gray-600/80 hover:text-gray-900 transition-colors font-medium">Generate with AI</Link></li>
            </ul>
          </div>

          {/* Resources - Medium width column */}
          <div className="lg:col-span-3 min-h-0 lg:min-h-[240px] pb-6 md:pb-0">
            <h3 className="text-[22px] font-semibold mb-4 text-gray-900">Resources</h3>
            <ul className="space-y-3">
              <li><Link to="/help" className="text-[15px] text-gray-600/80 hover:text-gray-900 transition-colors font-medium">Help Center</Link></li>
              <li><Link to="/help#faq" className="text-[15px] text-gray-600/80 hover:text-gray-900 transition-colors font-medium">FAQs</Link></li>
              <li><a href="#" className="text-[15px] text-gray-600/80 hover:text-gray-900 transition-colors font-medium">Community Guidelines</a></li>
              <li><a href="#" className="text-[15px] text-gray-600/80 hover:text-gray-900 transition-colors font-medium">Contact Us</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-2 min-h-0 lg:min-h-[240px]">
            <h3 className="text-[22px] font-semibold mb-4 text-gray-900">Legal</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-[15px] text-gray-600/80 hover:text-gray-900 transition-colors font-medium">Privacy Policy</a></li>
              <li><a href="#" className="text-[15px] text-gray-600/80 hover:text-gray-900 transition-colors font-medium">Terms of Service</a></li>
              <li><a href="#" className="text-[15px] text-gray-600/80 hover:text-gray-900 transition-colors font-medium">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-6 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-[13px]">
            © 2025 Amptive. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-3 md:mt-0">
            <a href="https://apps.apple.com" className="text-gray-600 hover:text-gray-900 transition-colors" aria-label="App Store">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 330 330" fill="currentColor">
                <path d="M68 290.485c-5.5 9.6-17.8 12.8-27.3 7.3-9.6-5.5-12.8-17.8-7.3-27.3l14.3-24.7q24.15-7.35 39.6 11.4zm138.9-53.9H25c-11 0-20-9-20-20s9-20 20-20h51l65.4-113.2-20.5-35.4c-5.5-9.6-2.2-21.8 7.3-27.3 9.6-5.5 21.8-2.2 27.3 7.3l8.9 15.4 8.9-15.4c5.5-9.6 17.8-12.8 27.3-7.3 9.6 5.5 12.8 17.8 7.3 27.3l-85.8 148.6h62.1c20.2 0 31.5 23.7 22.7 40m98.1 0h-29l19.6 33.9c5.5 9.6 2.2 21.8-7.3 27.3-9.6 5.5-21.8 2.2-27.3-7.3-32.9-56.9-57.5-99.7-74-128.1-16.7-29-4.8-58 7.1-67.8 13.1 22.7 32.7 56.7 58.9 102h52c11 0 20 9 20 20 0 11.1-9 20-20 20"></path>
              </svg>
            </a>
            <a href="https://play.google.com" className="text-gray-600 hover:text-gray-900 transition-colors" aria-label="Google Play Store">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 40 40" fill="currentColor" className="transform scale-125">
                <path d="M10.09,8a1.94,1.94,0,0,1,1.28.28l13,7.39L21.08,19Zm-1,1A2.31,2.31,0,0,0,9,9.67V30.33a2.31,2.31,0,0,0,.09.67l11-11Zm12,12-11,11a1.88,1.88,0,0,0,1.28-.28l13-7.39Zm8.52-2.34-3.94-2.24L22.07,20l3.59,3.59,3.94-2.24C30.9,20.61,30.9,19.39,29.6,18.65Z"/>
              </svg>
            </a>
            <a href="https://x.com/amptive" className="text-gray-600 hover:text-gray-900 transition-colors" aria-label="X (Twitter)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 120 120" fill="currentColor">
                <path d="m108.783 107.652-38.24-55.748.066.053L105.087 12H93.565L65.478 44.522 43.174 12H12.957l35.7 52.048-.005-.005L11 107.653h11.522L53.748 71.47l24.817 36.182zM38.609 20.696l53.652 78.26h-9.13l-53.696-78.26z"></path>
              </svg>
            </a>
            <a href="https://instagram.com/amptive" className="text-gray-600 hover:text-gray-900 transition-colors" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <g fillRule="evenodd">
                  <path d="M13.38 3.8a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0"></path>
                  <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m0-1.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8"></path>
                  <path d="M0 7.68c0-2.688 0-4.032.523-5.06A4.8 4.8 0 0 1 2.621.524C3.648 0 4.99 0 7.68 0h.64c2.688 0 4.032 0 5.06.523a4.8 4.8 0 0 1 2.097 2.098C16 3.648 16 4.99 16 7.68v.64c0 2.688 0 4.032-.523 5.06a4.8 4.8 0 0 1-2.098 2.097C12.352 16 11.01 16 8.32 16h-.64c-2.688 0-4.032 0-5.06-.523a4.8 4.8 0 0 1-2.097-2.098C0 12.352 0 11.01 0 8.32zM7.68 1.6h.64c1.37 0 2.302.001 3.022.06.702.057 1.06.161 1.31.289a3.2 3.2 0 0 1 1.4 1.398c.127.25.23.61.288 1.31.059.72.06 1.652.06 3.023v.64c0 1.37-.001 2.302-.06 3.022-.057.702-.161 1.06-.289 1.31a3.2 3.2 0 0 1-1.398 1.4c-.25.127-.61.23-1.31.288-.72.059-1.652.06-3.023.06h-.64c-1.37 0-2.302-.001-3.022-.06-.702-.057-1.06-.161-1.31-.289a3.2 3.2 0 0 1-1.4-1.398c-.127-.25-.23-.61-.288-1.31-.059-.72-.06-1.652-.06-3.023v-.64c0-1.37.001-2.302.06-3.022.057-.702.161-1.06.289-1.31a3.2 3.2 0 0 1 1.398-1.4c.25-.127.61-.23 1.31-.288.72-.059 1.652-.06 3.023-.06"></path>
                </g>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;