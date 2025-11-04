-- Update handle_new_user to NOT automatically assign roles (except for first user)
-- Roles should only be assigned during import or manual creation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  is_first_user BOOLEAN;
BEGIN
  -- Count existing users (excluding the current one being created)
  SELECT COUNT(*) INTO user_count
  FROM auth.users
  WHERE id != NEW.id;
  
  is_first_user := (user_count = 0);
  
  -- Insert into profiles with proper status
  INSERT INTO public.profiles (user_id, first_name, last_name, email, status, requires_password_change)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    CASE 
      WHEN is_first_user THEN 'active'
      ELSE 'pending'
    END,
    COALESCE((NEW.raw_user_meta_data ->> 'requires_password_change')::boolean, false)
  );
  
  -- Only assign all roles to the first user
  -- For subsequent users, NO automatic role assignment - roles must be set explicitly during import/creation
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES 
      (NEW.id, 'admin'),
      (NEW.id, 'vorstand'),
      (NEW.id, 'moderator'),
      (NEW.id, 'mannschaftsfuehrer'),
      (NEW.id, 'player')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;