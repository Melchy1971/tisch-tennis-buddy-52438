-- Fix profiles INSERT policies to allow admins to create profiles for others
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins and vorstand can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create permissive policies (OR logic)
CREATE POLICY "Admins and vorstand can insert any profile"
ON public.profiles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);