-- Fix infinite recursion by making the function bypass RLS properly
-- The function already has SECURITY DEFINER, but we need to ensure it uses the function owner's privileges

-- Drop and recreate the function to ensure proper execution context
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
DECLARE
  user_email text;
  is_admin boolean;
BEGIN
  -- Get user email from JWT
  user_email := lower(auth.jwt() ->> 'email');
  
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  -- Query using fully qualified names to avoid search_path issues
  -- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.admins a ON a.member_id = m.id
    WHERE lower(m.email) = user_email
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, false);
END;
$$;