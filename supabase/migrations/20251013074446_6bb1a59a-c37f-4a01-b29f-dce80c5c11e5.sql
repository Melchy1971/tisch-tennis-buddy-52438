-- Create developer profile if not exists
DO $$
DECLARE
  dev_user_id uuid;
  dev_email text := 'mdickscheit@gmail.com';
BEGIN
  -- Get user_id from auth.users
  SELECT id INTO dev_user_id
  FROM auth.users
  WHERE email = dev_email;

  IF dev_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users', dev_email;
  END IF;

  -- Insert or update profile
  INSERT INTO public.profiles (user_id, email, first_name, last_name, status, requires_password_change)
  VALUES (dev_user_id, dev_email, 'Markus', 'Dickscheit', 'active', false)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    first_name = 'Markus',
    last_name = 'Dickscheit',
    email = dev_email,
    status = 'active',
    requires_password_change = false;

  -- Add admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (dev_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Add entwickler role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (dev_user_id, 'entwickler')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Developer profile created/updated for % with admin and entwickler roles', dev_email;
END $$;