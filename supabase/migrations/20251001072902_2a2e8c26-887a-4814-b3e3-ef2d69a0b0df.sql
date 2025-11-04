-- Fix INSERT policies for profiles to allow admins to create profiles with any user_id
-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Admins and vorstand can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create a single comprehensive INSERT policy
CREATE POLICY "Allow profile insertion"
ON public.profiles
FOR INSERT
WITH CHECK (
  -- Admins and vorstand can insert any profile
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role) OR
  -- Users can only insert their own profile
  auth.uid() = user_id
);