-- Allow ANY existing group member to invite a new group member
-- Previously, only the group creator could invite people.

drop policy if exists "Allow group member insert" on public.group_members;
create policy "Allow group member insert" on public.group_members for insert to authenticated
with check (
  group_members.user_id = auth.uid() 
  or public.is_group_member_fast(group_members.group_id, auth.uid())
);

-- Allow ANY existing group member to remove someone (Splitwise default behavior usually)
drop policy if exists "Allow group member delete" on public.group_members;
create policy "Allow group member delete" on public.group_members for delete to authenticated
using (
  group_members.user_id = auth.uid() 
  or public.is_group_member_fast(group_members.group_id, auth.uid())
);
