-- Create the settlements table to track exact debts between users in a group
CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  payer_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- Indexing for rapid dashboard discovery
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON public.settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payer_id ON public.settlements(payer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_receiver_id ON public.settlements(receiver_id);

-- Enable RLS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Apply pure bulletproof RLS (using our fast bypass function from earlier)
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
      and c.relname = 'settlements'
  loop
    execute format('drop policy if exists %I on public.settlements', p.polname);
  end loop;
end $$;

-- Policies mirror exactly those we originally defined before discovering the table was missing
create policy "Allow settlements read" on public.settlements for select to authenticated
using (public.is_group_member_fast(settlements.group_id, auth.uid()));

create policy "Allow settlements insert" on public.settlements for insert to authenticated
with check (public.is_group_member_fast(settlements.group_id, auth.uid()));

create policy "Allow settlements delete" on public.settlements for delete to authenticated
using (public.is_group_member_fast(settlements.group_id, auth.uid()));
