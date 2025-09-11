import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Use Vite's import.meta.env for client-side environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

let _client: SupabaseClient | null = null;

// One-time cleanup: remove any old Supabase cookies (from @supabase/ssr) to avoid 431 issues
function cleanupOldSupabaseCookies() {
  if (typeof document === 'undefined') return;
  const cookieNames = document.cookie.split(';').map(c => c.split('=')[0].trim());
  cookieNames
    .filter(name => name.toLowerCase().startsWith('sb-'))
    .forEach(name => {
      // Expire cookie on current domain
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
}

export const createClient = () => {
  if (_client) return _client;
  
  if (typeof window !== 'undefined') {
    cleanupOldSupabaseCookies();
  }

  _client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => {
          const item = localStorage.getItem(key);
          console.log('Getting item:', key, item);
          return item;
        },
        setItem: (key, value) => {
          console.log('Setting item:', key, value);
          localStorage.setItem(key, value);
        },
        removeItem: (key) => {
          console.log('Removing item:', key);
          localStorage.removeItem(key);
        }
      },
      storageKey: 'amptive.auth',
    },
  });

  _client.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
  });

  return _client;
};
