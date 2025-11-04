-- Add email provider selection and additional SMTP fields to club_settings
ALTER TABLE public.club_settings
ADD COLUMN IF NOT EXISTS email_provider_type text DEFAULT 'resend',
ADD COLUMN IF NOT EXISTS email_smtp_username text,
ADD COLUMN IF NOT EXISTS email_smtp_port integer DEFAULT 587;

-- Add comment for documentation
COMMENT ON COLUMN public.club_settings.email_provider_type IS 'Email provider type: resend or smtp';
COMMENT ON COLUMN public.club_settings.email_smtp_username IS 'SMTP username for IONOS, Google, etc.';
COMMENT ON COLUMN public.club_settings.email_smtp_port IS 'SMTP port (default: 587 for TLS)';