-- Force non-recursive RLS policies for public.group_members
-- Some Postgres setups still detect recursion when a policy uses helper functions
-- that query the same table. This version avoids any self-reference entirely.

alter table public.group_members enable row level security;

-- Drop any existing policies on group_members (including older names).
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

-- SELECT:
-- - Users can always see their own membership rows
-- - Group creator can see all membership rows in their groups
-- Note: regular members will NOT see other members with this policy (by design),
-- but it avoids recursion and still supports membership checks via EXISTS queries.
create policy "group_members_select_self_or_creator"
on public.group_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and g.created_by = auth.uid()
  )
);

-- INSERT:
-- - Users can insert themselves into a group (needed for createGroup flow)
-- - Group creator can add anyone
create policy "group_members_insert_creator_or_self"
on public.group_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and g.created_by = auth.uid()
  )
);

-- DELETE:
-- - Users can remove themselves
-- - Group creator can remove anyone
create policy "group_members_delete_creator_or_self"
on public.group_members
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and g.created_by = auth.uid()
  )
);

