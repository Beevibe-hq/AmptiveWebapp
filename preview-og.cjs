#!/usr/bin/env node
/**
 * Local OG Image Preview Generator
 * Run: node preview-og.cjs
 * Then open: preview-og-output.png
 *
 * Change TITLE, DESCRIPTION, and THUMBNAIL_URL below to preview different events.
 */

const sharp = require('sharp');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── EDIT THESE TO PREVIEW DIFFERENT CARDS ────────────────────────────────────
const TITLE = 'POP UP/SAMPLE SALE';
const DESCRIPTION = 'An exclusive pop-up sale with curated collections. Find something you love and take it home today.';
const THUMBNAIL_URL = null; // Put a URL here to test with an event cover image
//   e.g. 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
// ─────────────────────────────────────────────────────────────────────────────

const OUTPUT_FILE = path.join(__dirname, 'preview-og-output.png');

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'AmptivePreviewBot/1.0' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxChars = 22) {
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

function wrapDesc(text, maxChars = 42) {
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

async function getFontBase64() {
  console.log('⏳ Fetching Inter font from Google Fonts...');
  try {
    const css = (await fetchBuffer(
      'https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap'
    )).toString();
    const urlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/);
    if (!urlMatch) throw new Error('Could not find font URL in CSS');
    const fontBuffer = await fetchBuffer(urlMatch[1]);
    console.log('✅ Font loaded');
    return fontBuffer.toString('base64');
  } catch (err) {
    console.warn('⚠️  Font fetch failed, text may render as boxes:', err.message);
    return null;
  }
}

async function main() {
  console.log('\n🎨 Generating OG preview card...');
  console.log(`   Title: "${TITLE}"`);
  console.log(`   Thumbnail: ${THUMBNAIL_URL || '(none)'}\n`);

  const width = 1200;
  const height = 630;

  const fontBase64 = await getFontBase64();
  const fontFaceBlock = fontBase64
    ? `@font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 400 900;
        src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
      }`
    : '';

  // Extract dominant color from thumbnail if provided
  let bgColorLight = '#FAFAFA';
  let bgColorDark  = '#F0F0F2';
  let textColor    = '#111111';
  let btnColor     = '#111111';
  let btnText      = '#FFFFFF';

  const composites = [];

  if (THUMBNAIL_URL) {
    try {
      console.log('⏳ Fetching event thumbnail...');
      const imgBuffer = await fetchBuffer(THUMBNAIL_URL);

      // Extract average RGB via sharp stats
      const stats = await sharp(imgBuffer).stats();
      const r = Math.round(stats.channels[0].mean);
      const g = Math.round(stats.channels[1].mean);
      const b = Math.round(stats.channels[2].mean);
      console.log(`🎨 Dominant color: rgb(${r},${g},${b})`);

      // Blend with white at 90% to create a very subtle background tint
      const mix = (channel, white = 255, amount = 0.88) =>
        Math.round(channel * (1 - amount) + white * amount);

      const lr = mix(r); const lg = mix(g); const lb = mix(b);
      const dr = mix(r, 240, 0.75); const dg = mix(g, 240, 0.75); const db = mix(b, 240, 0.75);

      bgColorLight = `rgb(${lr},${lg},${lb})`;
      bgColorDark  = `rgb(${dr},${dg},${db})`;

      // Use dark button color based on perceived brightness of dominant
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness < 80) {
        // Very dark dominant - use lighter button
        btnColor = `rgb(${Math.min(r+40,255)},${Math.min(g+40,255)},${Math.min(b+40,255)})`;
      } else {
        btnColor = `rgb(${Math.round(r*0.5)},${Math.round(g*0.5)},${Math.round(b*0.5)})`;
      }

      const resized = await sharp(imgBuffer)
        .resize(480, 480, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();

      const maskSvg = `<svg width="480" height="480" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="480" height="480" rx="28" ry="28" fill="white"/>
      </svg>`;

      const rounded = await sharp(resized)
        .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
        .png()
        .toBuffer();

      composites.push({ input: rounded, left: 650, top: 75 });
      console.log('✅ Thumbnail composited');
    } catch (err) {
      console.warn('⚠️  Thumbnail failed:', err.message);
    }
  }

  const titleLines = wrapText(TITLE, 15);

  const fontSize = 52;
  const titleLineHeight = 64;
  const totalTitleHeight = (titleLines.length - 1) * titleLineHeight + fontSize;
  const titleStartY = Math.round((height - totalTitleHeight) / 2) + fontSize;
  const btnY = 500;

  const titleSvgLines = titleLines
    .map((line, i) =>
      `<text x="80" y="${titleStartY + i * titleLineHeight}" font-family="Inter, sans-serif" font-weight="800" font-size="52" fill="${textColor}" letter-spacing="-2">${escapeXml(line)}</text>`
    ).join('\n');

  const baseSvg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>${fontFaceBlock}</style>
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
    <path d="M12.83 68.46C8.97 67.76 8.26 63.18 8.05 58.31C7.47 44.65 11.57 31.16 19.88 19.3C22.64 15.33 26.01 11.39 29.84 12.07C34.77 12.94 34.75 20.25 34.72 28C34.72 32.16 34.71 37.01 35.72 39.88C36.1 40.93 37.96 41.08 38.62 40.11C40.42 37.47 41.82 32.83 43.01 28.84C45.27 21.28 47.43 14.14 52.48 14.14C57.53 14.14 59.68 21.28 61.94 28.86C63.14 32.87 64.55 37.55 66.36 40.18C67.02 41.15 68.88 41 69.25 39.95C70.28 37.09 70.28 32.2 70.28 28C70.25 20.26 70.24 12.94 75.15 12.08C79.01 11.39 82.36 15.33 85.12 19.3C93.43 31.17 97.51 44.65 96.95 58.31C96.74 63.18 96.03 67.77 92.16 68.46C91.85 68.5 91.57 68.53 91.28 68.53C86.71 68.53 82.78 62.32 78.61 55.77C75.86 51.45 72.6 46.31 69.72 44.54C69.06 44.13 68.11 44.18 67.55 44.66C65.17 46.72 63.42 52.49 61.98 57.32C59.72 64.86 57.57 72 52.52 72C47.47 72 45.32 64.86 43.05 57.31C41.62 52.47 39.88 46.68 37.5 44.64C36.94 44.16 36.01 44.11 35.34 44.5C32.45 46.22 29.16 51.41 26.38 55.78C22.22 62.32 18.28 68.54 13.72 68.54C13.42 68.54 13.16 68.51 12.83 68.46Z" fill="#111111"/>
  </g>

  <!-- Event Title -->
  ${titleSvgLines}

  <!-- GET TICKETS button -->
  <rect x="80" y="${btnY}" width="200" height="52" rx="26" fill="${btnColor}"/>
  <text x="180" y="${btnY + 32}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="700" font-size="14" fill="${btnText}" letter-spacing="1.5">GET TICKETS</text>

  <!-- Right image placeholder background -->
  <rect x="650" y="75" width="480" height="480" rx="28" fill="#E2E2E8"/>
  ${!THUMBNAIL_URL ? `<text x="890" y="330" text-anchor="middle" font-family="Inter, sans-serif" font-weight="600" font-size="18" fill="#BBBBBB">Event Cover</text>` : ''}
</svg>`;

  const outputBuffer = await sharp(Buffer.from(baseSvg))
    .composite(composites)
    .png()
    .toBuffer();

  fs.writeFileSync(OUTPUT_FILE, outputBuffer);
  console.log(`\n✅ Preview saved to: ${OUTPUT_FILE}`);

  // Auto-open on macOS
  try {
    execSync(`open "${OUTPUT_FILE}"`);
    console.log('🖼  Opening preview...\n');
  } catch {}
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
