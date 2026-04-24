
import { api } from '@/lib/api/client';

const quantizeColor = (r: number, g: number, b: number, factor = 24): string => {
  // Round each channel to nearest multiple of `factor` to group similar colors
  const rq = Math.round(r / factor) * factor;
  const gq = Math.round(g / factor) * factor;
  const bq = Math.round(b / factor) * factor;
  return rgbToHex(
    Math.min(255, rq),
    Math.min(255, gq),
    Math.min(255, bq)
  );
};

const isBoringColor = (r: number, g: number, b: number): boolean => {
  const brightness = (r + g + b) / 3;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  // Skip near-white, near-black, and near-grey colors
  return brightness > 230 || brightness < 20 || saturation < 30;
};

export const extractDominantColors = (
  imageUrl: string,
  count: number = 2
): Promise<string[]> => {
  const FALLBACK = ['#1E3A8A', '#3B82F6'];

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onerror = () => resolve(FALLBACK);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(FALLBACK);

      // Downsample to max 100x100 — we don't need full resolution for color extraction
      const MAX_DIM = 100;
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colorCounts: Record<string, number> = {};

        // Walk every pixel in the downsampled image (no skipping needed after scaling)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a < 128) continue;              // skip transparent
            if (isBoringColor(r, g, b)) continue; // skip near-white/black/grey

            const key = quantizeColor(r, g, b);
            colorCounts[key] = (colorCounts[key] || 0) + 1;
          }
        }

        const sorted = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([color]) => color);

        // Deduplicate perceptually similar top colors
        const result: string[] = [];
        for (const color of sorted) {
          if (result.length >= count) break;
          const isDuplicate = result.some((c) => colorDistance(c, color) < 60);
          if (!isDuplicate) result.push(color);
        }

        while (result.length < count) result.push(FALLBACK[result.length] ?? '#1E3A8A');
        resolve(result);
      } catch (e) {
        console.error('Color extraction failed:', e);
        resolve(FALLBACK);
      }
    };

    const isExternal = /^https?:\/\//.test(imageUrl);
    img.src = isExternal
      ? api.getProxiedImageUrl(imageUrl)
      : imageUrl;
  });
};

// Euclidean distance in RGB space
const colorDistance = (hex1: string, hex2: string): number => {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
};

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};
