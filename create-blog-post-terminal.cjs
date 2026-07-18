const readline = require('readline');

const API_BASE = 'https://amptive-staging.getamptive.com/api/v1';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('==============================================');
  console.log('      Amptive Blog Post Creator Script        ');
  console.log('==============================================\n');

  let token = '';

  const authChoice = await question('Do you want to authenticate using:\n1. Email & Password\n2. Existing Auth Token\nChoose (1 or 2): ');

  if (authChoice.trim() === '2') {
    token = await question('\nPaste your Auth Token: ');
    token = token.trim();
  } else {
    const email = await question('\nEnter your email: ');
    const password = await question('Enter your password: ');
    
    console.log('\nLogging in...');
    try {
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });
      
      const loginJson = await loginRes.json();
      if (!loginRes.ok) {
        console.error('Login failed:', loginJson.message || JSON.stringify(loginJson));
        rl.close();
        return;
      }
      token = (loginJson.data || loginJson).access_token;
      console.log('Logged in successfully!');
    } catch (e) {
      console.error('Login request failed:', e.message);
      rl.close();
      return;
    }
  }

  if (!token) {
    console.error('No token provided or obtained. Exiting.');
    rl.close();
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('\n--- Post Details ---');
  const title = await question('Enter Post Title: ');
  const excerpt = await question('Enter Excerpt/Summary: ');
  const content = await question('Enter Content/Body: ');
  const image = await question('Enter Featured Image URL (or press Enter for default): ');
  
  const imageUrl = image.trim() || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97';

  console.log('\nCreating post draft on backend...');
  try {
    const createRes = await fetch(`${API_BASE}/blog`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim(),
        featured_image_url: imageUrl,
        seo_title: title.trim(),
        seo_description: excerpt.trim()
      })
    });

    const createJson = await createRes.json();
    if (!createRes.ok) {
      console.error('Failed to create post:', createJson.message || JSON.stringify(createJson));
      rl.close();
      return;
    }

    const post = createJson.data || createJson;
    const postId = post.id || post.post_id;
    console.log(`Draft created successfully! Post ID: ${postId}`);

    // Publish the post
    console.log('\nPublishing post...');
    const publishRes = await fetch(`${API_BASE}/blog/manage/${postId}/publish`, {
      method: 'PATCH',
      headers
    });

    const publishJson = await publishRes.json();
    if (!publishRes.ok) {
      console.error('Failed to publish post:', publishJson.message || JSON.stringify(publishJson));
    } else {
      console.log('\n==============================================');
      console.log('🎉 Post created and published successfully!');
      console.log(`URL Slug: ${post.slug || 'N/A'}`);
      console.log('==============================================');
    }
  } catch (e) {
    console.error('Request failed:', e.message);
  }

  rl.close();
}

main();
