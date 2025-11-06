-- Add is_approved field to profiles table
ALTER TABLE public.profiles
ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT false;

-- Update handle_new_user function to set is_approved to false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false -- New users are not approved by default
  );
  RETURN NEW;
END;
$$;

-- Allow users to view their own profile (for checking approval status)
-- This is already covered by existing policy, but ensure it includes is_approved

