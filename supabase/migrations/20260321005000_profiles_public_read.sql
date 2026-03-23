-- Allow any authenticated user to read from the profiles table
-- This is strictly necessary to allow finding users by their email when adding them to groups.

-- First ensure RLS is enabled on profiles (if it already is, this is a no-op)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop previous select policy if it restricted reads
drop policy if exists "Allow public read access to profiles" on public.profiles;
drop policy if exists "Allow authenticated user to read profiles" on public.profiles;
drop policy if exists "profiles_read_policy" on public.profiles;
drop policy if exists "Enable read access for all users" on public.profiles;

-- Create blanket select policy for authenticated users
create policy "Enable read access for all users"
on public.profiles
for select
to authenticated
using (true);
