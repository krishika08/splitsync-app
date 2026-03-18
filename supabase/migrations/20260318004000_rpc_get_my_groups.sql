-- Fix: PostgREST embed ambiguity between groups and group_members
-- Provide a stable RPC for "my groups" without embedded relationships.

create or replace function public.get_my_groups()
returns table (
  id uuid,
  name text,
  created_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    g.id,
    g.name,
    g.created_at
  from public.groups g
  join public.group_members gm
    on gm.group_id = g.id
  where gm.user_id = auth.uid()
  order by g.created_at desc;
$$;

