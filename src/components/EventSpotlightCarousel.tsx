import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Play, Pause } from 'lucide-react';
import AmbientGradientBand from './AmbientGradientBand';
import './EventSpotlightCarousel.css';

export interface SpotlightEvent {
  id: number | string;
  title: string;
  location?: string;
  date?: string;
  media?: { src?: string; alt?: string } | null;
  price?: number | Array<{ price: number }>;
  hasEarlyBirdOnSale?: boolean;
  isAlmostSoldOut?: boolean;
}

interface EventSpotlightCarouselProps {
  events: SpotlightEvent[];
  loading?: boolean;
}

/** How many cards sit on the cylinder. More than this and the arc gets too crowded to read. */
const MAX_CARDS = 3;
/** Distance from the cylinder's axis to each card, in px. Tuned against the CSS perspective. */
/**
 * Cylinder radius. Paired with the stage's `perspective`, which is ~5.86x this — that
 * ratio is what sets how hard the side cards recede, and both numbers have to move
 * together or the arc flattens out.
 */
const RADIUS = 295;
const MOBILE_RADIUS = 242;
/**
 * Angle between neighbouring cards, chosen so each one foreshortens to ~41% of the front
 * card's width — the same proportion as the reference. Past ~60° they collapse to thin
 * slivers; below ~45° they crowd the front card instead of leaving air around it.
 */
const ANGLE_STEP = (53 * Math.PI) / 180;
/**
 * Extra shrink per step away from the front. Perspective alone barely changes a side
 * card's height, because rotating it swings its near edge towards the viewer by almost as
 * much as its centre recedes. This supplies the "smaller as it goes back" read.
 */
const SIDE_SCALE_STEP = 0.08;
/** Cards this many places from the front have rotated behind the axis, so they drop out. */
const VISIBLE_SPAN = 2;
const AUTO_ADVANCE_MS = 9000;

const formatPrice = (price: SpotlightEvent['price']): string => {
  if (Array.isArray(price) && price.length > 0) {
    const lowest = Math.min(...price.map(tier => tier.price));
    if (lowest <= 0) return 'Free';
    return price.length === 1 ? `₦${lowest.toLocaleString()}` : `From ₦${lowest.toLocaleString()}`;
  }
  const numeric = Number(price);
  return Number.isFinite(numeric) && numeric > 0 ? `₦${numeric.toLocaleString()}` : 'Free';
};

/** The caption above each card — tailored per card index or event status. */
const kickerFor = (event: SpotlightEvent, cardIndex: number): { title: string; sub: string } => {
  if (cardIndex === 0) return { title: 'Create & Sell Tickets', sub: 'Launch your event in seconds' };
  if (cardIndex === 1) return { title: 'Tipping & Gifting', sub: 'Get tips & support from fans' };
  if (cardIndex === 2) return { title: 'Live Audio Spaces', sub: 'Host live audio shows & events' };
  if (event.isAlmostSoldOut) return { title: 'Almost Sold Out', sub: 'Only a few tickets left' };
  if (event.hasEarlyBirdOnSale) return { title: 'Early Bird Open', sub: 'Discounted while it lasts' };
  if (formatPrice(event.price) === 'Free') return { title: 'Free to Attend', sub: 'No ticket needed' };
  return { title: 'Trending Now', sub: 'Booking fast on Amptive' };
};

/** Dynamic headline, eyebrow, and button CTA per active card. */
const DYNAMIC_COPY: Record<number, { eyebrow: string; headline: string; ctaText: string; ctaPath: string }> = {
  0: {
    eyebrow: 'Event Ticketing',
    headline: 'Create ticketed events & sell out in minutes',
    ctaText: 'Create an Event',
    ctaPath: '/events/create',
  },
  1: {
    eyebrow: 'Creator Support',
    headline: 'Receive instant tips & gifts from your biggest fans',
    ctaText: 'Accept Gifts',
    ctaPath: '/profile/support-setup',
  },
  2: {
    eyebrow: 'Live Audio Spaces',
    headline: 'Host live audio shows & events with your audience',
    ctaText: 'Explore Live Audio',
    ctaPath: '/events',
  },
};

