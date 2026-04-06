-- ============================================================
-- SplitSync: Pending Expenses Migrations
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.personal_expenses 
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false;

ALTER TABLE public.personal_expenses 
ADD COLUMN IF NOT EXISTS group_expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE;

ALTER TABLE public.personal_expenses 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.personal_expenses 
ADD COLUMN IF NOT EXISTS group_bill_details JSONB;

-- Allow updating the new columns (RLS policy already covers UPDATE based on user_id, but let's make sure)
-- (Existing policies usually apply to all fields)
