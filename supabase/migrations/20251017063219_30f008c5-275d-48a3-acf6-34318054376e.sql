-- Add member_since column to profiles table
ALTER TABLE public.profiles
ADD COLUMN member_since date;

-- Add a comment to document the column
COMMENT ON COLUMN public.profiles.member_since IS 'Date when the member joined the club';