/**
 * How many places a card sits from the front, signed and taking the shorter way round, so
 * the last card counts as the front card's left-hand neighbour rather than its most distant
 * one. This is what lets the carousel loop without a rewind.
 *
 * Deliberately fractional: mid-drag a card sits at, say, -0.6, and every visual property
 * is derived from that. Rounding here is what made dragging pop between fixed states.
 */
const wrapPosition = (raw: number, count: number) => {
  const forward = ((raw % count) + count) % count;
  return forward > count / 2 ? forward - count : forward;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Fraction of the radius a card travels across the screen per step. Measured, not guessed. */
const TRAVEL_PER_STEP = 0.88;
/**
 * Pointer samples closer together than this are discarded. Two events a fraction of a
 * millisecond apart divide a normal few-pixel step by ~0, reporting speeds of hundreds of
 * pixels per millisecond and throwing the release right past its target.
 */
const MIN_SAMPLE_MS = 4;
/** Ceiling on a measured swipe speed, px/ms, as a second guard against freak samples. */
const MAX_VELOCITY = 3;
/** Above this release speed the gesture counts as a flick rather than a drag, px/ms. */
const FLICK_VELOCITY = 0.45;
/** Most cards a single gesture may advance, so a fast flick can't spin it wildly. */
const MAX_STEP_PER_GESTURE = 2;
/** Below this much movement the gesture is treated as a tap, not a swipe. */
const DRAG_THRESHOLD_PX = 6;

/** Clip shown per card, by card index. Falls back to the event's own media past the end. */
const CARD_VIDEOS = [
  '/videos/amptivevid5.mp4',
  '/videos/amptivevid4.mp4',
  '/videos/amptivevid1.mp4',
];

const isVideoSrc = (src?: string) => !!src && (src.endsWith('.mp4') || src.endsWith('.webm'));

/**
 * A shallow 3D carousel of upcoming events, sitting beside a headline.
 *
 * Each card is rotated to its own angle and pushed out by the radius, so it lands on the
 * surface of an imaginary cylinder facing the viewer. Depth alone does the sizing — the
 * browser's perspective shrinks whatever has rotated away, so nothing needs a manual scale.
 *
 * Angles are recomputed relative to the active card on every render rather than baked in
 * and counter-rotated, which keeps the arc a fixed width no matter how many events came
 * back from the API, and lets the carousel wrap around without rewinding.
 */
export default function EventSpotlightCarousel({ events, loading = false }: EventSpotlightCarouselProps) {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const pausedRef = useRef(false);
  // Keyed by ring slot, not event id — a card appears in more than one slot, so ids collide.
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [playingStates, setPlayingStates] = useState<Record<number, boolean>>({});

  // Drag / swipe. Styles are written straight to the slots rather than through state, so a
  // moving finger never waits on a React render.
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
    units: 0,
    moved: false,
  });
  const frameRef = useRef<number | null>(null);
  // Set when a gesture actually moved, so the click it generates on release is ignored.
  const justDraggedRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const cards = useMemo(() => events.slice(0, MAX_CARDS), [events]);
  const count = cards.length;

  /**
   * The cards repeated around a ring big enough that a slot only ever wraps while it is
   * invisible.
   *
   * With just three slots the ring wraps at ±1.5, so on every advance the left-hand card
   * has to become the right-hand one — a two-step move at full opacity, which reads as it
   * sliding back across the front of the carousel. Padding the ring out past the visible
   * span means every slot moves exactly one step and the wrap happens off in the dark.
   */
  const ring = useMemo(() => {
    if (count === 0) return [];
    const size = count >= VISIBLE_SPAN * 2 + 1 ? count : count * Math.ceil((VISIBLE_SPAN * 2 + 2) / count);
    return Array.from({ length: size }, (_, index) => ({ card: cards[index % count], cardIndex: index % count }));
  }, [cards, count]);
  const ringSize = ring.length;

  const radius = isCompact ? MOBILE_RADIUS : RADIUS;
  const pxPerCard = radius * TRAVEL_PER_STEP;

  // applyLayout runs outside React during a drag, so it reads the active card from a ref.
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keep the active slot in range when the event list changes underneath us.
  useEffect(() => {
    setActive(current => (ringSize === 0 ? 0 : current % ringSize));
  }, [ringSize]);

  useEffect(() => {
    if (ringSize < 2) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      setActive(current => (current + 1) % ringSize);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [ringSize]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (ringSize < 2) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActive(current => (current + 1) % ringSize);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActive(current => (current - 1 + ringSize) % ringSize);
      }
    },
    [ringSize]
  );

  /**
   * Which slot to jump to for a given card. A card sits in several slots around the ring,
   * so pick the one nearest the front — otherwise tapping a dot can unwind most of the
   * ring to reach a copy that was right next door.
   */
  const nearestSlotFor = useCallback(
    (cardIndex: number) => {
      let best = cardIndex;
      let bestDistance = Infinity;
      for (let slot = cardIndex; slot < ringSize; slot += count) {
        const distance = Math.abs(wrapPosition(slot - active, ringSize));
        if (distance < bestDistance) {
          bestDistance = distance;
          best = slot;
        }
      }
      return best;
    },
    [active, count, ringSize]
  );

  /**
   * The single source of truth for where every card sits and how it looks, at any
   * fractional offset from the settled position.
   *
   * Position, scale, fade and stacking all come from one continuous number. Deriving only
   * the rotation from the drag — and leaving opacity and scale on React's rounded state —
   * is what made a swipe look like cards teleporting between two fixed appearances.
   */
  const applyLayout = useCallback(
    (dragUnits: number) => {
      // Fade must hit zero by the point a slot wraps to the far side, or it vanishes
      // mid-drag at whatever opacity it happened to be on.
      const span = Math.min(VISIBLE_SPAN, ringSize / 2);

      slotRefs.current.forEach((slot, index) => {
        if (!slot) return;
        const position = wrapPosition(index - activeRef.current - dragUnits, ringSize);
        const distance = Math.abs(position);
        const opacity = clamp01(1 - 0.45 * distance) * clamp01((span - distance) / 0.5);
        const scale = 1 - Math.min(distance, VISIBLE_SPAN) * SIDE_SCALE_STEP;

        slot.style.transform =
          `rotateY(${position * ANGLE_STEP}rad) translateZ(${radius}px) scale(${scale})`;
        slot.style.opacity = String(opacity);
        slot.style.visibility = opacity < 0.005 ? 'hidden' : 'visible';
        slot.style.zIndex = String(Math.round(1000 - distance * 100));
      });
    },
    [ringSize, radius]
  );

  // Settled layout. useLayoutEffect so the first paint is already correct.
  useLayoutEffect(() => {
    applyLayout(0);
  }, [applyLayout, active]);

  /*
   * Only the slot at the front plays. Every <video> carries `autoPlay`, so without this
   * the whole ring would run at once — a decoder each for cards that are turned away,
   * faded out, or parked round the back entirely.
   */
  useEffect(() => {
    ring.forEach((_, index) => {
      const video = videoRefs.current[index];
      if (!video) return;
      if (index === active) {
        // Rejects if autoplay is refused, or if a pause interrupts it mid-promise.
        video.play().catch(() => {});
      } else {
        // Rewind on the way out, so a card returning to the front plays from the top
        // rather than resuming wherever it was cut off. It also leaves the parked card
        // showing its opening frame instead of an arbitrary mid-clip one.
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [active, ring]);

  const setTransitions = useCallback((enabled: boolean) => {
    slotRefs.current.forEach(slot => {
      if (slot) slot.style.transition = enabled ? '' : 'none';
    });
  }, []);

  const releaseAnimRef = useRef<number | null>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (ringSize < 2 || event.button !== 0) return;
      // Let the play/pause button take its own clicks.
      if ((event.target as HTMLElement).closest('button')) return;

      if (releaseAnimRef.current !== null) {
        cancelAnimationFrame(releaseAnimRef.current);
        releaseAnimRef.current = null;
      }

      const drag = dragRef.current;
      drag.pointerId = event.pointerId;
      drag.startX = drag.lastX = event.clientX;
      drag.lastT = event.timeStamp;
      drag.velocity = 0;
      drag.units = 0;
      drag.moved = false;

      // Capture so the gesture keeps tracking once the cursor leaves the stage.
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      pausedRef.current = true;
      setDragging(true);
      setTransitions(false);
    },
    [ringSize, setTransitions]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      if (drag.pointerId !== event.pointerId) return;

      const dx = event.clientX - drag.startX;
      if (Math.abs(dx) > DRAG_THRESHOLD_PX) drag.moved = true;

      const dt = event.timeStamp - drag.lastT;
      if (dt >= MIN_SAMPLE_MS) {
        // Smooth the velocity so one jittery sample can't throw the release.
        const instant = (event.clientX - drag.lastX) / dt;
        const clamped = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, instant));
        drag.velocity = drag.velocity * 0.7 + clamped * 0.3;
        drag.lastX = event.clientX;
        drag.lastT = event.timeStamp;
      }

      // Dragging right pulls the previous card towards the front, hence the negation.
      const rawUnits = -dx / pxPerCard;
      const sign = Math.sign(rawUnits);
      const abs = Math.abs(rawUnits);
      // Rubber-band resistance for drags past 1 step so high-speed flicks don't overstretch
      const maxDrag = 1.4;
      const units = abs <= 1.0 ? rawUnits : sign * (1.0 + Math.atan((abs - 1.0) * 1.5) * 0.28);
      drag.units = Math.max(-maxDrag, Math.min(maxDrag, units));

      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          applyLayout(dragRef.current.units);
        });
      }
    },
    [applyLayout, pxPerCard]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      if (drag.pointerId !== event.pointerId) return;
      drag.pointerId = null;

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      const speed = Math.abs(drag.velocity);
      let targetStep = 0;
      if (speed > FLICK_VELOCITY) {
        const flickDir = Math.sign(-drag.velocity);
        targetStep = flickDir * (speed > 1.2 ? 2 : 1);
      } else {
        targetStep = Math.round(drag.units);
      }
      targetStep = Math.max(-MAX_STEP_PER_GESTURE, Math.min(MAX_STEP_PER_GESTURE, targetStep));

      // Cleared on the next tick, once the click this release generates has been and gone.
      justDraggedRef.current = drag.moved;
      if (drag.moved) setTimeout(() => { justDraggedRef.current = false; }, 0);

      // Smooth JS inertia glide to target card position before setting state
      const startUnits = drag.units;
      const distance = Math.abs(targetStep - startUnits);
      const duration = Math.max(220, Math.min(420, distance * 280));
      const startTime = performance.now();

      const animateRelease = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentUnits = startUnits + (targetStep - startUnits) * ease;

        applyLayout(currentUnits);

        if (progress < 1) {
          releaseAnimRef.current = requestAnimationFrame(animateRelease);
        } else {
          releaseAnimRef.current = null;
          setTransitions(true);
          setDragging(false);
          pausedRef.current = false;

          if (targetStep !== 0) {
            setActive(current => ((current + targetStep) % ringSize + ringSize) % ringSize);
          } else {
            applyLayout(0);
          }
        }
      };

      releaseAnimRef.current = requestAnimationFrame(animateRelease);
    },
    [applyLayout, ringSize, pxPerCard, setTransitions]
  );

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (releaseAnimRef.current !== null) cancelAnimationFrame(releaseAnimRef.current);
  }, []);

  const activeCardIndex = ring[active]?.cardIndex ?? (active % count);
  const currentCopy = DYNAMIC_COPY[activeCardIndex] ?? DYNAMIC_COPY[0];

  return (
    <AmbientGradientBand className="w-full lg:w-[95vw] mx-auto mb-10 rounded-none lg:rounded-[2rem] lg:mb-12">
      <div className="SpotlightBand">
      <div className="SpotlightGrid">
        <div className="SpotlightCopy">
          <p key={`eyebrow-${activeCardIndex}`} className="SpotlightEyebrow">
            {currentCopy.eyebrow}
          </p>
          <h2 key={`headline-${activeCardIndex}`} className="SpotlightHeadline">
            {activeCardIndex === 0 ? (
              <>
                <span className="lg:hidden">Create Ticketed Events &amp; Sell Out In Minutes</span>
                <span className="hidden lg:inline">Earn Money From Your Live Audio Shows Through Direct Monetization And Gifting.</span>
              </>
            ) : (
              currentCopy.headline
            )}
          </h2>
          <button
            key={`cta-${activeCardIndex}`}
            type="button"
            className="SpotlightCta cursor-pointer"
            onClick={() => navigate(currentCopy.ctaPath)}
          >
            {currentCopy.ctaText}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div
          className="SpotlightStage"
          role="group"
          aria-roledescription="carousel"
          aria-label="Events trending on Amptive"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { if (dragRef.current.pointerId === null) pausedRef.current = false; }}
          onFocus={() => { pausedRef.current = true; }}
          onBlur={() => { pausedRef.current = false; }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          data-dragging={dragging}
        >
          <div className="SpotlightScene">
            <div className="SpotlightCylinder">
              {ring.map(({ card: event, cardIndex }, index) => {
                const isActive = index === active;
                const kicker = kickerFor(event, cardIndex);
                const videoSrc = CARD_VIDEOS[cardIndex] ?? (isVideoSrc(event.media?.src) ? event.media!.src : undefined);

                return (
                  <div
                    // Keyed by ring slot: the same event fills more than one slot, so its
                    // id is not unique here.
                    key={index}
                    className="SpotlightSlot"
                    // Position, scale, fade and stacking are all written by applyLayout,
                    // which is the only thing that can keep them continuous under a drag.
                    ref={el => { slotRefs.current[index] = el; }}
                    data-active={isActive}
                    aria-hidden={!isActive}
                  >
                    <div className="SpotlightSlotLabel">
                      <p className="SpotlightSlotLabelTitle">{kicker.title}</p>
                      <p className="SpotlightSlotLabelSub">{kicker.sub}</p>
                    </div>
                    <div className="SpotlightCard">
                      {/* Video / Image fills card edge-to-edge */}
                      {videoSrc ? (
                        <video
                          ref={(el) => { videoRefs.current[index] = el; }}
                          src={videoSrc}
                          autoPlay loop muted playsInline
                          preload={isActive ? 'auto' : 'metadata'}
                          className="absolute inset-0 w-full h-full object-cover"
                          onPlay={() => setPlayingStates(prev => ({ ...prev, [index]: true }))}
                          onPause={() => setPlayingStates(prev => ({ ...prev, [index]: false }))}
                        />
                      ) : event.media?.src ? (
                        <img
                          src={event.media.src}
                          alt={event.media.alt || event.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading={isActive ? 'eager' : 'lazy'}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white/35">
                          <Calendar className="h-8 w-8" />
                        </div>
                      )}

                      {/* Bottom Chin: Logo left, Play/Pause right */}
                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 pb-2 pt-5 bg-gradient-to-t from-black/35 to-transparent select-none">
                        {/* Amptive Logo & Logotype — Left */}
                        <div className="flex items-center gap-1 opacity-95 pointer-events-none">
                          <div className="relative h-[22px] w-[22px] flex items-center justify-center">
                            <img 
                              src="/amptivelogo.svg" 
                              alt="Amptive Logo" 
                              className="h-full w-auto" 
                              style={{ filter: 'brightness(0) invert(1)' }}
                            />
                          </div>
                          <div className="h-4 w-auto">
                            <img 
                              src="/amptextlogo.svg" 
                              alt="Amptive" 
                              className="h-full w-auto" 
                              style={{ filter: 'brightness(0) invert(1)' }}
                            />
                          </div>
                        </div>

                        {/* Play / Pause — Right. Only on the front card: the side ones are
                            parked paused, so a control there would fight the effect that
                            parks them. */}
                        {isActive && (
                          <button
                            type="button"
                            aria-label={playingStates[index] !== false ? 'Pause video' : 'Play video'}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/35 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Releasing a swipe over this button shouldn't toggle the video.
                              if (justDraggedRef.current) return;
                              const vid = videoRefs.current[index];
                              if (!vid) return;
                              if (vid.paused) { vid.play(); } else { vid.pause(); }
                            }}
                          >
                            {playingStates[index] === false
                              ? <Play className="h-3 w-3 fill-white" />
                              : <Pause className="h-3 w-3 fill-white" />
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {count > 1 && (
        <div className="SpotlightDots">
          {/* One dot per distinct card, not per ring slot — the ring repeats them. */}
          {cards.map((event, cardIndex) => (
            <button
              key={event.id}
              type="button"
              className="SpotlightDot"
              data-active={cardIndex === active % count}
              aria-label={`Show ${event.title}`}
              aria-current={cardIndex === active % count}
              onClick={() => setActive(nearestSlotFor(cardIndex))}
            />
          ))}
        </div>
      )}
      </div>
    </AmbientGradientBand>
  );
}
