-- Add club_name field to club_settings table
ALTER TABLE public.club_settings
ADD COLUMN club_name text DEFAULT 'Tischtennis Verein';

-- Add comment to document the column
COMMENT ON COLUMN public.club_settings.club_name IS 'Name of the club, displayed in header and login area';