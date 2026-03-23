-- 20260320000000_group_members_rpc.sql

-- Function to get user id by email securely
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(search_email text)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  found_user_id uuid;
BEGIN
  SELECT id INTO found_user_id 
  FROM auth.users 
  WHERE email = search_email;
  
  RETURN found_user_id;
END;
$$;

-- Function to get group members with email details securely
CREATE OR REPLACE FUNCTION public.get_group_members_details(p_group_id uuid)
RETURNS TABLE (
  member_id uuid,
  user_id uuid,
  email text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id as member_id,
    gm.user_id,
    u.email::text as email,
    gm.created_at
  FROM public.group_members gm
  JOIN auth.users u ON gm.user_id = u.id
  WHERE gm.group_id = p_group_id
  ORDER BY gm.created_at ASC;
END;
$$;
