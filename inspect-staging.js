import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gjkvrllwtjktcarnikus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqa3ZybGx3dGprdGNhcm5pa3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzOTA4NiwiZXhwIjoyMDcyNDE1MDg2fQ.MUGVlgjCx9MgEZiocQ43XxIackEl6GQFExUwUgnExbM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const API_BASE = 'https://amptive-staging.getamptive.com/api/v1';

async function run() {
  const email = 'jachilonu195@gmail.com';
  const userId = '8225558c-0451-4e3e-933f-0bfe5a373019';
  const tempPassword = 'TempPassword123!';

  console.log(`Updating password for ${email} (${userId})...`);
  try {
    const { data: user, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return;
    }

    console.log('Password updated successfully. Logging in via staging API...');
    
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: tempPassword }),
    });

    console.log('Login response status:', loginRes.status);
    const loginJson = await loginRes.json();
    
    const token = loginJson.data?.access_token || loginJson.access_token;
    if (!token) {
      console.error('Failed to login. Response:', JSON.stringify(loginJson, null, 2));
      return;
    }

    console.log('Login success! Access token obtained. Querying /tickets/me...');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const mineRes = await fetch(`${API_BASE}/tickets/me`, { headers });
    console.log('Mine response status:', mineRes.status);
    const mineJson = await mineRes.json();

    console.log('Full JSON response of /tickets/me:');
    console.log(JSON.stringify(mineJson, null, 2));

  } catch (err) {
    console.error('Exception:', err);
  }
}

run();
