-- Fix user registration by ensuring the trigger exists and works correctly
-- Drop existing function and trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the updated function that handles new user registration
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
  
  -- If this is the first user, assign all roles
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES 
      (NEW.id, 'admin'),
      (NEW.id, 'vorstand'),
      (NEW.id, 'moderator'),
      (NEW.id, 'mannschaftsfuehrer'),
      (NEW.id, 'player')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'First user created with all roles: %', NEW.id;
  ELSE
    -- Assign default player role for subsequent users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'player')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the trigger is enabled
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
