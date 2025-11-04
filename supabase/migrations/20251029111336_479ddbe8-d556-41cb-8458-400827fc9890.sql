-- Fix profile registration permissions (without touching auth.users)

-- Update the profiles INSERT policy to allow system inserts
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Allow system inserts for new users" ON public.profiles;

-- Policy for authenticated users
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'vorstand'::app_role) 
  OR has_role(auth.uid(), 'entwickler'::app_role)
  OR auth.uid() = user_id
);

-- Policy for anonymous/public inserts (needed for trigger during signup)
CREATE POLICY "Allow system inserts for new users"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (true);

-- Update the handle_new_user function with better logic
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
  ELSE
    -- Assign default player role for subsequent users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'player')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;