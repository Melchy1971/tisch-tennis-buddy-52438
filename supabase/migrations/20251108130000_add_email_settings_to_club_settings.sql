-- Add email configuration fields to club_settings
ALTER TABLE public.club_settings
  ADD COLUMN IF NOT EXISTS email_from_address text,
  ADD COLUMN IF NOT EXISTS email_smtp_server text,
  ADD COLUMN IF NOT EXISTS email_smtp_password text;

COMMENT ON COLUMN public.club_settings.email_from_address IS 'Default sender address for transactional and newsletter emails.';
COMMENT ON COLUMN public.club_settings.email_smtp_server IS 'SMTP host that will be used for sending emails (Resend SMTP endpoint).';
COMMENT ON COLUMN public.club_settings.email_smtp_password IS 'SMTP credential or API key used to authenticate against the email provider.';
