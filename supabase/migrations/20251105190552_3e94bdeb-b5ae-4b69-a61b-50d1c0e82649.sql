-- Fix get_student_balance function search_path security issue
-- Convert to plpgsql to properly set search_path
CREATE OR REPLACE FUNCTION public.get_student_balance(student_uuid UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  balance DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO balance
  FROM public.ledger_entries
  WHERE student_id = student_uuid;
  
  RETURN balance;
END;
$$;