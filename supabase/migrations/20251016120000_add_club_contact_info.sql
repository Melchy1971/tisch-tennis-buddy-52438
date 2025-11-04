-- Add contact information fields to club_settings
ALTER TABLE public.club_settings
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_address text,
  ADD COLUMN IF NOT EXISTS contact_website text,
  ADD COLUMN IF NOT EXISTS board_chairman text,
  ADD COLUMN IF NOT EXISTS board_deputy text,
  ADD COLUMN IF NOT EXISTS board_treasurer text,
  ADD COLUMN IF NOT EXISTS board_secretary text,
  ADD COLUMN IF NOT EXISTS board_youth_leader text;

COMMENT ON COLUMN public.club_settings.contact_email IS 'Official club contact email address displayed in the info area';
COMMENT ON COLUMN public.club_settings.contact_phone IS 'Official club contact phone number displayed in the info area';
COMMENT ON COLUMN public.club_settings.contact_address IS 'Postal address of the club displayed in the info area';
COMMENT ON COLUMN public.club_settings.contact_website IS 'Website URL of the club displayed in the info area';
COMMENT ON COLUMN public.club_settings.board_chairman IS 'Primary chairperson of the club';
COMMENT ON COLUMN public.club_settings.board_deputy IS 'Deputy chairperson of the club';
COMMENT ON COLUMN public.club_settings.board_treasurer IS 'Treasurer responsible for the finances';
COMMENT ON COLUMN public.club_settings.board_secretary IS 'Secretary responsible for documentation';
COMMENT ON COLUMN public.club_settings.board_youth_leader IS 'Youth leader contact for the club';
