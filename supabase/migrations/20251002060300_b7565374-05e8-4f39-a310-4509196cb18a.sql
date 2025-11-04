-- Fix critical security issue: Restrict profile access to own profile or admin/vorstand only
-- Drop the overly permissive policy that allows all authenticated users to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create policy for users to view only their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for admins and vorstand to view all profiles (needed for user management)
CREATE POLICY "Admins and vorstand can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'vorstand'));

-- Add documentation
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 
'Users can only view their own profile data to protect sensitive personal information from unauthorized access.';

COMMENT ON POLICY "Admins and vorstand can view all profiles" ON public.profiles IS 
'Admins and board members can view all profiles for user management purposes.';