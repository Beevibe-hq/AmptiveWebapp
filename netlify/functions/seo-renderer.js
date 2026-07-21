// Escape a value for safe insertion into an HTML attribute. Without this, a raw `&`
// (always present in the dynamic og:image query string) or a `"`/`<` in an event title
// produces invalid markup that strict OG parsers (Facebook/WhatsApp/Twitter) reject —
// they then drop the tag and fall back to the site favicon.
function escapeHtmlAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function handler(event, context) {
  const path = event.path;
  const userAgent = (event.headers['user-agent'] || '').toLowerCase();
  
  // Crawler user agents list
  const isCrawler = [
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'slackbot',
    'discordbot',
    'googlebot',
    'telegrambot',
    'whatsapp',
    'vkshare',
    'bingbot',
    'yandexbot'
  ].some(crawler => userAgent.includes(crawler));

  const host = event.headers.host || 'getamptive.com';
  
  // 1. Fetch index.html template from the CDN root
  let htmlTemplate = '';
  try {
    const res = await fetch(`https://${host}/index.html`);
    if (res.ok) {
      htmlTemplate = await res.text();
    }
  } catch (err) {
    console.error('Error fetching template:', err);
  }

  if (!htmlTemplate) {
    return {
      statusCode: 500,
      body: 'Internal Server Error: Unable to fetch index template'
    };
  }

  // If NOT a crawler, simply return the unmodified index.html immediately!
  if (!isCrawler) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: htmlTemplate
    };
  }

  // 2. Crawler detected — parse route parameters and fetch metadata
  let seoTitle = 'Amptive - From Ticket to Tip$ | Create, Stream, Earn';
  let seoDesc = 'More than live audio sessions. Create engaging shows, events, and meetings with built-in ticketing and tipping. Grow your audience and earn from every session.';
  let seoImage = `https://${host}/og-image.png`;
  let seoUrl = `https://${host}${path}`;
  let seoType = 'website';

  const apiBase = 'https://amptive-staging.getamptive.com/api/v1';

  try {
    if (path.startsWith('/events/')) {
      const eventId = path.split('/')[2];
      if (eventId && eventId !== 'create') {
        const res = await fetch(`${apiBase}/events/${eventId}`);
        if (res.ok) {
          const json = await res.json();
          const eventData = json.data || json;
          if (eventData) {
            seoTitle = `${eventData.title} | Amptive`;
            seoDesc = (eventData.description || 'Join this live experience on Amptive.')
              .replace(/<[^>]*>/g, '')
              .slice(0, 150);
            
            const thumb = eventData.thumbnail_url;
            seoImage = `https://${host}/.netlify/functions/og-image?title=${encodeURIComponent(eventData.title)}${thumb ? `&image=${encodeURIComponent(thumb)}` : ''}`;
            seoType = 'event';
          }
        }
      }
    } else if (path.startsWith('/blog/')) {
      const slug = path.split('/')[2];
      if (slug) {
        const res = await fetch(`${apiBase}/blog/${encodeURIComponent(slug)}`);
        if (res.ok) {
          const json = await res.json();
          const postData = json.data || json;
          if (postData) {
            seoTitle = `${postData.title} | Amptive`;
            seoDesc = (postData.excerpt || postData.content || 'Read this post on Amptive.')
              .replace(/<[^>]*>/g, '')
              .slice(0, 150);
            
            const featImg = postData.featured_image_url;
            seoImage = `https://${host}/.netlify/functions/og-image?title=${encodeURIComponent(postData.title)}${featImg ? `&image=${encodeURIComponent(featImg)}` : ''}`;
            seoType = 'article';
          }
        }
      }
    } else if (path.startsWith('/support/')) {
      const slug = path.split('/')[2];
      if (slug) {
        const res = await fetch(`${apiBase}/support/${encodeURIComponent(slug)}`);
        if (res.ok) {
          const json = await res.json();
          const profileData = json.data || json;
          if (profileData) {
            const displayName = profileData.full_name || profileData.username || 'Creator';
            seoTitle = `${displayName} | Amptive`;
            seoDesc = (profileData.support_message || profileData.support_tagline || 'Support my creative work on Amptive.');
            
            const avatar = profileData.support_avatar_url || profileData.avatar_url;
            seoImage = `https://${host}/.netlify/functions/og-image?title=${encodeURIComponent(displayName)}${avatar ? `&image=${encodeURIComponent(avatar)}` : ''}`;
            seoType = 'profile';
          }
        }
      }
    }
  } catch (err) {
    console.error('Error fetching dynamic seo data:', err);
  }

  // 3. Inject the dynamic meta tags into the index.html template.
  // All values are HTML-attribute-escaped so a raw `&`/`"`/`<` can't corrupt the markup.
  let renderedHtml = htmlTemplate;

  const titleAttr = escapeHtmlAttr(seoTitle);
  const descAttr = escapeHtmlAttr(seoDesc);
  const imageAttr = escapeHtmlAttr(seoImage);
  const urlAttr = escapeHtmlAttr(seoUrl);
  const typeAttr = escapeHtmlAttr(seoType);

  // Replace Title
  renderedHtml = renderedHtml.replace(/<title>.*?<\/title>/gi, `<title>${titleAttr}</title>`);
  renderedHtml = renderedHtml.replace(/<meta property="og:title" content=".*?" \/>/gi, `<meta property="og:title" content="${titleAttr}" />`);
  renderedHtml = renderedHtml.replace(/<meta name="twitter:title" content=".*?" \/>/gi, `<meta name="twitter:title" content="${titleAttr}" />`);

  // Replace Description
  renderedHtml = renderedHtml.replace(/<meta name="description" content=".*?" \/>/gi, `<meta name="description" content="${descAttr}" />`);
  renderedHtml = renderedHtml.replace(/<meta property="og:description" content=".*?" \/>/gi, `<meta property="og:description" content="${descAttr}" />`);
  renderedHtml = renderedHtml.replace(/<meta name="twitter:description" content=".*?" \/>/gi, `<meta name="twitter:description" content="${descAttr}" />`);

  // Replace Image — and append dimension/type hints that WhatsApp and others need to
  // render the large_image card reliably. The dynamic og-image function always emits a
  // 1200x630 PNG, and the static fallback uses the same standard size.
  const ogImageBlock =
    `<meta property="og:image" content="${imageAttr}" />` +
    `\n    <meta property="og:image:secure_url" content="${imageAttr}" />` +
    `\n    <meta property="og:image:type" content="image/png" />` +
    `\n    <meta property="og:image:width" content="1200" />` +
    `\n    <meta property="og:image:height" content="630" />` +
    `\n    <meta property="og:image:alt" content="${titleAttr}" />`;
  renderedHtml = renderedHtml.replace(/<meta property="og:image" content=".*?" \/>/gi, ogImageBlock);
  renderedHtml = renderedHtml.replace(/<meta name="twitter:image" content=".*?" \/>/gi, `<meta name="twitter:image" content="${imageAttr}" />`);

  // Replace URL
  renderedHtml = renderedHtml.replace(/<meta property="og:url" content=".*?" \/>/gi, `<meta property="og:url" content="${urlAttr}" />`);
  renderedHtml = renderedHtml.replace(/<link rel="canonical" href=".*?" \/>/gi, `<link rel="canonical" href="${urlAttr}" />`);

  // Replace Type
  renderedHtml = renderedHtml.replace(/<meta property="og:type" content=".*?" \/>/gi, `<meta property="og:type" content="${typeAttr}" />`);

  // Replace Hidden H1
  renderedHtml = renderedHtml.replace(/<h1 style=".*?">.*?<\/h1>/gi, `<h1 style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;">${titleAttr}</h1>`);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=60, s-maxage=600'
    },
    body: renderedHtml
  };
}
