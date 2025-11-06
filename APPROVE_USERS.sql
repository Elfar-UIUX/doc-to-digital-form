-- How to Approve Users in Supabase
-- Run these SQL queries in Supabase Dashboard → SQL Editor

-- 1. View all pending users (not approved)
SELECT 
  id,
  email,
  full_name,
  is_approved,
  created_at
FROM public.profiles
WHERE is_approved = false
ORDER BY created_at DESC;

-- 2. Approve a specific user by email
UPDATE public.profiles
SET is_approved = true
WHERE email = 'user@example.com';

-- 3. Approve a specific user by ID
UPDATE public.profiles
SET is_approved = true
WHERE id = 'user-uuid-here';

-- 4. Approve all pending users (use with caution!)
UPDATE public.profiles
SET is_approved = true
WHERE is_approved = false;

-- 5. Reject/Unapprove a user (if needed)
UPDATE public.profiles
SET is_approved = false
WHERE email = 'user@example.com';

