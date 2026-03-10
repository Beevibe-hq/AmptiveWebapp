-- Set all existing events with no status or 'draft' status to 'published'
UPDATE events 
SET status = 'published' 
WHERE status = 'draft' OR status IS NULL;
