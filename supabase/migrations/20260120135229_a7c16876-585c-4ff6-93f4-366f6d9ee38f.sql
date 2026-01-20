-- Add email signature field to events table
ALTER TABLE public.events 
ADD COLUMN email_signature text DEFAULT 'Ystävällisin terveisin,
Pääomasijoittajat ry';