-- Create table to track member login sessions/visits
CREATE TABLE public.member_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  visited_at timestamp with time zone NOT NULL DEFAULT now(),
  user_agent text NULL,
  ip_address text NULL
);

-- Enable RLS
ALTER TABLE public.member_visits ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to insert their own visits
CREATE POLICY "Allow insert access to member_visits"
ON public.member_visits
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for admins to read all visits
CREATE POLICY "Allow read access to member_visits"
ON public.member_visits
FOR SELECT
TO authenticated
USING (true);

-- Create index for faster queries by member
CREATE INDEX idx_member_visits_member_id ON public.member_visits(member_id);
CREATE INDEX idx_member_visits_visited_at ON public.member_visits(visited_at DESC);