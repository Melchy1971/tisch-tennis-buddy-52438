-- Add deleted_at column to profiles table for soft delete
ALTER TABLE public.profiles 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better performance on deleted_at queries
CREATE INDEX idx_profiles_deleted_at ON public.profiles(deleted_at);

-- Update RLS policies to handle soft-deleted profiles
-- Drop existing policies that need modification
DROP POLICY IF EXISTS "Admins and vorstand can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Recreate policies with deleted_at checks
-- Admins and vorstand can view all profiles including deleted ones
CREATE POLICY "Admins and vorstand can view all profiles including deleted"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Users (mitglied) can view only their own non-deleted profile
CREATE POLICY "Users can view own non-deleted profile"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id AND 
  deleted_at IS NULL AND
  NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
);

-- Create a function to soft delete a profile
CREATE OR REPLACE FUNCTION public.soft_delete_profile(profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET deleted_at = now()
  WHERE id = profile_id;
END;
$$;

-- Create a function to permanently delete a profile
CREATE OR REPLACE FUNCTION public.permanently_delete_profile(profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete associated user roles first
  DELETE FROM public.user_roles WHERE user_id = (SELECT user_id FROM public.profiles WHERE id = profile_id);
  
  -- Delete the profile
  DELETE FROM public.profiles WHERE id = profile_id;
  
  -- Delete from auth.users if exists
  DELETE FROM auth.users WHERE id = (SELECT user_id FROM public.profiles WHERE id = profile_id);
END;
$$;

-- Create a function to restore a soft-deleted profile
CREATE OR REPLACE FUNCTION public.restore_profile(profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET deleted_at = NULL
  WHERE id = profile_id;
END;
$$;