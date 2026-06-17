import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gjkvrllwtjktcarnikus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqa3ZybGx3dGprdGNhcm5pa3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzOTA4NiwiZXhwIjoyMDcyNDE1MDg2fQ.MUGVlgjCx9MgEZiocQ43XxIackEl6GQFExUwUgnExbM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Querying profiles in database...');
  try {
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);

    if (pError) {
      console.error('Error fetching profiles:', pError);
    } else {
      console.log('Sample profiles keys:', Object.keys(profiles[0] || {}));
      console.log('Sample profiles:', JSON.stringify(profiles, null, 2));
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

run();
