-- Add per-user WhatsApp credentials to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_token TEXT;

-- Add creator to sessions to resolve which user's WhatsApp creds to use
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add WhatsApp reminder config and status to sessions
DO $$ BEGIN
  CREATE TYPE whatsapp_reminder_status AS ENUM ('NONE','PENDING','SENT','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS whatsapp_reminder_options TEXT, -- e.g. 'NONE','5','15','30','30_5'
ADD COLUMN IF NOT EXISTS whatsapp_notification_status whatsapp_reminder_status DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS whatsapp_last_error TEXT;

-- Helpful index for reminder jobs by scheduled time
CREATE INDEX IF NOT EXISTS idx_reminder_jobs_scheduled_for ON public.reminder_jobs (scheduled_for);

