import { useEffect, useMemo, useState } from 'react';

type Rgb = [number, number, number];

interface Palette {
  /** Solid colour behind the blobs. */
  base: Rgb;
  /** Six blob colours, in the fixed corner/edge order below. */
  blobs: [Rgb, Rgb, Rgb, Rgb, Rgb, Rgb];
}

/**
 * Where each blob sits, matching the reference layout: two rows of three, pushed towards
 * the edges so the centre stays calm enough for text to sit on.
 */
const BLOB_POSITIONS = [
  { x: '9.75%', y: '84.5%' },
  { x: '50%', y: '90.25%' },
  { x: '90.25%', y: '84.5%' },
  { x: '9.75%', y: '15.5%' },
  { x: '50%', y: '9.75%' },
  { x: '90.25%', y: '15.5%' },
] as const;

/**
 * One palette, so the band holds this look rather than drifting between two. Pass
 * `palettes` with more than one entry to bring the cycling back.
 *
 *   base   #1A1C17
 *   blobs  #5C5B48  #FFE272  #AF9A75  #262B24  #AD3F3D  #D7DEF7
 */
const DEFAULT_PALETTES: Palette[] = [
  {
    base: [26, 28, 23],
    blobs: [[92, 91, 72], [255, 226, 114], [175, 154, 117], [38, 43, 36], [173, 63, 61], [215, 222, 247]],
  },
];

const FADE_MS = 600;
const HOLD_MS = 7000;

const rgb = ([r, g, b]: Rgb) => `rgb(${r}, ${g}, ${b})`;
const rgba = ([r, g, b]: Rgb, alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

/** One blob: a soft radial falloff, opaque at the centre and gone by 75%. */
const blobGradient = (colour: Rgb, position: { x: string; y: string }) =>
  `radial-gradient(75vmax at ${position.x} ${position.y}, ${rgb(colour)} 0%, ${rgba(colour, 0.75)} 20%, ${rgba(colour, 0.45)} 40%, ${rgba(colour, 0.15)} 60%, ${rgba(colour, 0)} 75%)`;

const paletteBackground = (palette: Palette) =>
  palette.blobs.map((colour, index) => blobGradient(colour, BLOB_POSITIONS[index])).join(', ');

interface AmbientGradientBandProps {
  palettes?: Palette[];
  className?: string;
  children: React.ReactNode;
}

/**
 * A full-bleed band of colour, built from stacked radial gradients rather than an image so
 * it stays crisp at any size and costs nothing to download.
 *
 * Given a single palette it simply holds that look, which is the default. Given more, every
 * palette stays mounted as its own layer and they cross-fade by opacity — recolouring one
 * layer in place would step rather than blend.
 */
export default function AmbientGradientBand({ palettes = DEFAULT_PALETTES, className = '', children }: AmbientGradientBandProps) {
  const [index, setIndex] = useState(0);

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    // A slowly shifting background is decoration; for anyone who asks for reduced motion it
    // simply holds on the first palette.
    if (prefersReducedMotion || palettes.length < 2) return;
    const timer = setInterval(() => setIndex(current => (current + 1) % palettes.length), HOLD_MS);
    return () => clearInterval(timer);
  }, [palettes.length, prefersReducedMotion]);

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {palettes.map((palette, paletteIndex) => (
          <div
            key={paletteIndex}
            className="absolute inset-0 transition-opacity"
            style={{ opacity: paletteIndex === index ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
          >
            <div className="absolute inset-0" style={{ backgroundColor: rgb(palette.base) }} />
            <div className="absolute inset-0" style={{ background: paletteBackground(palette) }} />
          </div>
        ))}
        {/* Darkens the edges just enough to keep white text legible over the brighter blobs. */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.35) 100%)' }}
        />
      </div>
      {children}
    </div>
  );
}
