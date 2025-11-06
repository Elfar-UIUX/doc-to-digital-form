-- Add image_url field to ledger_entries table
ALTER TABLE public.ledger_entries
ADD COLUMN image_url TEXT;


