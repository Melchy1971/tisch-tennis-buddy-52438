-- Add missing columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS mobile TEXT,
  ADD COLUMN IF NOT EXISTS member_number TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS member_since DATE,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS default_role TEXT DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS qttr_value INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Migrate full_name to first_name/last_name if they exist
UPDATE public.profiles
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND first_name IS NULL 
    THEN split_part(full_name, ' ', 1)
    ELSE first_name
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND last_name IS NULL AND position(' ' in full_name) > 0
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE last_name
  END
WHERE full_name IS NOT NULL;

-- Update handle_new_user function to use new structure
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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
  
  -- Insert into profiles with all fields
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    first_name,
    last_name,
    status,
    default_role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    CASE 
      WHEN is_first_user THEN 'active'
      ELSE 'pending'
    END,
    CASE 
      WHEN is_first_user THEN 'admin'
      ELSE 'member'
    END
  );
  
  -- If this is the first user, assign admin role
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'First user created with admin role: %', NEW.id;
  ELSE
    -- Assign default member role for subsequent users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();