-- Fix: infinite recursion between RLS policies on public.groups and public.group_members
-- Root cause: groups policy queried group_members, while group_members policy queried groups.
-- Solution: use SECURITY DEFINER helper functions with row_security=off, and recreate policies
-- so that policies do not query each other’s tables directly.

-- Helper: is the current user the creator of the group?
create or replace function public.is_group_creator(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.groups g
    where g.id = _group_id
      and g.created_by = auth.uid()
  );
$$;

-- Helper: is the given user a member of the group?
create or replace function public.is_group_member(_group_id uuid, _user_id uuid)
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
      and gm.user_id = _user_id
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Recreate groups policies (no direct query to group_members)
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  p record;
begin
  for p in
    select polname
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'groups'
  loop
    execute format('drop policy if exists %I on public.groups', p.polname);
  end loop;
end $$;

create policy "groups_select_member_or_creator"
on public.groups
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_group_member(groups.id, auth.uid())
);

create policy "groups_insert_creator_only"
on public.groups
for insert
to authenticated
with check (created_by = auth.uid());

create policy "groups_update_creator_only"
on public.groups
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "groups_delete_creator_only"
on public.groups
for delete
to authenticated
using (created_by = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Recreate group_members policies to avoid querying groups directly
-- (use helper is_group_creator instead)
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  p record;
begin
  for p in
    select polname
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'group_members'
  loop
    execute format('drop policy if exists %I on public.group_members', p.polname);
  end loop;
end $$;

create policy "group_members_select_self_or_creator"
on public.group_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_group_creator(group_members.group_id)
);

create policy "group_members_insert_creator_or_self"
on public.group_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_group_creator(group_members.group_id)
);

create policy "group_members_delete_creator_or_self"
on public.group_members
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_group_creator(group_members.group_id)
);

