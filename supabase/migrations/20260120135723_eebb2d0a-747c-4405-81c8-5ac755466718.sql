-- Update the default value for email_signature
ALTER TABLE public.events 
ALTER COLUMN email_signature SET DEFAULT 'Ystävällisin terveisin,
Pääomaomistajien vibe coding society';