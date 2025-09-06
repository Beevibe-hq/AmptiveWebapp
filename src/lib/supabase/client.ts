import { createBrowserClient } from '@supabase/ssr';

// Use Vite's import.meta.env for client-side environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey);
