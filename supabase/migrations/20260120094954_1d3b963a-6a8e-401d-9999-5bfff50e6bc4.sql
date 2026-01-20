-- Create a helper function to get current user's member_id bypassing RLS
CREATE OR REPLACE FUNCTION public.get_current_user_member_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  user_email text;
  member_uuid uuid;
BEGIN
  user_email := lower(auth.jwt() ->> 'email');
  
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO member_uuid
  FROM public.members
  WHERE lower(email) = user_email
  LIMIT 1;
  
  RETURN member_uuid;
END;
$$;

-- Now update the RLS policies to use this function instead of subqueries

-- Fix "Users can read own member" policy
DROP POLICY IF EXISTS "Users can read own member" ON public.members;
CREATE POLICY "Users can read own member" 
ON public.members 
FOR SELECT 
USING (id = public.get_current_user_member_id());

-- Fix "Users can update own member" policy
DROP POLICY IF EXISTS "Users can update own member" ON public.members;
CREATE POLICY "Users can update own member" 
ON public.members 
FOR UPDATE 
USING (id = public.get_current_user_member_id());

-- Fix "Users can read own participation" policy on event_participants
DROP POLICY IF EXISTS "Users can read own participation" ON public.event_participants;
CREATE POLICY "Users can read own participation" 
ON public.event_participants 
FOR SELECT 
USING (member_id = public.get_current_user_member_id());

-- Fix "Users can update own participation" policy on event_participants
DROP POLICY IF EXISTS "Users can update own participation" ON public.event_participants;
CREATE POLICY "Users can update own participation" 
ON public.event_participants 
FOR UPDATE 
USING (member_id = public.get_current_user_member_id());

-- Fix "Users can read invited events" policy on events
DROP POLICY IF EXISTS "Users can read invited events" ON public.events;
CREATE POLICY "Users can read invited events" 
ON public.events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = events.id 
    AND ep.member_id = public.get_current_user_member_id()
  )
);