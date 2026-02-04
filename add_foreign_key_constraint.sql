-- Add foreign key constraint from ticket_purchases to events (if missing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_purchases_event_id_fkey') THEN
        ALTER TABLE public.ticket_purchases 
        ADD CONSTRAINT ticket_purchases_event_id_fkey 
        FOREIGN KEY (event_id) 
        REFERENCES public.events(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint from ticket_purchases to event_tickets (The missing link!)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_purchases_ticket_type_id_fkey') THEN
        ALTER TABLE public.ticket_purchases 
        ADD CONSTRAINT ticket_purchases_ticket_type_id_fkey 
        FOREIGN KEY (ticket_type_id) 
        REFERENCES public.event_tickets(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Reload the schema cache to make Supabase aware of the new relationships
NOTIFY pgrst, 'reload config';
