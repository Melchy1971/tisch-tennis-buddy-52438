-- Fix critical security issue: Restrict match pin access to authorized roles only
-- Drop the policy that allows all authenticated users to view match pins
DROP POLICY IF EXISTS "Authenticated users can view match pins" ON public.match_pins;

-- Create new policy that restricts access to only users who manage matches
CREATE POLICY "Only authorized roles can view match pins" 
ON public.match_pins 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'vorstand') OR 
  has_role(auth.uid(), 'moderator') OR 
  has_role(auth.uid(), 'mannschaftsfuehrer')
);

-- Add documentation
COMMENT ON POLICY "Only authorized roles can view match pins" ON public.match_pins IS 
'Only admins, board members (vorstand), moderators, and team captains (mannschaftsfuehrer) can view match authentication codes. This prevents unauthorized users from accessing sensitive match access credentials that could be used to impersonate legitimate users or gain unauthorized access to match systems.';