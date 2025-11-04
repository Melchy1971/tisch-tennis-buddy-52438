-- Ensure Markus Dickscheit exists as an admin user
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'markus@dickscheit.de'
  LIMIT 1;

  IF target_user_id IS NULL THEN
    PERFORM auth.create_user(
      jsonb_build_object(
        'email', 'markus@dickscheit.de',
        'password', 'Alex..2025',
        'email_confirm', true,
        'user_metadata', jsonb_build_object(
          'first_name', 'Markus',
          'last_name', 'Dickscheit'
        )
      )
    );

    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'markus@dickscheit.de'
    LIMIT 1;

    IF target_user_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create user %', 'markus@dickscheit.de';
    END IF;
  ELSE
    UPDATE auth.users
    SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) ||
      jsonb_build_object(
        'first_name', 'Markus',
        'last_name', 'Dickscheit'
      )
    WHERE id = target_user_id;
  END IF;

  INSERT INTO public.profiles (user_id, first_name, last_name, email, status)
  VALUES (target_user_id, 'Markus', 'Dickscheit', 'markus@dickscheit.de', 'active')
  ON CONFLICT (user_id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        status = EXCLUDED.status;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
