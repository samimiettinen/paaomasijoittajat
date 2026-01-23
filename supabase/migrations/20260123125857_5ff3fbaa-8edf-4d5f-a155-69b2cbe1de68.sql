-- Step 2: Update all vibe_coder admins to insider
UPDATE public.admins SET admin_level = 'insider' WHERE admin_level = 'vibe_coder';

-- Create helper function to check if current user is an insider
CREATE OR REPLACE FUNCTION public.is_current_user_insider()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = 'off'
AS $$
DECLARE
  user_email text;
  is_insider boolean;
BEGIN
  user_email := lower(auth.jwt() ->> 'email');
  
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.admins a ON a.member_id = m.id
    WHERE lower(m.email) = user_email
    AND a.admin_level = 'insider'
  ) INTO is_insider;
  
  RETURN COALESCE(is_insider, false);
END;
$$;

-- RLS policies for insiders to READ members
CREATE POLICY "Insiders can read members"
ON public.members
FOR SELECT
USING (is_current_user_insider());

-- RLS policies for insiders to READ events  
CREATE POLICY "Insiders can read events"
ON public.events
FOR SELECT
USING (is_current_user_insider());

-- RLS policies for insiders to READ event_participants
CREATE POLICY "Insiders can read event_participants"
ON public.event_participants
FOR SELECT
USING (is_current_user_insider());

-- RLS policies for insiders to READ event_resources
CREATE POLICY "Insiders can read event_resources"
ON public.event_resources
FOR SELECT
USING (is_current_user_insider());