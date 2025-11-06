-- Add language preference and Zoom integration fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN language TEXT NOT NULL DEFAULT 'en',
ADD COLUMN zoom_api_key TEXT,
ADD COLUMN zoom_api_secret TEXT,
ADD COLUMN zoom_account_id TEXT;

-- Add constraint to ensure language is one of the supported languages
ALTER TABLE public.profiles
ADD CONSTRAINT valid_language CHECK (language IN ('en', 'ar', 'fr'));

