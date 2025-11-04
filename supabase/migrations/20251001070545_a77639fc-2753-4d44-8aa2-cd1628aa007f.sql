-- Update RLS policies for profiles table to allow vorstand members to manage profiles

-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Create new insert policy that allows admin and vorstand
CREATE POLICY "Admins and vorstand can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Drop existing update policy for admins
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create new update policy that allows admin and vorstand
CREATE POLICY "Admins and vorstand can update all profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Drop existing delete policy
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create new delete policy that allows admin and vorstand
CREATE POLICY "Admins and vorstand can delete profiles"
ON public.profiles
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Also update matches policies to allow vorstand
DROP POLICY IF EXISTS "Admins and moderators can insert matches" ON public.matches;
CREATE POLICY "Admins, moderators and vorstand can insert matches"
ON public.matches
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);

DROP POLICY IF EXISTS "Admins and moderators can update matches" ON public.matches;
CREATE POLICY "Admins, moderators and vorstand can update matches"
ON public.matches
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);

DROP POLICY IF EXISTS "Admins can delete matches" ON public.matches;
CREATE POLICY "Admins and vorstand can delete matches"
ON public.matches
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);