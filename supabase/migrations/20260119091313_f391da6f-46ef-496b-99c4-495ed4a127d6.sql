-- Create enums for membership status, event status, participant status, and admin level
CREATE TYPE public.membership_status AS ENUM ('active', 'pending', 'inactive', 'removed');
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE public.participant_status AS ENUM ('invited', 'confirmed', 'declined', 'attended', 'no_show');
CREATE TYPE public.admin_level AS ENUM ('super', 'regular');

-- Create members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  mobile_phone TEXT NOT NULL UNIQUE,
  email TEXT,
  secondary_email TEXT,
  organization TEXT,
  organization_role TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  membership_status public.membership_status NOT NULL DEFAULT 'active',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  notes TEXT
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_name TEXT,
  location_address TEXT,
  location_city TEXT,
  status public.event_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.members(id) ON DELETE SET NULL
);

-- Create event_participants table
CREATE TABLE public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status public.participant_status NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  calendar_invite_sent BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(event_id, member_id)
);

-- Create admins table
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  admin_level public.admin_level NOT NULL DEFAULT 'regular',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if a member is an admin
CREATE OR REPLACE FUNCTION public.is_admin(member_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.admins a ON a.member_id = m.id
    WHERE m.mobile_phone = member_phone
  );
$$;

-- For now, allow public read access for the app (we'll secure with session-based auth later)
-- Members table policies
CREATE POLICY "Allow read access to members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow insert access to members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to members" ON public.members FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to members" ON public.members FOR DELETE USING (true);

-- Events table policies
CREATE POLICY "Allow read access to events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow insert access to events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to events" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to events" ON public.events FOR DELETE USING (true);

-- Event participants policies
CREATE POLICY "Allow read access to event_participants" ON public.event_participants FOR SELECT USING (true);
CREATE POLICY "Allow insert access to event_participants" ON public.event_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to event_participants" ON public.event_participants FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to event_participants" ON public.event_participants FOR DELETE USING (true);

-- Admins table policies
CREATE POLICY "Allow read access to admins" ON public.admins FOR SELECT USING (true);
CREATE POLICY "Allow insert access to admins" ON public.admins FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to admins" ON public.admins FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to admins" ON public.admins FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_members_membership_status ON public.members(membership_status);
CREATE INDEX idx_members_mobile_phone ON public.members(mobile_phone);
CREATE INDEX idx_events_event_date ON public.events(event_date);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX idx_event_participants_member_id ON public.event_participants(member_id);