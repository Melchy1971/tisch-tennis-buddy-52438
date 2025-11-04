-- Update all @ttb.local email addresses to the new valid format @placeholder.ttbuddy.app
-- This affects both auth.users and profiles tables

-- First, update the profiles table
UPDATE public.profiles
SET email = REPLACE(email, '@ttb.local', '@placeholder.ttbuddy.app')
WHERE email LIKE '%@ttb.local';

-- Update auth.users table
UPDATE auth.users
SET email = REPLACE(email, '@ttb.local', '@placeholder.ttbuddy.app')
WHERE email LIKE '%@ttb.local';

-- Replace all @t-online.de addresses with unique placeholder addresses
-- Using a combination of name and timestamp for uniqueness
DO $$
DECLARE
  user_record RECORD;
  new_email TEXT;
  base_name TEXT;
  counter INTEGER := 0;
BEGIN
  -- Update profiles with @t-online.de
  FOR user_record IN 
    SELECT id, user_id, first_name, last_name, email
    FROM public.profiles
    WHERE email LIKE '%@t-online.de'
  LOOP
    counter := counter + 1;
    
    -- Generate base name from first and last name
    IF user_record.first_name IS NOT NULL AND user_record.last_name IS NOT NULL THEN
      base_name := lower(regexp_replace(user_record.first_name, '[^a-zA-Z0-9]', '', 'g')) || '.' || 
                   lower(regexp_replace(user_record.last_name, '[^a-zA-Z0-9]', '', 'g'));
    ELSIF user_record.first_name IS NOT NULL THEN
      base_name := lower(regexp_replace(user_record.first_name, '[^a-zA-Z0-9]', '', 'g'));
    ELSIF user_record.last_name IS NOT NULL THEN
      base_name := lower(regexp_replace(user_record.last_name, '[^a-zA-Z0-9]', '', 'g'));
    ELSE
      base_name := 'mitglied';
    END IF;
    
    -- Create unique email with timestamp
    new_email := base_name || '.' || extract(epoch from now())::bigint || '.' || counter || '@placeholder.ttbuddy.app';
    
    -- Update profile
    UPDATE public.profiles
    SET email = new_email
    WHERE id = user_record.id;
    
    -- Update auth.users if user_id exists
    IF user_record.user_id IS NOT NULL THEN
      UPDATE auth.users
      SET email = new_email
      WHERE id = user_record.user_id;
    END IF;
    
    RAISE NOTICE 'Updated email for % %: % -> %', user_record.first_name, user_record.last_name, user_record.email, new_email;
  END LOOP;
END $$;