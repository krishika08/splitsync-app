-- ============================================================
-- SplitSync: Add username column to profiles
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add username column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text;

-- 2. Add unique constraint on username
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_unique'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END $$;

-- 3. Create index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 4. Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 5. Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());
