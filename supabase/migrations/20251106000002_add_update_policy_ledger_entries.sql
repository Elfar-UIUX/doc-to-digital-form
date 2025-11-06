-- Add UPDATE policy for ledger_entries table
-- This allows any authenticated user (teacher) to update any ledger entry
-- If you want to restrict to only entries created by the user, use:
-- USING (created_by = auth.uid() OR created_by IS NULL)
CREATE POLICY "Teachers can update ledger entries"
  ON public.ledger_entries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

