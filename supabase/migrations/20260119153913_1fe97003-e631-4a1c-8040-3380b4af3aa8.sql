-- Add 'vibe_coder' to the admin_level enum
ALTER TYPE public.admin_level ADD VALUE IF NOT EXISTS 'vibe_coder';

-- Update existing super admins (Sami, Lasse, Veera) to ensure they're marked as 'super'
UPDATE public.admins 
SET admin_level = 'super' 
WHERE member_id IN (
  SELECT id FROM public.members 
  WHERE email IN ('sami.miettinen@dcmcapital.fi', 'lasse@byte.fi', 'info@designva.fi')
);