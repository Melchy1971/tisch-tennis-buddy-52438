-- Fix permanently_delete_profile function to handle type mismatch
CREATE OR REPLACE FUNCTION public.permanently_delete_profile(profile_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get the user_id from the profile
  SELECT user_id INTO target_user_id FROM public.profiles WHERE id = profile_id;
  
  -- Delete associated team members first (cast uuid to text for comparison)
  DELETE FROM public.team_members WHERE member_id = target_user_id::text;
  
  -- Delete associated user roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Delete the profile
  DELETE FROM public.profiles WHERE id = profile_id;
  
  -- Delete from auth.users if exists
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$function$;