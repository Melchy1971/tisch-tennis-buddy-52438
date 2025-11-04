-- Add Facebook contact field to club_settings
ALTER TABLE public.club_settings
  ADD COLUMN IF NOT EXISTS contact_facebook text;

COMMENT ON COLUMN public.club_settings.contact_facebook IS 'Facebook URL of the club displayed in the info area';
