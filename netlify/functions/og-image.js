// Inter 800 font embedded as base64 — no file system access needed in Lambda
const INTER_800_B64 = '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';
function getInterFontBase64() { return INTER_800_B64; }

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
  const { default: sharp } = await import('sharp');

  const query = event.queryStringParameters || {};
  const title = query.title || 'Live, Connect, Earn';
  const thumbnailUrl = query.image;

  const width = 1200;
  const height = 630;

  // Load bundled font (synchronous, no network call)
  const fontBase64 = getInterFontBase64();
  const fontFaceBlock = fontBase64
    ? `@font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 800;
        src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
      }`
    : '';

  // Dominant color defaults (neutral)
  let bgColorLight = '#FAFAFA';
  let bgColorDark  = '#F0F0F2';
  // Button is always black
  const btnColor = '#111111';
  const btnText  = '#FFFFFF';
  const textColor = '#111111';

  const composites = [];

  // Extract dominant color from thumbnail and composite it
  if (thumbnailUrl) {
    try {
      const imgRes = await fetch(thumbnailUrl, {
        headers: { 'User-Agent': 'AmptiveSEOBot/1.0' }
      });
      if (imgRes.ok) {
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

        // Extract average RGB using sharp stats
        const stats = await sharp(imgBuffer).stats();
        const r = Math.round(stats.channels[0].mean);
        const g = Math.round(stats.channels[1].mean);
        const b = Math.round(stats.channels[2].mean);

        // Blend dominant color with white to create subtle background tint
        const mix = (ch, white = 255, amt = 0.88) =>
          Math.round(ch * (1 - amt) + white * amt);

        bgColorLight = `rgb(${mix(r)},${mix(g)},${mix(b)})`;
        bgColorDark  = `rgb(${mix(r,240,0.75)},${mix(g,240,0.75)},${mix(b,240,0.75)})`;

        // Resize and rounded-corner mask the thumbnail
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
      }
    } catch (err) {
      console.error('Thumbnail composite error:', err);
    }
  }

  // Vertically center title
  const titleLines = wrapText(title, 15);
  const fontSize = 52;
  const titleLineHeight = 64;
  const totalTitleHeight = (titleLines.length - 1) * titleLineHeight + fontSize;
  const titleStartY = Math.round((height - totalTitleHeight) / 2) + fontSize;
  const btnY = 500;

  const titleSvgLines = titleLines
    .map((line, i) =>
      `<text x="80" y="${titleStartY + i * titleLineHeight}" font-family="Inter, sans-serif" font-weight="800" font-size="52" fill="${textColor}" letter-spacing="-2">${escapeXml(line)}</text>`
    )
    .join('\n');

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
    <path d="M12.83 68.46C8.97 67.76 8.26 63.18 8.05 58.31C7.47 44.65 11.57 31.16 19.88 19.3C22.64 15.33 26.01 11.39 29.84 12.07C34.77 12.94 34.75 20.25 34.72 28C34.72 32.16 34.71 37.01 35.72 39.88C36.1 40.93 37.96 41.08 38.62 40.11C40.42 37.47 41.82 32.83 43.01 28.84C45.27 21.28 47.43 14.14 52.48 14.14C57.53 14.14 59.68 21.28 61.94 28.86C63.14 32.87 64.55 37.55 66.36 40.18C67.02 41.15 68.88 41 69.25 39.95C70.28 37.09 70.28 32.2 70.28 28C70.25 20.26 70.24 12.94 75.15 12.08C79.01 11.39 82.36 15.33 85.12 19.3C93.43 31.17 97.51 44.65 96.95 58.31C96.74 63.18 96.03 67.77 92.16 68.46C91.85 68.5 91.57 68.53 91.28 68.53C86.71 68.53 82.78 62.32 78.61 55.77C75.86 51.45 72.6 46.31 69.72 44.54C69.06 44.13 68.11 44.18 67.55 44.66C65.17 46.72 63.42 52.49 61.98 57.32C59.72 64.86 57.57 72 52.52 72C47.47 72 45.32 64.86 43.05 57.31C41.62 52.47 39.88 46.68 37.5 44.64C36.94 44.16 36.01 44.11 35.34 44.5C32.45 46.22 29.16 51.41 26.38 55.78C22.22 62.32 18.28 68.54 13.72 68.54C13.42 68.54 13.16 68.51 12.83 68.46Z" fill="${textColor}"/>
  </g>

  <!-- Event Title -->
  ${titleSvgLines}

  <!-- GET TICKETS button -->
  <rect x="80" y="${btnY}" width="200" height="52" rx="26" fill="${btnColor}"/>
  <text x="180" y="${btnY + 32}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="700" font-size="14" fill="${btnText}" letter-spacing="1.5">GET TICKETS</text>

  <!-- Right image placeholder background -->
  <rect x="650" y="75" width="480" height="480" rx="28" fill="#E2E2E8"/>
  ${!thumbnailUrl ? `<text x="890" y="330" text-anchor="middle" font-family="Inter, sans-serif" font-weight="600" font-size="18" fill="#BBBBBB">Event Cover</text>` : ''}
</svg>`;

  try {
    const outputBuffer = await sharp(Buffer.from(baseSvg))
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
    console.error('Sharp render error:', err);
    return { statusCode: 500, body: `Render error: ${err.message}` };
  }
}
