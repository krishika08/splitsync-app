-- Fix infinite recursion on group_members SELECT policy
-- Root cause: The policy checked "group_id in (select group_id from group_members...)", which recursively triggers itself.
-- Solution: Use the existing SECURITY DEFINER function `is_group_member` which runs with row_security=off.

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

-- Allow members to see other members of the same group securely without recursion
create policy "Allow group members to view other group members"
on public.group_members
for select
to authenticated
using (
  user_id = auth.uid() OR
  public.is_group_member(group_members.group_id, auth.uid())
);

-- Basic INSERT, UPDATE, DELETE policies mapped previously
create policy "group_members_insert_creator_or_self"
on public.group_members
for insert
to authenticated
with check (
  user_id = auth.uid() OR
  public.is_group_creator(group_members.group_id)
);

create policy "group_members_delete_creator_or_self"
on public.group_members
for delete
to authenticated
using (
  user_id = auth.uid() OR
  public.is_group_creator(group_members.group_id)
);
