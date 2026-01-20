-- Allow public to read member name when accessing via RSVP token
CREATE POLICY "Public can read member via RSVP token"
ON public.members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.member_id = members.id
    AND ep.invitation_token IS NOT NULL
  )
);