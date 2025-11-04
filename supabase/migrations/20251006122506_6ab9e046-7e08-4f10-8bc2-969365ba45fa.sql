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