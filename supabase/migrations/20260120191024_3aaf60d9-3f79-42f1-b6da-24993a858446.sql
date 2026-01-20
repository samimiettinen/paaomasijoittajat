-- Proper fix: Remove overly permissive public policies and use RPC instead

-- Drop the problematic policies we just created
DROP POLICY IF EXISTS "Public can read event_participant by exact token match" ON public.event_participants;
DROP POLICY IF EXISTS "Public can update event_participant by exact token match" ON public.event_participants;
DROP POLICY IF EXISTS "Public can read member via RSVP token in join" ON public.members;

-- Create a secure RPC function to fetch RSVP data by token
-- This function accepts the token as a parameter and only returns the matching record
CREATE OR REPLACE FUNCTION public.get_rsvp_by_token(token_value uuid)
RETURNS TABLE (
  participant_id uuid,
  participant_status text,
  early_arrival boolean,
  event_id uuid,
  event_title text,
  event_date date,
  event_start_time time,
  event_end_time time,
  event_description text,
  event_location_name text,
  event_location_address text,
  event_location_city text,
  member_first_name text,
  member_last_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT 
    ep.id as participant_id,
    ep.status::text as participant_status,
    ep.early_arrival,
    e.id as event_id,
    e.title as event_title,
    e.event_date,
    e.start_time as event_start_time,
    e.end_time as event_end_time,
    e.description as event_description,
    e.location_name as event_location_name,
    e.location_address as event_location_address,
    e.location_city as event_location_city,
    m.first_name as member_first_name,
    m.last_name as member_last_name
  FROM public.event_participants ep
  JOIN public.events e ON e.id = ep.event_id
  JOIN public.members m ON m.id = ep.member_id
  WHERE ep.invitation_token = token_value
  LIMIT 1;
$$;

-- Create a secure RPC function to update RSVP by token
CREATE OR REPLACE FUNCTION public.update_rsvp_by_token(
  token_value uuid,
  new_status text,
  new_early_arrival boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  updated_count int;
BEGIN
  -- Validate status
  IF new_status NOT IN ('confirmed', 'declined') THEN
    RAISE EXCEPTION 'Invalid status: must be confirmed or declined';
  END IF;
  
  -- Update the participant record
  UPDATE public.event_participants
  SET 
    status = new_status::public.participant_status,
    early_arrival = CASE 
      WHEN new_status = 'confirmed' THEN new_early_arrival
      ELSE NULL
    END
  WHERE invitation_token = token_value;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count > 0;
END;
$$;

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_rsvp_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_rsvp_by_token(uuid, text, boolean) TO anon, authenticated;