-- Enable RLS on the table (in case it wasn't enabled or policies were missing)
ALTER TABLE public.ticket_purchases ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own purchases
-- Dropping existing policy if it exists to avoid conflicts or duplicates if a partial apply happened
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.ticket_purchases;

CREATE POLICY "Users can insert their own purchases"
ON public.ticket_purchases
FOR INSERT
WITH CHECK (
  auth.uid() = buyer_id
);

-- Allow users to view their own purchases
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.ticket_purchases;

CREATE POLICY "Users can view their own purchases"
ON public.ticket_purchases
FOR SELECT
USING (
  auth.uid() = buyer_id
);

-- Reload config to apply immediately
NOTIFY pgrst, 'reload config';
