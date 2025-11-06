-- Fix UPDATE policy for ledger_entries table
-- Run this SQL in Supabase Dashboard → SQL Editor

-- First, drop the existing policy if it exists (in case it was created incorrectly)
DROP POLICY IF EXISTS "Teachers can update ledger entries" ON public.ledger_entries;

-- Create the UPDATE policy with both USING and WITH CHECK clauses
-- This allows authenticated users to update any ledger entry
CREATE POLICY "Teachers can update ledger entries"
  ON public.ledger_entries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify the policy was created
SELECT * FROM pg_policies 
WHERE tablename = 'ledger_entries' 
AND policyname = 'Teachers can update ledger entries';

