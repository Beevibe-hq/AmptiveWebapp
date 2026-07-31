import React, { useState, useEffect, useRef } from 'react';
import './ShazamHeroCarousel.css';

interface VideoCardData {
  id: string;
  title: string;
  creator: string;
  views: string;
  videoSrc: string;
  posterBg: string;
  badge?: string;
  link: string;
}

const VIDEO_CARDS: VideoCardData[] = [
  {
    id: 'video-0',
    title: 'Amptive Live Session',
    creator: 'DJ Consequence & Friends',
    views: '124,580 views',
    videoSrc: '/videos/amptivevid5.mp4',
    posterBg: '#0f172a',
    badge: 'LIVE STREAM',
    link: '/events/1'
  },
  {
    id: 'video-1',
    title: 'From Ticket to Tip$',
    creator: 'Tems & Amptive Creators',
    views: '89,240 views',
    videoSrc: '/videos/accepttips_encode4.mp4',
    posterBg: '#312e81',
    badge: 'FEATURED',
    link: '/events/2'
  },
  {
    id: 'video-2',
    title: 'Karaoke Traffic Vibes',
    creator: 'Chillspot Yaba, Lagos',
    views: '210,890 views',
    videoSrc: '/videos/tipping1.mp4',
    posterBg: '#4c1d95',
    badge: 'TRENDING',
    link: '/events/3'
  },
  {
    id: 'video-3',
    title: 'Amptive Experience',
    creator: 'Amptive Official',
    views: '345,120 views',
    videoSrc: '/videos/amptivead.mp4',
    posterBg: '#701a75',
    badge: 'OFFICIAL AD',
    link: '/events/4'
  },
  {
    id: 'video-4',
    title: 'Club & DJ Festival',
    creator: 'Spinall & MADhouse',
    views: '67,430 views',
    videoSrc: 'https://assets.mixkit.co/videos/preview/mixkit-dj-playing-music-at-a-club-41384-large.mp4',
    posterBg: '#831843',
    badge: 'HOT SHOW',
    link: '/events/5'
  },
  {
    id: 'video-5',
    title: 'Concert & Nightlife',
    creator: 'Freedom Park Lagos',
    views: '152,040 views',
    videoSrc: 'https://assets.mixkit.co/videos/preview/mixkit-people-dancing-at-a-concert-43339-large.mp4',
    posterBg: '#1e1b4b',
    badge: 'POPULAR',
    link: '/events/6'
  },
  {
    id: 'video-6',
    title: 'Creator Spotlight Tour',
    creator: 'Ayo Maff & Burna Boy',
    views: '500,910 views',
    videoSrc: '/videos/1v1ce11.mp4',
    posterBg: '#202122',
    badge: 'VIRAL',
    link: '/events/7'
  }
];

