-- Add latitude and longitude columns if they don't exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Reload the schema cache to ensure Supabase picks up the changes immediately
NOTIFY pgrst, 'reload config';
