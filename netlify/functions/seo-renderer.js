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
            if (eventData.thumbnail_url) {
              seoImage = eventData.thumbnail_url;
            }
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
            if (postData.featured_image_url) {
              seoImage = postData.featured_image_url;
            }
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
            seoTitle = `${profileData.full_name || profileData.username || 'Creator'} | Amptive`;
            seoDesc = (profileData.support_message || profileData.support_tagline || 'Support my creative work on Amptive.');
            if (profileData.support_avatar_url || profileData.avatar_url) {
              seoImage = profileData.support_avatar_url || profileData.avatar_url;
            }
            seoType = 'profile';
          }
        }
      }
    }
  } catch (err) {
    console.error('Error fetching dynamic seo data:', err);
  }

  // 3. Inject the dynamic meta tags into the index.html template
  let renderedHtml = htmlTemplate;

  // Replace Title
  renderedHtml = renderedHtml.replace(/<title>.*?<\/title>/gi, `<title>${seoTitle}</title>`);
  renderedHtml = renderedHtml.replace(/<meta property="og:title" content=".*?" \/>/gi, `<meta property="og:title" content="${seoTitle}" />`);
  renderedHtml = renderedHtml.replace(/<meta name="twitter:title" content=".*?" \/>/gi, `<meta name="twitter:title" content="${seoTitle}" />`);

  // Replace Description
  renderedHtml = renderedHtml.replace(/<meta name="description" content=".*?" \/>/gi, `<meta name="description" content="${seoDesc}" />`);
  renderedHtml = renderedHtml.replace(/<meta property="og:description" content=".*?" \/>/gi, `<meta property="og:description" content="${seoDesc}" />`);
  renderedHtml = renderedHtml.replace(/<meta name="twitter:description" content=".*?" \/>/gi, `<meta name="twitter:description" content="${seoDesc}" />`);

  // Replace Image
  renderedHtml = renderedHtml.replace(/<meta property="og:image" content=".*?" \/>/gi, `<meta property="og:image" content="${seoImage}" />`);
  renderedHtml = renderedHtml.replace(/<meta name="twitter:image" content=".*?" \/>/gi, `<meta name="twitter:image" content="${seoImage}" />`);

  // Replace URL
  renderedHtml = renderedHtml.replace(/<meta property="og:url" content=".*?" \/>/gi, `<meta property="og:url" content="${seoUrl}" />`);
  renderedHtml = renderedHtml.replace(/<link rel="canonical" href=".*?" \/>/gi, `<link rel="canonical" href="${seoUrl}" />`);

  // Replace Type
  renderedHtml = renderedHtml.replace(/<meta property="og:type" content=".*?" \/>/gi, `<meta property="og:type" content="${seoType}" />`);

  // Replace Hidden H1
  renderedHtml = renderedHtml.replace(/<h1 style=".*?">.*?<\/h1>/gi, `<h1 style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;">${seoTitle}</h1>`);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=60, s-maxage=600'
    },
    body: renderedHtml
  };
}
