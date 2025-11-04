-- Fix critical security issues with RLS policies

-- 1. Fix club_settings - Restrict access to SMTP credentials
DROP POLICY IF EXISTS "Everyone can view club settings" ON public.club_settings;

CREATE POLICY "Only admin, vorstand and entwickler can view club settings"
ON public.club_settings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'vorstand'::app_role) 
  OR has_role(auth.uid(), 'entwickler'::app_role)
);

-- 2. Fix profiles - Users should only see their own data, privileged roles see all
DROP POLICY IF EXISTS "Admins, vorstand, mitglied and entwickler can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Admin, vorstand and entwickler can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'vorstand'::app_role) 
  OR has_role(auth.uid(), 'entwickler'::app_role)
);

-- 3. Fix feedback - Only author and privileged roles can view
DROP POLICY IF EXISTS "Everyone can view feedback" ON public.feedback;

CREATE POLICY "Users can view own feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin, vorstand and entwickler can view all feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'vorstand'::app_role) 
  OR has_role(auth.uid(), 'entwickler'::app_role)
);

-- 4. Fix match_availability - Require authentication
DROP POLICY IF EXISTS "Everyone can view match availability" ON public.match_availability;

CREATE POLICY "Authenticated users can view match availability"
ON public.match_availability
FOR SELECT
TO authenticated
USING (true);