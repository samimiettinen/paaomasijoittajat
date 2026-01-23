-- Create resource_presenters table to track presenters/owners for event resources
CREATE TABLE public.resource_presenters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.event_resources(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('presenter', 'owner')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(resource_id, member_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.resource_presenters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admins (full CRUD)
CREATE POLICY "Admins can read resource_presenters" 
ON public.resource_presenters 
FOR SELECT 
USING (is_current_user_admin());

CREATE POLICY "Admins can insert resource_presenters" 
ON public.resource_presenters 
FOR INSERT 
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update resource_presenters" 
ON public.resource_presenters 
FOR UPDATE 
USING (is_current_user_admin());

CREATE POLICY "Admins can delete resource_presenters" 
ON public.resource_presenters 
FOR DELETE 
USING (is_current_user_admin());

-- Create RLS policies for insiders (read-only)
CREATE POLICY "Insiders can read resource_presenters" 
ON public.resource_presenters 
FOR SELECT 
USING (is_current_user_insider());

-- Create index for faster lookups
CREATE INDEX idx_resource_presenters_resource_id ON public.resource_presenters(resource_id);
CREATE INDEX idx_resource_presenters_member_id ON public.resource_presenters(member_id);