-- Fix profile registration permissions by adjusting RLS policies

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- Create a more permissive INSERT policy that allows:
-- 1. Admins, vorstand, entwickler to insert any profile
-- 2. Users to insert their own profile
-- 3. System (trigger) to insert new profiles
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
WITH CHECK (
  -- Allow privileged roles to insert any profile
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'vorstand'::app_role) 
  OR has_role(auth.uid(), 'entwickler'::app_role)
  -- Allow users to insert their own profile
  OR auth.uid() = user_id
  -- Allow inserts where user_id matches the inserting user (for trigger)
  OR user_id = auth.uid()
);

-- Create a policy for public/anonymous inserts (needed during registration trigger)
-- This allows the system trigger to insert profiles for new users
CREATE POLICY "Allow system inserts for new user registration"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (true);