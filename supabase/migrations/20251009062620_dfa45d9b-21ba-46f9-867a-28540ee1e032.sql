-- Add missing columns to club_settings table (IF NOT EXISTS handles duplicates gracefully)
ALTER TABLE public.club_settings 
ADD COLUMN IF NOT EXISTS board_chairman TEXT,
ADD COLUMN IF NOT EXISTS board_deputy TEXT,
ADD COLUMN IF NOT EXISTS board_secretary TEXT,
ADD COLUMN IF NOT EXISTS board_treasurer TEXT,
ADD COLUMN IF NOT EXISTS board_youth_leader TEXT,
ADD COLUMN IF NOT EXISTS contact_address TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_website TEXT,
ADD COLUMN IF NOT EXISTS contact_facebook TEXT,
ADD COLUMN IF NOT EXISTS email_from_address TEXT,
ADD COLUMN IF NOT EXISTS email_smtp_server TEXT,
ADD COLUMN IF NOT EXISTS email_smtp_password TEXT;