-- Update RLS policies for match_pins to only allow admin and vorstand roles

-- Drop existing policies
DROP POLICY IF EXISTS "Admins, vorstand and moderators can delete match pins" ON public.match_pins;
DROP POLICY IF EXISTS "Admins, vorstand and moderators can insert match pins" ON public.match_pins;
DROP POLICY IF EXISTS "Admins, vorstand and moderators can update match pins" ON public.match_pins;
DROP POLICY IF EXISTS "Only authorized roles can view match pins" ON public.match_pins;

-- Create new policies restricted to admin and vorstand only
CREATE POLICY "Admin and vorstand can view match pins"
ON public.match_pins
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

CREATE POLICY "Admin and vorstand can insert match pins"
ON public.match_pins
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

CREATE POLICY "Admin and vorstand can update match pins"
ON public.match_pins
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

CREATE POLICY "Admin and vorstand can delete match pins"
ON public.match_pins
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);