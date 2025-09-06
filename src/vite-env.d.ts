/// <reference types="vite/client" />

// Add type declarations for module aliases
declare module '@/components/*';
declare module '@/lib/*';
declare module '@/contexts/*';

// Add type declarations for environment variables
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
