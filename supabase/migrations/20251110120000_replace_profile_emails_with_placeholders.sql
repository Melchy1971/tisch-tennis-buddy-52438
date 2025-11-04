-- Replace all profile and auth user emails with placeholder addresses
-- except for Markus Dickscheit's known addresses
DO $$
DECLARE
  target RECORD;
  allowed_emails CONSTANT text[] := ARRAY['mdickscheit@gmail.com', 'markus@dickscheit.de'];
  new_email text;
  identifier text;
BEGIN
  FOR target IN
    SELECT id AS profile_id, user_id, email
    FROM public.profiles
    WHERE email IS NOT NULL
  LOOP
    IF target.email = ANY(allowed_emails) THEN
      CONTINUE;
    END IF;

    identifier := COALESCE(target.user_id::text, target.profile_id::text);
    new_email := 'placeholder+' || replace(identifier, '-', '') || '@ttbuddy.app';

    UPDATE public.profiles
    SET email = new_email
    WHERE id = target.profile_id;

    IF target.user_id IS NOT NULL THEN
      UPDATE auth.users
      SET email = new_email
      WHERE id = target.user_id
        AND email <> ALL(allowed_emails);
    END IF;
  END LOOP;
END;
$$;
