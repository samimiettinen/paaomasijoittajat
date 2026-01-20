-- Add avatar_url column to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
-- Anyone can view avatars (public bucket)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar (folder matches their member_id)
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.members 
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    LIMIT 1
  )
);

-- Authenticated users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.members 
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    LIMIT 1
  )
);

-- Authenticated users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.members 
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    LIMIT 1
  )
);

-- RLS policy: Vibe Coders can read their own member record
CREATE POLICY "Users can read own member"
ON public.members FOR SELECT
TO authenticated
USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));

-- RLS policy: Users can update their own member record (limited fields handled in app)
CREATE POLICY "Users can update own member"
ON public.members FOR UPDATE
TO authenticated
USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));

-- RLS policy: Vibe Coders can see events they are invited to
CREATE POLICY "Users can read invited events"
ON public.events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event_participants ep
    JOIN public.members m ON m.id = ep.member_id
    WHERE ep.event_id = events.id
    AND LOWER(m.email) = LOWER(auth.jwt() ->> 'email')
  )
);

-- RLS policy: Vibe Coders can read their own event participation records
CREATE POLICY "Users can read own participation"
ON public.event_participants FOR SELECT
TO authenticated
USING (
  member_id = (
    SELECT id FROM public.members 
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    LIMIT 1
  )
);

-- RLS policy: Vibe Coders can update their own participation status
CREATE POLICY "Users can update own participation"
ON public.event_participants FOR UPDATE
TO authenticated
USING (
  member_id = (
    SELECT id FROM public.members 
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    LIMIT 1
  )
);