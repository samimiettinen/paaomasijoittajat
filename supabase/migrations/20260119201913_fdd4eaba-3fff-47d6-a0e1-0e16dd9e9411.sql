-- Fix case-sensitive email comparison by updating the is_current_user_admin function
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.admins a ON a.member_id = m.id
    WHERE LOWER(m.email) = LOWER(auth.jwt() ->> 'email')
  );
$function$;

-- Also update the is_admin function for consistency
CREATE OR REPLACE FUNCTION public.is_admin(member_phone text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.admins a ON a.member_id = m.id
    WHERE m.mobile_phone = member_phone
  );
$function$;