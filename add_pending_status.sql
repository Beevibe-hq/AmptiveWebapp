-- SQL Script to update the ticket_status check constraint
-- This allows the 'pending' status to be stored in the database.

-- 1. Identify and drop the existing constraint
-- Note: The default name assigned by Postgres is typically 'ticket_purchases_ticket_status_check'
ALTER TABLE ticket_purchases 
DROP CONSTRAINT IF EXISTS ticket_purchases_ticket_status_check;

-- 2. Add the updated constraint with 'pending' included
ALTER TABLE ticket_purchases
ADD CONSTRAINT ticket_purchases_ticket_status_check 
CHECK (ticket_status IN ('valid', 'used', 'cancelled', 'refunded', 'pending'));

-- 3. (Optional) Set any existing ambiguous tickets to 'pending' if needed
-- UPDATE ticket_purchases SET ticket_status = 'pending' WHERE ticket_status IS NULL;
