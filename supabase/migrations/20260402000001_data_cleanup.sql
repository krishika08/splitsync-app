-- ============================================================
-- SplitSync: WIPE ALL DATA (Early-stage reset)
-- Run this in the Supabase SQL Editor BEFORE the username migration
-- ⚠️ THIS IS IRREVERSIBLE - deletes all app data
-- ============================================================

-- Delete in FK-safe order
DELETE FROM public.expense_splits;
DELETE FROM public.settlements;
DELETE FROM public.expenses;
DELETE FROM public.group_members;
DELETE FROM public.groups;
DELETE FROM public.profiles;

-- To also delete auth users, go to:
-- Supabase Dashboard → Authentication → Users → Delete each user
-- Then re-sign-up with the new username flow.
