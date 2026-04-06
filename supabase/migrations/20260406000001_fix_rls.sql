-- ============================================================
-- SplitSync: Update RLS for Pending Expenses
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop the old overly restrictive policy
DROP POLICY IF EXISTS "Users can insert own personal expenses" ON public.personal_expenses;

-- Create a new policy that allows a user to insert a personal expense 
-- if it's for themselves OR if it's tied to a group expense and they are in that group
CREATE POLICY "Users can insert own personal expenses or pending ones for group"
  ON public.personal_expenses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR 
    (
      group_id IS NOT NULL AND 
      EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = personal_expenses.group_id 
        AND gm.user_id = auth.uid()
      )
    )
  );
