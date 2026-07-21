// Cache font in memory across warm invocations
let cachedFontBase64 = null;

async function getInterFontBase64() {
  if (cachedFontBase64) return cachedFontBase64;
  try {
    // Fetch Inter Bold subset from Google Fonts CDN
    const cssRes = await fetch(
      'https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const css = await cssRes.text();

    // Extract the first woff2 URL from the css response
    const urlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/);
    if (!urlMatch) return null;

    const fontRes = await fetch(urlMatch[1]);
    const fontBuffer = await fontRes.arrayBuffer();
    cachedFontBase64 = Buffer.from(fontBuffer).toString('base64');
    return cachedFontBase64;
  } catch (err) {
    console.error('Font fetch failed:', err);
    return null;
  }
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

export async function handler(event) {
  const { default: sharp } = await import('sharp');

  const query = event.queryStringParameters || {};
  const title = query.title || 'Live, Connect, Earn';
  const description = query.description || 'Join us on Amptive';
  const thumbnailUrl = query.image;

  const width = 1200;
  const height = 630;

  // Load font
  const fontBase64 = await getInterFontBase64();
  const fontFaceBlock = fontBase64
    ? `@font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 400 900;
        src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
      }`
    : '';

  // Wrap title and description
  const titleLines = wrapText(title, 22);
  const descLines = wrapDesc(description, 42);

  // Dynamic vertical positioning
  const titleStartY = 205;
  const titleLineHeight = 60;
  const titleEndY = titleStartY + (titleLines.length - 1) * titleLineHeight;
  const descStartY = titleEndY + 36;
  const descLineHeight = 26;
  const btnY = 495;

  const titleSvgLines = titleLines
    .map((line, i) =>
      `<text x="80" y="${titleStartY + i * titleLineHeight}" font-family="Inter, sans-serif" font-weight="800" font-size="52" fill="#111111" letter-spacing="-2">${escapeXml(line)}</text>`
    )
    .join('\n');

  const descSvgLines = descLines
    .map((line, i) =>
      `<text x="80" y="${descStartY + i * descLineHeight}" font-family="Inter, sans-serif" font-weight="500" font-size="20" fill="#777777" letter-spacing="-0.3">${escapeXml(line)}</text>`
    )
    .join('\n');

  const baseSvg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>${fontFaceBlock}</style>
    <linearGradient id="bg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FAFAFA"/>
      <stop offset="100%" stop-color="#F0F0F2"/>
    </linearGradient>
    <clipPath id="imgClip">
      <rect x="650" y="75" width="480" height="480" rx="28"/>
    </clipPath>
    <clipPath id="thumbClip">
      <rect x="0" y="0" width="480" height="480" rx="28"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)"/>

  <!-- Subtle dot grid -->
  <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="1.2" fill="rgba(0,0,0,0.04)"/>
  </pattern>
  <rect width="${width}" height="${height}" fill="url(#dots)"/>

  <!-- Amptive M-logo icon -->
  <g transform="translate(77, 72) scale(0.55)">
    <path d="M12.83 68.46C8.97 67.76 8.26 63.18 8.05 58.31C7.47 44.65 11.57 31.16 19.88 19.3C22.64 15.33 26.01 11.39 29.84 12.07C34.77 12.94 34.75 20.25 34.72 28C34.72 32.16 34.71 37.01 35.72 39.88C36.1 40.93 37.96 41.08 38.62 40.11C40.42 37.47 41.82 32.83 43.01 28.84C45.27 21.28 47.43 14.14 52.48 14.14C57.53 14.14 59.68 21.28 61.94 28.86C63.14 32.87 64.55 37.55 66.36 40.18C67.02 41.15 68.88 41 69.25 39.95C70.28 37.09 70.28 32.2 70.28 28C70.25 20.26 70.24 12.94 75.15 12.08C79.01 11.39 82.36 15.33 85.12 19.3C93.43 31.17 97.51 44.65 96.95 58.31C96.74 63.18 96.03 67.77 92.16 68.46C91.85 68.5 91.57 68.53 91.28 68.53C86.71 68.53 82.78 62.32 78.61 55.77C75.86 51.45 72.6 46.31 69.72 44.54C69.06 44.13 68.11 44.18 67.55 44.66C65.17 46.72 63.42 52.49 61.98 57.32C59.72 64.86 57.57 72 52.52 72C47.47 72 45.32 64.86 43.05 57.31C41.62 52.47 39.88 46.68 37.5 44.64C36.94 44.16 36.01 44.11 35.34 44.5C32.45 46.22 29.16 51.41 26.38 55.78C22.22 62.32 18.28 68.54 13.72 68.54C13.42 68.54 13.16 68.51 12.83 68.46Z" fill="#111111"/>
  </g>

  <!-- "amptive" wordmark text -->
  <text x="138" y="112" font-family="Inter, sans-serif" font-weight="800" font-size="26" fill="#111111" letter-spacing="-0.8">amptive</text>

  <!-- Event Title Lines -->
  ${titleSvgLines}

  <!-- Description Lines -->
  ${descSvgLines}

  <!-- GET TICKETS button -->
  <rect x="80" y="${btnY}" width="200" height="52" rx="26" fill="#111111"/>
  <text x="180" y="${btnY + 32}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="700" font-size="14" fill="#FFFFFF" letter-spacing="1.5">GET TICKETS</text>

  <!-- Right image placeholder background -->
  <rect x="650" y="75" width="480" height="480" rx="28" fill="#E2E2E8"/>
  <text x="890" y="330" text-anchor="middle" font-family="Inter, sans-serif" font-weight="600" font-size="18" fill="#BBBBBB">Event Cover</text>
</svg>`;

  const composites = [];

  // Composite the actual event thumbnail image
  if (thumbnailUrl) {
    try {
      const imgRes = await fetch(thumbnailUrl, {
        headers: { 'User-Agent': 'AmptiveSEOBot/1.0' }
      });
      if (imgRes.ok) {
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

        // Resize and round-corner mask the thumbnail
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
