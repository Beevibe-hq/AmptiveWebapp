import sharp from 'sharp';

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapText(text, maxChars = 22) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4); // max 4 lines
}

export async function handler(event, context) {
  const query = event.queryStringParameters || {};
  const title = query.title || 'Live, Connect, Earn';
  const description = query.description || 'Join us on Amptive';
  const thumbnail = query.image;
  const logoVariant = query.logo || 'black';

  const host = event.headers.host || 'getamptive.com';

  const width = 1200;
  const height = 630;

  // 1. Text wrapping
  const titleLines = wrapText(title, 20);
  const titleTSPans = titleLines
    .map((line, idx) => `<tspan x="80" dy="${idx === 0 ? 0 : 58}">${escapeHtml(line)}</tspan>`)
    .join('');

  const descLines = wrapText(description, 35);
  const descTSPans = descLines
    .map((line, idx) => `<tspan x="80" dy="${idx === 0 ? 0 : 28}">${escapeHtml(line)}</tspan>`)
    .join('');

  // 2. Base SVG Design (incorporating background gradient, logo and structured metadata layout)
  const baseSvg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Background Gradient -->
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#EBECEF"/>
        </linearGradient>
        
        <!-- Button Gradient -->
        <linearGradient id="btnGrad" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
          <stop stop-color="#111111"/>
          <stop offset="1" stop-color="#000000"/>
        </linearGradient>
      </defs>

      <!-- Base Canvas Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

      <!-- Decorative subtle grid background lines -->
      <path d="M 0,100 L 1200,100 M 0,200 L 1200,200 M 0,300 L 1200,300 M 0,400 L 1200,400 M 0,500 L 1200,500" stroke="rgba(0,0,0,0.02)" stroke-width="1" />
      <path d="M 200,0 L 200,630 M 400,0 L 400,630 M 600,0 L 600,630 M 800,0 L 800,630 M 1000,0 L 1000,630" stroke="rgba(0,0,0,0.02)" stroke-width="1" />

      <!-- Left Column: Branding, Title, Action Info -->
      <!-- Amptive Logo Wordmark (SVG Vector shape) -->
      <g transform="translate(80, 80) scale(0.6)">
        <path d="M12.83 68.46C8.97 67.76 8.26 63.18 8.05 58.31C7.47 44.65 11.57 31.16 19.88 19.3C22.64 15.33 26.01 11.39 29.84 12.07C34.77 12.94 34.75 20.25 34.72 28C34.72 32.16 34.71 37.01 35.72 39.88C36.1 40.93 37.96 41.08 38.62 40.11C40.42 37.47 41.82 32.83 43.01 28.84C45.27 21.28 47.43 14.14 52.48 14.14C57.53 14.14 59.68 21.28 61.94 28.86C63.14 32.87 64.55 37.55 66.36 40.18C67.02 41.15 68.88 41 69.25 39.95C70.28 37.09 70.28 32.2 70.28 28C70.25 20.26 70.24 12.94 75.15 12.08C79.01 11.39 82.36 15.33 85.12 19.3C93.43 31.17 97.51 44.65 96.95 58.31C96.74 63.18 96.03 67.77 92.16 68.46C91.85 68.5 91.57 68.53 91.28 68.53C86.71 68.53 82.78 62.32 78.61 55.77C75.86 51.45 72.6 46.31 69.72 44.54C69.06 44.13 68.11 44.18 67.55 44.66C65.17 46.72 63.42 52.49 61.98 57.32C59.72 64.86 57.57 72 52.52 72C47.47 72 45.32 64.86 43.05 57.31C41.62 52.47 39.88 46.68 37.5 44.64C36.94 44.16 36.01 44.11 35.34 44.5C32.45 46.22 29.16 51.41 26.38 55.78C22.22 62.32 18.28 68.54 13.72 68.54C13.42 68.54 13.16 68.51 12.83 68.46Z" fill="#000000" />
      </g>
      <text x="155" y="112" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="34" fill="#000000" letter-spacing="-1">amptive</text>

      <!-- Event Title -->
      <text x="80" y="210" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="52" fill="#111111" letter-spacing="-2.5" line-height="1.2">
        ${titleTSPans}
      </text>

      <!-- Event Description/Subtitle (smaller text below title) -->
      <text x="80" y="${210 + (titleLines.length * 58) + 15}" font-family="Inter, system-ui, sans-serif" font-weight="500" font-size="20" fill="#666666" letter-spacing="-0.5" line-height="1.5">
        ${descTSPans}
      </text>

      <!-- RSVP / Action Button Graphic -->
      <g transform="translate(80, 480)">
        <rect width="200" height="54" rx="27" fill="url(#btnGrad)" />
        <text x="100" y="33" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="16" fill="#FFFFFF" letter-spacing="1.5">GET TICKETS</text>
      </g>

      <!-- Right Column: Shadow Backing for Card Thumbnail -->
      <rect x="645" y="75" width="480" height="480" rx="36" fill="black" opacity="0.06" filter="blur(15px)" />
      <rect x="650" y="70" width="480" height="480" rx="32" fill="#E2E8F0" />
    </svg>
  `;

  const composites = [];

  // 3. Composite event image if provided
  if (thumbnail) {
    try {
      const imgRes = await fetch(thumbnail);
      if (imgRes.ok) {
        const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
        
        // Round the corners of the thumbnail using dest-in mask
        const imgSize = 480;
        const cornerRadius = 32;
        const maskSvg = `
          <svg width="${imgSize}" height="${imgSize}" viewBox="0 0 ${imgSize} ${imgSize}">
            <rect x="0" y="0" width="${imgSize}" height="${imgSize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white" />
          </svg>
        `;

        const roundedImage = await sharp(imageBuffer)
          .resize(imgSize, imgSize, { fit: 'cover' })
          .composite([{
            input: Buffer.from(maskSvg),
            blend: 'dest-in'
          }])
          .png()
          .toBuffer();

        composites.push({
          input: roundedImage,
          left: 650,
          top: 70
        });
      }
    } catch (err) {
      console.error('Failed to process event thumbnail:', err);
    }
  }

  // 4. Render using Sharp
  try {
    const outputBuffer = await sharp(Buffer.from(baseSvg))
      .composite(composites)
      .png()
      .toBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400' // Cache image for 24 hours
      },
      body: outputBuffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('Sharp rendering error:', err);
    return {
      statusCode: 500,
      body: 'Failed to generate image'
    };
  }
}
