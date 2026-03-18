-- SplitSync: groups, members, expenses + FKs + RLS
-- Safe to re-run: uses IF NOT EXISTS / duplicate guards where needed.

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  paid_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Constraints / Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Prevent duplicate membership rows
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where c.conname = 'group_members_group_id_user_id_key'
      and n.nspname = 'public'
  ) then
    alter table public.group_members
      add constraint group_members_group_id_user_id_key unique (group_id, user_id);
  end if;
end $$;

create index if not exists idx_group_members_user_id on public.group_members(user_id);
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_groups_created_by on public.groups(created_by);
create index if not exists idx_expenses_group_id on public.expenses(group_id);
create index if not exists idx_expenses_paid_by on public.expenses(paid_by);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Policies: groups
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  create policy "groups_select_member_or_creator"
  on public.groups
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = groups.id
        and gm.user_id = auth.uid()
    )
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "groups_insert_creator_only"
  on public.groups
  for insert
  to authenticated
  with check (created_by = auth.uid());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "groups_update_creator_only"
  on public.groups
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "groups_delete_creator_only"
  on public.groups
  for delete
  to authenticated
  using (created_by = auth.uid());
exception
  when duplicate_object then null;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Policies: group_members
-- ─────────────────────────────────────────────────────────────────────────────

-- Members can see memberships for groups they belong to
do $$
begin
  create policy "group_members_select_group_member"
  on public.group_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.group_members gm2
      where gm2.group_id = group_members.group_id
        and gm2.user_id = auth.uid()
    )
  );
exception
  when duplicate_object then null;
end $$;

-- Creator can add anyone; users can add themselves (used by createGroup flow)
do $$
begin
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
exception
  when duplicate_object then null;
end $$;

-- Creator can remove anyone; users can remove themselves
do $$
begin
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
exception
  when duplicate_object then null;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Policies: expenses
-- ─────────────────────────────────────────────────────────────────────────────

-- Members of a group can view its expenses
do $$
begin
  create policy "expenses_select_group_member"
  on public.expenses
  for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = auth.uid()
    )
  );
exception
  when duplicate_object then null;
end $$;

-- Members can insert expenses, but `paid_by` must be the current user
do $$
begin
  create policy "expenses_insert_member_paid_by_self"
  on public.expenses
  for insert
  to authenticated
  with check (
    paid_by = auth.uid()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = auth.uid()
    )
  );
exception
  when duplicate_object then null;
end $$;

-- Only group members can update/delete expenses (tighten later as needed)
do $$
begin
  create policy "expenses_update_group_member"
  on public.expenses
  for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = auth.uid()
    )
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "expenses_delete_group_member"
  on public.expenses
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = auth.uid()
    )
  );
exception
  when duplicate_object then null;
end $$;

