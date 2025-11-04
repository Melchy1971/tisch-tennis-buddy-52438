-- Aktualisiere alle bestehenden Funktionen mit korrektem search_path

CREATE OR REPLACE FUNCTION public.update_match_availability_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_profile(profile_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET deleted_at = NULL
  WHERE id = profile_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_profile(profile_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET deleted_at = now()
  WHERE id = profile_id;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.get_first_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT user_id 
  FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;