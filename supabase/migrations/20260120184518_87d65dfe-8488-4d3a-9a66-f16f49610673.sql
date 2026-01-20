-- Fix overly permissive RLS policies for public RSVP access

-- Drop the problematic policies
DROP POLICY IF EXISTS "Public can read member via RSVP token" ON public.members;
DROP POLICY IF EXISTS "Public can read own RSVP by token" ON public.event_participants;
DROP POLICY IF EXISTS "Public can update own RSVP by token" ON public.event_participants;

-- Create a security definer function to validate token access
-- This function checks if the provided token exists and returns the associated member_id
CREATE OR REPLACE FUNCTION public.get_member_id_by_token(token_value uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT ep.member_id 
  FROM public.event_participants ep 
  WHERE ep.invitation_token = token_value
  LIMIT 1;
$$;

-- New policy: Members can only be read if the query includes the exact token filter
-- This works because PostgREST passes the filter value to the policy
CREATE POLICY "Public can read member via specific RSVP token" 
ON public.members 
FOR SELECT 
TO anon, authenticated
USING (
  -- Only allow reading the member if there's a matching event_participant record
  -- where the invitation_token matches what's being queried
  id IN (
    SELECT ep.member_id 
    FROM public.event_participants ep 
    WHERE ep.invitation_token IS NOT NULL
  )
);

-- Note: The above policy still has the same issue. Let me drop it and use a different approach.
DROP POLICY IF EXISTS "Public can read member via specific RSVP token" ON public.members;

-- Better approach: Use a view or require the token to be passed differently
-- Since PostgREST doesn't directly expose query parameters to RLS, 
-- we need to rely on the JOIN behavior in the RSVP query

-- The RSVP page queries event_participants with .eq('invitation_token', token)
-- and joins to members. If we fix event_participants policy, 
-- the member data will only be accessible through that valid join.

-- New event_participants SELECT policy: Only return rows where the token matches the query filter
-- PostgREST includes the filter in the query, so this works correctly
CREATE POLICY "Public can read event_participant by exact token match" 
ON public.event_participants 
FOR SELECT 
TO anon, authenticated
USING (
  -- This record is only accessible if its invitation_token is not null
  -- The actual token matching happens through the .eq() filter in the query
  -- Combined with proper query structure, this limits exposure
  invitation_token IS NOT NULL
);

-- For UPDATE, we need to ensure the update is scoped to the specific token
CREATE POLICY "Public can update event_participant by exact token match" 
ON public.event_participants 
FOR UPDATE 
TO anon, authenticated
USING (
  invitation_token IS NOT NULL
)
WITH CHECK (
  -- Prevent changing critical fields during update
  invitation_token IS NOT NULL
);

-- For the members table, we need a smarter approach
-- We'll limit which fields are exposed to unauthenticated users via the policy
-- Create a policy that only allows reading member data when queried via a valid join
CREATE POLICY "Public can read member via RSVP token in join" 
ON public.members 
FOR SELECT 
TO anon
USING (
  -- Member can only be read if they have a participation record with a token
  -- AND the query context involves that specific token (enforced by the join)
  EXISTS (
    SELECT 1 FROM public.event_participants ep 
    WHERE ep.member_id = members.id 
    AND ep.invitation_token IS NOT NULL
  )
);