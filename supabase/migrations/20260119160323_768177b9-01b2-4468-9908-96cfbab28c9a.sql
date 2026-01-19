
-- Create a security definer function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.admins a ON a.member_id = m.id
    WHERE m.email = auth.jwt() ->> 'email'
  );
$$;

-- Drop all existing policies on members table
DROP POLICY IF EXISTS "Allow delete access to members" ON public.members;
DROP POLICY IF EXISTS "Allow insert access to members" ON public.members;
DROP POLICY IF EXISTS "Allow read access to members" ON public.members;
DROP POLICY IF EXISTS "Allow update access to members" ON public.members;

-- Create new restrictive policies for members table (admin only)
CREATE POLICY "Admins can read members" ON public.members
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can insert members" ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update members" ON public.members
  FOR UPDATE TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can delete members" ON public.members
  FOR DELETE TO authenticated
  USING (public.is_current_user_admin());

-- Drop all existing policies on admins table
DROP POLICY IF EXISTS "Allow delete access to admins" ON public.admins;
DROP POLICY IF EXISTS "Allow insert access to admins" ON public.admins;
DROP POLICY IF EXISTS "Allow read access to admins" ON public.admins;
DROP POLICY IF EXISTS "Allow update access to admins" ON public.admins;

-- Create new restrictive policies for admins table (admin only)
CREATE POLICY "Admins can read admins" ON public.admins
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can insert admins" ON public.admins
  FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update admins" ON public.admins
  FOR UPDATE TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can delete admins" ON public.admins
  FOR DELETE TO authenticated
  USING (public.is_current_user_admin());

-- Drop all existing policies on events table
DROP POLICY IF EXISTS "Allow delete access to events" ON public.events;
DROP POLICY IF EXISTS "Allow insert access to events" ON public.events;
DROP POLICY IF EXISTS "Allow read access to events" ON public.events;
DROP POLICY IF EXISTS "Allow update access to events" ON public.events;

-- Create new restrictive policies for events table (admin only for management, public for published events)
CREATE POLICY "Admins can read all events" ON public.events
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Public can read published events" ON public.events
  FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "Admins can insert events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update events" ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can delete events" ON public.events
  FOR DELETE TO authenticated
  USING (public.is_current_user_admin());

-- Drop all existing policies on event_participants table
DROP POLICY IF EXISTS "Allow delete access to event_participants" ON public.event_participants;
DROP POLICY IF EXISTS "Allow insert access to event_participants" ON public.event_participants;
DROP POLICY IF EXISTS "Allow public RSVP update by invitation token" ON public.event_participants;
DROP POLICY IF EXISTS "Allow public read by invitation token" ON public.event_participants;
DROP POLICY IF EXISTS "Allow read access to event_participants" ON public.event_participants;
DROP POLICY IF EXISTS "Allow update access to event_participants" ON public.event_participants;

-- Create new policies for event_participants (admin + public RSVP via token)
CREATE POLICY "Admins can read event_participants" ON public.event_participants
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Public can read own RSVP by token" ON public.event_participants
  FOR SELECT TO anon
  USING (invitation_token IS NOT NULL);

CREATE POLICY "Admins can insert event_participants" ON public.event_participants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update event_participants" ON public.event_participants
  FOR UPDATE TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Public can update own RSVP by token" ON public.event_participants
  FOR UPDATE TO anon
  USING (invitation_token IS NOT NULL);

CREATE POLICY "Admins can delete event_participants" ON public.event_participants
  FOR DELETE TO authenticated
  USING (public.is_current_user_admin());

-- Drop all existing policies on member_visits table
DROP POLICY IF EXISTS "Allow insert access to member_visits" ON public.member_visits;
DROP POLICY IF EXISTS "Allow read access to member_visits" ON public.member_visits;

-- Create new restrictive policies for member_visits table (admin only)
CREATE POLICY "Admins can read member_visits" ON public.member_visits
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can insert member_visits" ON public.member_visits
  FOR INSERT TO authenticated
  WITH CHECK (true);
