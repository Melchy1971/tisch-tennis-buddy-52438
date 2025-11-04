-- Update RLS policies to allow 'mitglied' role to update profiles

DROP POLICY IF EXISTS "Admins and vorstand can update all profiles" ON public.profiles;

CREATE POLICY "Admins, vorstand and mitglied can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role) OR 
  has_role(auth.uid(), 'mitglied'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role) OR 
  has_role(auth.uid(), 'mitglied'::app_role)
);

DROP POLICY IF EXISTS "Admins and vorstand can view all profiles including deleted" ON public.profiles;

CREATE POLICY "Admins, vorstand and mitglied can view all profiles including deleted" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role) OR 
  has_role(auth.uid(), 'mitglied'::app_role)
);