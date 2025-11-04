-- Allow profiles without auth users by making user_id nullable
-- and using NULL instead of placeholder UUID

-- First, drop the existing foreign key constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Make user_id nullable
ALTER TABLE public.profiles 
ALTER COLUMN user_id DROP NOT NULL;

-- Add back the foreign key constraint that allows NULL values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Update any existing placeholder UUIDs to NULL
UPDATE public.profiles 
SET user_id = NULL 
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Update RLS policies to handle NULL user_ids properly
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- Recreate policies with NULL handling
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role) OR 
  (auth.uid() = user_id)
);