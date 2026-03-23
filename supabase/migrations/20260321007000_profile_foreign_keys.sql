-- To allow PostgREST to automatically join group_members with profiles 
-- (to fetch member emails without manual RPCs), we need an explicit foreign key.
-- Currently, user_id points to auth.users, but we also want it to map natively to public.profiles.

ALTER TABLE public.group_members 
ADD CONSTRAINT fk_group_members_profile 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Also establish the same convenient lookup on expenses and expense_splits
-- so future UI layers can pull emails instantly.
ALTER TABLE public.expenses
ADD CONSTRAINT fk_expenses_profile
FOREIGN KEY (paid_by)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.expense_splits
ADD CONSTRAINT fk_splits_profile
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;
