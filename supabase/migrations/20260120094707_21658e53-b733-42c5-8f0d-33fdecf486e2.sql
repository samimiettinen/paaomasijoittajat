-- Fix infinite recursion by explicitly disabling RLS in the function
-- SECURITY DEFINER + row_security = off ensures the function bypasses RLS completely
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
 SET row_security = off
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
  
  -- Query using fully qualified names
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.admins a ON a.member_id = m.id
    WHERE lower(m.email) = user_email
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, false);
END;
$$;