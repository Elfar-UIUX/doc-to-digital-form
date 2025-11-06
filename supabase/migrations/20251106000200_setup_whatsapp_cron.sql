-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Note: Cron job setup must be done manually via SQL Editor or Dashboard
-- Run this SQL after deploying the function:
-- 
-- SELECT cron.schedule(
--   'send-whatsapp-reminders',
--   '*/5 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://fhctcakemcchymjmeuie.supabase.co/functions/v1/send-whatsapp-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

