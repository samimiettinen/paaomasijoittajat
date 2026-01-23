-- Create function to check if current user is a presenter or owner of a resource
CREATE OR REPLACE FUNCTION public.is_resource_presenter_or_owner(resource_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  user_member_id uuid;
  is_presenter boolean;
BEGIN
  -- Get the current user's member_id
  user_member_id := public.get_current_user_member_id();
  
  IF user_member_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is a presenter or owner of this resource
  SELECT EXISTS (
    SELECT 1
    FROM public.resource_presenters rp
    WHERE rp.resource_id = resource_uuid
    AND rp.member_id = user_member_id
  ) INTO is_presenter;
  
  RETURN COALESCE(is_presenter, false);
END;
$$;

-- Add RLS policy for presenters/owners to update their resources
CREATE POLICY "Presenters can update own resources" 
ON public.event_resources 
FOR UPDATE 
USING (is_resource_presenter_or_owner(id));

-- Add RLS policy for owners to delete their resources
CREATE OR REPLACE FUNCTION public.is_resource_owner(resource_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  user_member_id uuid;
  is_owner boolean;
BEGIN
  -- Get the current user's member_id
  user_member_id := public.get_current_user_member_id();
  
  IF user_member_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is an owner of this resource
  SELECT EXISTS (
    SELECT 1
    FROM public.resource_presenters rp
    WHERE rp.resource_id = resource_uuid
    AND rp.member_id = user_member_id
    AND rp.role = 'owner'
  ) INTO is_owner;
  
  RETURN COALESCE(is_owner, false);
END;
$$;

-- Add RLS policy for owners to delete their resources
CREATE POLICY "Owners can delete own resources" 
ON public.event_resources 
FOR DELETE 
USING (is_resource_owner(id));

-- Add RLS policy for presenters/owners to read their resources
CREATE POLICY "Presenters can read own resources" 
ON public.event_resources 
FOR SELECT 
USING (is_resource_presenter_or_owner(id));