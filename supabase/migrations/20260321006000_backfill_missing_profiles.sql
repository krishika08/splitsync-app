-- Backfill all existing Supabase Authentication users into the public.profiles table.
-- If someone signed up BEFORE the app implemented the profiles table logic,
-- they will be permanently invisible when looking them up via email.

INSERT INTO public.profiles (id, email)
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
