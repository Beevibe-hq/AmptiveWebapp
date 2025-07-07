import React from 'react';

const TicketPattern = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
      <svg 
        className="w-full h-full opacity-10" 
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern 
            id="ticket-pattern" 
            width="30" 
            height="45" 
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(15)"
          >
            {/* Main ticket shape */}
            <path 
              d="M0,0 h30 v45 h-30 z" 
              fill="none" 
              stroke="#000" 
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Perforation marks */}
            <circle cx="0" cy="11" r="1.5" fill="#000" />
            <circle cx="0" cy="22.5" r="1.5" fill="#000" />
            <circle cx="0" cy="34" r="1.5" fill="#000" />
            <circle cx="30" cy="11" r="1.5" fill="#000" />
            <circle cx="30" cy="22.5" r="1.5" fill="#000" />
            <circle cx="30" cy="34" r="1.5" fill="#000" />
            
            {/* Decorative elements */}
            <path 
              d="M7,4 L23,4 M7,8 L23,8" 
              stroke="#000" 
              strokeWidth="0.8"
              strokeLinecap="round"
            />
            <path 
              d="M7,37 L23,37 M7,41 L23,41" 
              stroke="#000" 
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          </pattern>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#ticket-pattern)" />
      </svg>
    </div>
  );
};

export default TicketPattern;
