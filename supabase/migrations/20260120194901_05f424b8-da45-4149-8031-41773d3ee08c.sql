-- Fix the member_visits INSERT policy to be more restrictive
-- Only allow users to insert visits for themselves (matching their member_id)

DROP POLICY IF EXISTS "Authenticated users can record visits" ON public.member_visits;

CREATE POLICY "Users can record own visits" 
ON public.member_visits 
FOR INSERT 
TO authenticated 
WITH CHECK (member_id = public.get_current_user_member_id());