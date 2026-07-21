import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Helper function to resolve and load bundled font buffer in serverless Lambda
function getFontBuffer() {
  const possiblePaths = [
    join(process.cwd(), 'netlify', 'functions', 'fonts', 'inter-800.ttf'),
    join(process.cwd(), 'fonts', 'inter-800.ttf'),
    join(process.cwd(), 'inter-800.ttf'),
    './netlify/functions/fonts/inter-800.ttf',
    './fonts/inter-800.ttf'
  ];

  for (const p of possiblePaths) {
    try {
      const buf = readFileSync(p);
      if (buf && buf.length > 0) return buf;
    } catch (_) {}
  }
  return null;
}


function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxChars = 15) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export async function handler(event) {
  const query = event.queryStringParameters || {};
  const title = query.title || 'Live, Connect, Earn';
  const thumbnailUrl = query.image;

  const width = 1200;
  const height = 630;

  // Default neutral palette
  let bgColorLight = '#FAFAFA';
  let bgColorDark  = '#F0F0F2';
  const btnColor   = '#111111';
  const btnText    = '#FFFFFF';
  const textColor  = '#111111';

  let thumbnailBuffer = null;

  // 1. Process thumbnail & extract dominant color tint if image provided
  if (thumbnailUrl) {
    try {
      const imgRes = await fetch(thumbnailUrl, {
        headers: { 'User-Agent': 'AmptiveSEOBot/1.0' }
      });
      if (imgRes.ok) {
        const rawBuffer = Buffer.from(await imgRes.arrayBuffer());

        // Extract average RGB color
        const stats = await sharp(rawBuffer).stats();
        const r = Math.round(stats.channels[0].mean);
        const g = Math.round(stats.channels[1].mean);
        const b = Math.round(stats.channels[2].mean);

        const mix = (ch, white = 255, amt = 0.88) =>
          Math.round(ch * (1 - amt) + white * amt);

        bgColorLight = `rgb(${mix(r)},${mix(g)},${mix(b)})`;
        bgColorDark  = `rgb(${mix(r, 240, 0.75)},${mix(g, 240, 0.75)},${mix(b, 240, 0.75)})`;

        // Crop & round corner mask for cover art
        const resized = await sharp(rawBuffer)
          .resize(480, 480, { fit: 'cover', position: 'centre' })
          .png()
          .toBuffer();

        const maskSvg = `<svg width="480" height="480" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="480" height="480" rx="28" ry="28" fill="white"/>
        </svg>`;

        thumbnailBuffer = await sharp(resized)
          .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
          .png()
          .toBuffer();
      }
    } catch (err) {
      console.error('Thumbnail processing error:', err);
    }
  }

  // 2. Calculate title vertical layout
  const titleLines = wrapText(title, 15);
  const fontSize = 52;
  const titleLineHeight = 64;
  const totalTitleHeight = (titleLines.length - 1) * titleLineHeight + fontSize;
  const titleStartY = Math.round((height - totalTitleHeight) / 2) + fontSize;
  const btnY = 500;

  const titleSvgLines = titleLines
    .map((line, i) =>
      `<text x="80" y="${titleStartY + i * titleLineHeight}" font-family="Inter" font-weight="800" font-size="52" fill="${textColor}" letter-spacing="-2">${escapeXml(line)}</text>`
    )
    .join('\n');

  const baseSvg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${bgColorLight}"/>
      <stop offset="100%" stop-color="${bgColorDark}"/>
    </linearGradient>
    <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="rgba(0,0,0,0.04)"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#dots)"/>

  <!-- Amptive M-logo icon -->
  <g transform="translate(77, 72) scale(0.55)">
    <path d="M12.83 68.46C8.97 67.76 8.26 63.18 8.05 58.31C7.47 44.65 11.57 31.16 19.88 19.3C22.64 15.33 26.01 11.39 29.84 12.07C34.77 12.94 34.75 20.25 34.72 28C34.72 32.16 34.71 37.01 35.72 39.88C36.1 40.93 37.96 41.08 38.62 40.11C40.42 37.47 41.82 32.83 43.01 28.84C45.27 21.28 47.43 14.14 52.48 14.14C57.53 14.14 59.68 21.28 61.94 28.86C63.14 32.87 64.55 37.55 66.36 40.18C67.02 41.15 68.88 41 69.25 39.95C70.28 37.09 70.28 32.2 70.28 28C70.25 20.26 70.24 12.94 75.15 12.08C79.01 11.39 82.36 15.33 85.12 19.3C93.43 31.17 97.51 44.65 96.95 58.31C96.74 63.18 96.03 67.77 92.16 68.46C91.85 68.5 91.57 68.53 91.28 68.53C86.71 68.53 82.78 62.32 78.61 55.77C75.86 51.45 72.6 46.31 69.72 44.54C69.06 44.13 68.11 44.18 67.55 44.66C65.17 46.72 63.42 52.49 61.98 57.32C59.72 64.86 57.57 72 52.52 72C47.47 72 45.32 64.86 43.05 57.31C41.62 52.47 39.88 46.68 37.5 44.64C36.94 44.16 36.01 44.11 35.34 44.5C32.45 46.22 29.16 51.41 26.38 55.78C22.22 62.32 18.28 68.54 13.72 68.54C13.42 68.54 13.16 68.51 12.83 68.46Z" fill="${textColor}"/>
  </g>

  <!-- Event Title -->
  ${titleSvgLines}

  <!-- GET TICKETS button -->
  <rect x="80" y="${btnY}" width="200" height="52" rx="26" fill="${btnColor}"/>
  <text x="180" y="${btnY + 32}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="14" fill="${btnText}" letter-spacing="1.5">GET TICKETS</text>

  <!-- Right image placeholder background -->
  <rect x="650" y="75" width="480" height="480" rx="28" fill="#E2E2E8"/>
  ${!thumbnailUrl ? `<text x="890" y="330" text-anchor="middle" font-family="Inter" font-weight="600" font-size="18" fill="#BBBBBB">Event Cover</text>` : ''}
</svg>`;

  try {
    // 3. Render text + SVG graphics using Resvg WASM engine
    const fontBuf = getFontBuffer();
    const resvgOpts = {
      font: {
        defaultFontFamily: 'Inter',
      },
    };
    if (fontBuf) {
      resvgOpts.font.fontBuffers = [fontBuf];
    }

    const resvg = new Resvg(baseSvg, resvgOpts);
    const basePng = resvg.render().asPng();

    // 4. Composite rounded cover art thumbnail onto rendered base PNG using Sharp
    const composites = [];
    if (thumbnailBuffer) {
      composites.push({ input: thumbnailBuffer, left: 650, top: 75 });
    }

    const outputBuffer = await sharp(basePng)
      .composite(composites)
      .png()
      .toBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400'
      },
      body: outputBuffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('Render error:', err);
    return { statusCode: 500, body: `Render error: ${err.message}` };
  }
}
