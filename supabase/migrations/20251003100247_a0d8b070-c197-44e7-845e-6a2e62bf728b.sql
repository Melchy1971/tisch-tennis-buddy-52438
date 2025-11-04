-- Fix team_members table to restrict access to authenticated users only
-- This prevents public exposure of team member identities

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Everyone can view team members" ON public.team_members;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (true);

-- Add a comment to document the security decision
COMMENT ON POLICY "Authenticated users can view team members" ON public.team_members IS 
'Restricts team member visibility to authenticated users to prevent public scraping of member identities';