-- Add type column to groups
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'group' CHECK (type IN ('group', 'individual'));

-- Drop the function first because its return signature is changing
DROP FUNCTION IF EXISTS public.get_my_groups();

-- Update get_my_groups to return the type column
CREATE OR REPLACE FUNCTION public.get_my_groups()
RETURNS table (
  id uuid,
  name text,
  type text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    g.id,
    g.name,
    g.type,
    g.created_at
  FROM public.groups g
  JOIN public.group_members gm
    ON gm.group_id = g.id
  WHERE gm.user_id = auth.uid()
  ORDER BY g.created_at DESC;
$$;
