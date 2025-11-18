-- Fix missing tables and database functions for profile management and substitute assignments

-- Create pin_import_logs table for tracking PIN imports
CREATE TABLE IF NOT EXISTS public.pin_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by UUID REFERENCES auth.users(id) NOT NULL,
  import_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  file_name TEXT,
  pins_imported INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.pin_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board members can manage pin import logs"
  ON public.pin_import_logs
  FOR ALL
  USING (is_admin_or_board(auth.uid()));

-- Create team_substitute_assignments table for managing substitute assignments
CREATE TABLE IF NOT EXISTS public.team_substitute_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.team_substitute_requests(id) ON DELETE CASCADE,
  substitute_player_id UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id),
  requested_by UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.team_substitute_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view substitute assignments"
  ON public.team_substitute_assignments
  FOR SELECT
  USING (true);

CREATE POLICY "Board members can manage substitute assignments"
  ON public.team_substitute_assignments
  FOR ALL
  USING (is_admin_or_board(auth.uid()));

-- Create soft_delete_profile function
CREATE OR REPLACE FUNCTION public.soft_delete_profile(profile_id UUID)
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

-- Create restore_profile function
CREATE OR REPLACE FUNCTION public.restore_profile(profile_id UUID)
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

-- Create permanently_delete_profile function
CREATE OR REPLACE FUNCTION public.permanently_delete_profile(profile_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete related records first
  DELETE FROM public.user_roles WHERE user_id = profile_id;
  DELETE FROM public.team_members WHERE user_id = profile_id;
  DELETE FROM public.match_availability WHERE player_id = profile_id;
  DELETE FROM public.team_substitute_requests WHERE player_id = profile_id;
  
  -- Delete the profile
  DELETE FROM public.profiles WHERE id = profile_id;
END;
$$;