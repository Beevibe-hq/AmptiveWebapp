import React from 'react';
import { Link } from 'react-router-dom';

interface HeroSlideProps {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  videoSrc: string;
  shadowColor: string;
  className?: string;
}

export const HeroSlide: React.FC<HeroSlideProps> = ({
  title,
  description,
  ctaText,
  ctaLink,
  videoSrc,
  shadowColor,
  className = ''
}) => {
  return (
    <div className={`relative w-full min-h-[500px] py-16 md:py-24 lg:py-32 flex items-center justify-center overflow-hidden ${className}`}>
      {/* Background with image */}
      <div className="absolute inset-0 w-full h-full">
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: 'url("src/assets/OC 12.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat'
          }}
        ></div>
      </div>

      <div className="w-full max-w-[95vw] mx-auto relative z-10 h-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 h-full items-center">
          {/* Content Column */}
          <div className="w-full max-w-2xl mx-auto lg:mx-0 animate-slide-up flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 mb-6">
              {title}
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              {description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to={ctaLink}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-colors duration-200 inline-flex items-center"
              >
                {ctaText}
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Media Column */}
          <div className="w-full">
            <div className="relative w-full max-w-[650px] mx-auto">
              <div className="relative pt-[56.25%] rounded-2xl overflow-hidden shadow-2xl bg-gray-100">
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="absolute top-0 left-0 w-full h-full object-cover"
                  style={{ boxShadow: `0 0 40px ${shadowColor}` }}
                >
                  <source src={videoSrc} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSlide;
