-- Update handle_new_user function to exclude mannschaftsfuehrer role for first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INTEGER;
  is_first_user BOOLEAN;
BEGIN
  -- Count existing users (excluding the current one being created)
  SELECT COUNT(*) INTO user_count
  FROM auth.users
  WHERE id != NEW.id;
  
  is_first_user := (user_count = 0);
  
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, first_name, last_name, email, requires_password_change)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'requires_password_change')::boolean, false)
  );
  
  -- If this is the first user, assign all roles EXCEPT mannschaftsfuehrer
  IF is_first_user THEN
    -- Assign all available roles to the first user except mannschaftsfuehrer
    INSERT INTO public.user_roles (user_id, role)
    VALUES 
      (NEW.id, 'admin'),
      (NEW.id, 'vorstand'),
      (NEW.id, 'moderator'),
      (NEW.id, 'player');
    
    -- Log that first admin was created
    RAISE NOTICE 'First user created with all roles except mannschaftsfuehrer: %', NEW.id;
  ELSE
    -- Assign default player role for subsequent users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'player');
  END IF;
  
  RETURN NEW;
END;
$function$;