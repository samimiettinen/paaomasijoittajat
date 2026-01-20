-- Update the default email signature from Pääomasijoittajat to Pääomaomistajat
ALTER TABLE public.events 
ALTER COLUMN email_signature SET DEFAULT 'Ystävällisin terveisin,
Pääomaomistajien vibe coding society';

-- Also update any existing events that still have the old signature
UPDATE public.events 
SET email_signature = 'Ystävällisin terveisin,
Pääomaomistajien vibe coding society'
WHERE email_signature LIKE '%Pääomasijoittajat%';