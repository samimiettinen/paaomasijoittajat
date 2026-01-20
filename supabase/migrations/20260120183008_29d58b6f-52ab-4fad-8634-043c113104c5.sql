-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('welcome', 'invitation')),
  subject TEXT,
  greeting TEXT,
  intro_text TEXT,
  signature TEXT,
  invitation_text TEXT,
  created_by UUID REFERENCES public.members(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can view all templates
CREATE POLICY "Admins can view email templates"
ON public.email_templates
FOR SELECT
USING (public.is_current_user_admin());

-- Admins can create templates
CREATE POLICY "Admins can create email templates"
ON public.email_templates
FOR INSERT
WITH CHECK (public.is_current_user_admin());

-- Admins can update templates
CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
USING (public.is_current_user_admin());

-- Admins can delete templates
CREATE POLICY "Admins can delete email templates"
ON public.email_templates
FOR DELETE
USING (public.is_current_user_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();