export default function Shazam3DCarousel() {
  const [rotation, setRotation] = useState(-5.385587406153924);
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({
    'video-0': true,
    'video-1': true,
    'video-2': true,
    'video-3': true,
    'video-4': true,
    'video-5': true,
    'video-6': true
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Auto-rotate 3D cylinder
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => prev - (Math.PI * 2) / 7);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const toggleMute = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    const vid = videoRefs.current[cardId];
    if (vid) {
      vid.muted = !vid.muted;
      setMutedStates((prev) => ({ ...prev, [cardId]: vid.muted }));
      if (vid.paused) vid.play().catch(() => {});
    }
  };

  const handleShareClick = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    setCopiedId(cardId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-[95vw] mx-auto mb-10 overflow-hidden sm:mb-12">
      {/* SVG Definitions */}
      <svg style={{ display: 'none' }}>
        <symbol id="ControlPlay" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </symbol>

        <symbol id="ControlPause" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor" />
        </symbol>

        <symbol id="VolumeUp" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor" />
        </symbol>

        <symbol id="VolumeMute" viewBox="0 0 24 24">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor" />
        </symbol>

        <symbol id="ShazamLogo" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" fill="currentColor" />
        </symbol>

        <symbol id="ShareArrowUpBold" viewBox="0 0 24 24">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor" />
        </symbol>
      </svg>

      <div className="HeroCarousel_heroGrid__04lDA">
        <div className="HeroCarousel_leftColumn__eK_Vg">
          <p 
            className="Text-module_text-white__l-SDK Text-module_fontFamily__cQFwR HeroCarousel_eyebrow__HRMpJ Text-post-module_size-base__o144k Text-module_fontWeightNormal__kB6Wg"
            style={{ textShadow: 'none', filter: 'none' }}
          >
            Updated weekly
          </p>
          <h1 
            className="Text-module_text-white__l-SDK Text-module_fontFamily__cQFwR HeroCarousel_headline__WCuzZ Text-post-module_size-base__o144k Text-module_fontWeightNormal__kB6Wg Text-module_headingReset__Mn-tB"
            style={{ textShadow: 'none', filter: 'none' }}
          >
            What people are booking on Amptive right now
          </h1>
        </div>

        <div className="HeroCarousel_carouselStage__pUJiG" role="group" aria-roledescription="carousel" aria-label="Music discovery video carousel" tabIndex={0}>
          <div className="InsightsCarousel_scene__0fs4j">
            <div className="InsightsCarousel_cylinder__qxFWI" style={{ transform: `translate3d(-50%, calc(-50% + var(--vertical-offset, 0px)), 0) rotateY(${rotation}rad)` }}>
              
              {VIDEO_CARDS.map((card, index) => {
                const cardAngle = (index * (Math.PI * 2)) / VIDEO_CARDS.length;
                const isMuted = mutedStates[card.id] ?? true;

                return (
                  <div
                    key={card.id}
                    className="InsightsSceneCards_slot__LLv2j"
                    data-index={index}
                    data-active={index === 0}
                    data-settled="true"
                    aria-hidden="false"
                    style={{
                      '--card-angle': cardAngle.toFixed(6),
                      opacity: 1,
                      visibility: 'visible'
                    } as React.CSSProperties}
                  >
                    <div className="InsightsSceneCard_card__r7KfG" style={{ background: card.posterBg }}>
                      <div className="InsightsSceneCard_impressionPin__pthxJ"></div>
                      <div className="InsightsSceneCard_impressionPin__pthxJ"></div>
                      <div className="InsightsSceneCard_cardBackground__7djcG" style={{ background: card.posterBg }} aria-hidden="true">
                        <div className="InsightsSceneCard_cardBlobLayer__W_A_z" style={{ background: `radial-gradient(ellipse 55% 55% at 40% 12%, ${card.posterBg} 0%, rgba(2,2,3,0.75) 50%, rgba(0,0,0,0.95) 100%)` }}></div>
                      </div>

                      <div className="InsightsSceneCard_cardInner__ZXEs5">
                        
                        {/* Video Container */}
                        <div className="InsightsSceneCard_cardImageWrap__nbq0N">
                          <div className="ImageDynamic-post-module_container__nme93 relative w-full h-full overflow-hidden rounded-xl bg-black">
                            
                            <video
                              ref={(el) => (videoRefs.current[card.id] = el)}
                              src={card.videoSrc}
                              autoPlay
                              loop
                              muted={isMuted}
                              playsInline
                              className="w-full h-full object-contain bg-black"
                            />

                            {/* Badge */}
                            {card.badge && (
                              <div className="absolute top-2.5 right-2.5 z-20 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white border border-white/20">
                                {card.badge}
                              </div>
                            )}

                            {/* Mute / Unmute Control Button */}
                            <button
                              type="button"
                              onClick={(e) => toggleMute(e, card.id)}
                              className="PlayButton_playButton__4DGnd"
                              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                            >
                              <span className="PlayButton_iconWrapper__4fR6R">
                                <svg className="svg" style={{ width: '12px', height: '12px', fill: 'currentColor' }} xmlns="http://www.w3.org/2000/svg">
                                  <use xlinkHref={isMuted ? '#VolumeMute' : '#VolumeUp'}></use>
                                </svg>
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Card Footer Info */}
                        <div className="InsightsSceneCard_cardFooter__AGjmj">
                          <div className="InsightsSceneCard_cardFooterRow__N3ri_">
                            <div className="InsightsSceneCard_cardTextStack__NO702">
                              <a className="InsightsSceneCard_stretchedLink__BWwBO InsightsSceneCards_gatedLink__QObRs" href={card.link}>
                                <p className="Text-module_text-white__l-SDK Text-module_fontFamily__cQFwR InsightsSceneCard_cardTitle__rjLGY Text-post-module_size-base__o144k Text-module_fontWeightNormal__kB6Wg">
                                  {card.title}
                                </p>
                              </a>
                              <p className="Text-module_text-white__l-SDK Text-module_fontFamily__cQFwR InsightsSceneCard_cardArtist__pZ13Q Text-post-module_size-base__o144k Text-module_fontWeightNormal__kB6Wg">
                                {card.creator}
                              </p>
                              
                              <div className="InsightsSceneCard_shazamCountContainer__ltJZm">
                                <div className="InsightsSceneCard_logoWrapper__fRYmg">
                                  <svg className="InsightsSceneCard_cardShazamLogo__YFrlY" style={{ width: '12px', height: '12px' }} xmlns="http://www.w3.org/2000/svg">
                                    <use xlinkHref="#ShazamLogo"></use>
                                  </svg>
                                </div>
                                <p className="Text-module_text-white__l-SDK Text-module_fontFamily__cQFwR InsightsSceneCard_cardShazamCount__RtmSr Text-post-module_size-base__o144k Text-module_fontWeightNormal__kB6Wg">
                                  {card.views}
                                </p>
                              </div>
                            </div>

                            {/* Share Button */}
                            <button
                              type="button"
                              onClick={(e) => handleShareClick(e, card.id)}
                              className="ShareButton_shareButton__55Uvc"
                              aria-label={`Share ${card.title}`}
                            >
                              <span className="ShareButton_iconWrapper__dmSrC">
                                <svg className="ShareButton_shareIcon__5sCSY ShareButton_iconLayer__vaMg5 ShareButton_shareArrow__bFQLF" style={{ width: '10px', height: '10px', fill: 'white' }} xmlns="http://www.w3.org/2000/svg">
                                  <use xlinkHref="#ShareArrowUpBold"></use>
                                </svg>
                              </span>
                              {copiedId === card.id && (
                                <span className="ShareButton_copiedTooltip__8yuFU">Link Copied</span>
                              )}
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
