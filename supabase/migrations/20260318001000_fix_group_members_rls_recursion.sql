-- Fix: infinite recursion in RLS policy for public.group_members
-- Root cause: a policy on group_members queried group_members, triggering recursion.

-- Helper function to check membership without RLS recursion.
-- Runs as definer and disables row_security for the duration of the call.
create or replace function public.is_group_member(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.group_members gm
    where gm.group_id = _group_id
      and gm.user_id = auth.uid()
  );
$$;

-- Recreate policies on group_members without self-references.
drop policy if exists "group_members_select_group_member" on public.group_members;
drop policy if exists "group_members_insert_creator_or_self" on public.group_members;
drop policy if exists "group_members_delete_creator_or_self" on public.group_members;

-- Members (or the group creator) can see membership rows for that group.
create policy "group_members_select_group_member"
on public.group_members
for select
to authenticated
using (
  public.is_group_member(group_members.group_id)
  or exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and g.created_by = auth.uid()
  )
);

-- Creator can add anyone; users can add themselves (used by createGroup flow)
create policy "group_members_insert_creator_or_self"
on public.group_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.groups g
    where g.id = group_members.group_id
      and g.created_by = auth.uid()
  )
);

-- Creator can remove anyone; users can remove themselves
create policy "group_members_delete_creator_or_self"
on public.group_members
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.groups g
    where g.id = group_members.group_id
      and g.created_by = auth.uid()
  )
);

