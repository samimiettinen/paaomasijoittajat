-- Add invitation token and early arrival columns to event_participants
ALTER TABLE public.event_participants
ADD COLUMN invitation_token uuid DEFAULT gen_random_uuid() UNIQUE,
ADD COLUMN early_arrival boolean DEFAULT null;

-- Create index on invitation_token for fast lookup
CREATE INDEX idx_event_participants_invitation_token ON public.event_participants(invitation_token);

-- Create RLS policy to allow public read access by invitation token
CREATE POLICY "Allow public read by invitation token"
ON public.event_participants
FOR SELECT
USING (true);

-- Allow public update by invitation token for RSVP responses
CREATE POLICY "Allow public RSVP update by invitation token"
ON public.event_participants
FOR UPDATE
USING (invitation_token IS NOT NULL);