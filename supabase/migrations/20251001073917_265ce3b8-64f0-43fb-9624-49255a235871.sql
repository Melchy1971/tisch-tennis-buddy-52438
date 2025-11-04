-- Check and fix RLS policies for profiles and matches

-- First, check current policies for profiles
DO $$
BEGIN
  RAISE NOTICE 'Checking profiles policies...';
END $$;

-- Drop ALL existing INSERT policies for profiles to start fresh
DROP POLICY IF EXISTS "Allow profile insertion" ON public.profiles;
DROP POLICY IF EXISTS "Admins and vorstand can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create a single INSERT policy that works
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role) OR
  auth.uid() = user_id
);

-- Update matches policies to allow captain (moderator) to update
DROP POLICY IF EXISTS "Admins, moderators and vorstand can update matches" ON public.matches;

CREATE POLICY "Admins, moderators and vorstand can update matches"
ON public.matches
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);