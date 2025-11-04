-- Fix critical security issue: Restrict profile access to authenticated users only
-- Drop the existing public policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Add comment for documentation
COMMENT ON POLICY "Authenticated users can view all profiles" ON public.profiles IS 
'Only authenticated club members can view profile data. This protects sensitive personal information (emails, phone numbers, addresses, birthdays) from unauthorized access.';