-- Create table for email sending history
CREATE TABLE public.email_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_by_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;

-- Only admins can read email history
CREATE POLICY "Admins can read email_sends"
ON public.email_sends
FOR SELECT
USING (is_current_user_admin());

-- Only admins can insert email history
CREATE POLICY "Admins can insert email_sends"
ON public.email_sends
FOR INSERT
WITH CHECK (is_current_user_admin());

-- Create index for faster queries
CREATE INDEX idx_email_sends_event_member ON public.email_sends(event_id, member_id);
CREATE INDEX idx_email_sends_sent_at ON public.email_sends(sent_at DESC);