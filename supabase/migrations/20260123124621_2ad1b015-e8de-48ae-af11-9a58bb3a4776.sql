-- Create event_resources table for storing files, text notes, and URLs
CREATE TABLE public.event_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'text', 'url')),
  title TEXT NOT NULL,
  content TEXT, -- For text notes and URLs
  file_url TEXT, -- For uploaded files
  file_name TEXT, -- Original file name
  file_size INTEGER, -- File size in bytes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.members(id)
);

-- Enable Row Level Security
ALTER TABLE public.event_resources ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can read event_resources"
ON public.event_resources
FOR SELECT
USING (is_current_user_admin());

CREATE POLICY "Admins can insert event_resources"
ON public.event_resources
FOR INSERT
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update event_resources"
ON public.event_resources
FOR UPDATE
USING (is_current_user_admin());

CREATE POLICY "Admins can delete event_resources"
ON public.event_resources
FOR DELETE
USING (is_current_user_admin());

-- Create storage bucket for event files
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-files', 'event-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event files
CREATE POLICY "Anyone can view event files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-files');

CREATE POLICY "Admins can upload event files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'event-files');

CREATE POLICY "Admins can update event files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'event-files');

CREATE POLICY "Admins can delete event files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'event-files');

-- Add index for faster queries
CREATE INDEX idx_event_resources_event_id ON public.event_resources(event_id);