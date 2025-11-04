-- Fix critical security issue: Restrict match pin access to authenticated users only
-- Drop the overly permissive policy that allows anyone (including unauthenticated users) to view match pins
DROP POLICY IF EXISTS "Everyone can view match pins" ON public.match_pins;

-- Create new policy that requires authentication to view match pins
CREATE POLICY "Authenticated users can view match pins" 
ON public.match_pins 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Add documentation
COMMENT ON POLICY "Authenticated users can view match pins" ON public.match_pins IS 
'Only authenticated club members can view match access codes (spielpin, spielpartie_pin). This prevents unauthorized access to match systems and protects sensitive access credentials from public exposure.';