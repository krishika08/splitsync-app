-- Wipe all policies for groups, group_members, expenses, expense_splits
do $$
declare
  p record;
begin
  for p in
    select polname, relname
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('groups', 'group_members', 'expenses', 'expense_splits')
  loop
    execute format('drop policy if exists %I on public.%I', p.polname, p.relname);
  end loop;
end $$;


-- 2) GROUPS Policies
create policy "Allow group read" on public.groups for select to authenticated
using (groups.created_by = auth.uid() or public.is_group_member_fast(groups.id, auth.uid()));

create policy "Allow group create" on public.groups for insert to authenticated
with check (groups.created_by = auth.uid());

create policy "Allow group update" on public.groups for update to authenticated
using (groups.created_by = auth.uid());

create policy "Allow group delete" on public.groups for delete to authenticated
using (groups.created_by = auth.uid());


-- 3) GROUP MEMBERS Policies
create policy "Allow group member read" on public.group_members for select to authenticated
using (group_members.user_id = auth.uid() or public.is_group_member_fast(group_members.group_id, auth.uid()) or public.is_group_creator_fast(group_members.group_id, auth.uid()));

create policy "Allow group member insert" on public.group_members for insert to authenticated
with check (group_members.user_id = auth.uid() or public.is_group_creator_fast(group_members.group_id, auth.uid()));

create policy "Allow group member delete" on public.group_members for delete to authenticated
using (group_members.user_id = auth.uid() or public.is_group_creator_fast(group_members.group_id, auth.uid()));


-- 4) EXPENSES Policies
create policy "Allow group expense read" on public.expenses for select to authenticated
using (public.is_group_member_fast(expenses.group_id, auth.uid()));

create policy "Allow group expense insert" on public.expenses for insert to authenticated
with check (public.is_group_member_fast(expenses.group_id, auth.uid()) and expenses.paid_by = auth.uid());

create policy "Allow group expense update" on public.expenses for update to authenticated
using (public.is_group_member_fast(expenses.group_id, auth.uid()) and expenses.paid_by = auth.uid());

create policy "Allow group expense delete" on public.expenses for delete to authenticated
using (public.is_group_member_fast(expenses.group_id, auth.uid()) and expenses.paid_by = auth.uid());


-- 5) EXPENSE SPLITS Policies
create policy "Allow expense split read" on public.expense_splits for select to authenticated
using (
  exists (
    select 1 from public.expenses e 
    where e.id = expense_splits.expense_id and public.is_group_member_fast(e.group_id, auth.uid())
  )
);

create policy "Allow expense split insert" on public.expense_splits for insert to authenticated
with check (
  exists (
    select 1 from public.expenses e 
    where e.id = expense_splits.expense_id and public.is_group_member_fast(e.group_id, auth.uid()) and e.paid_by = auth.uid()
  )
);
