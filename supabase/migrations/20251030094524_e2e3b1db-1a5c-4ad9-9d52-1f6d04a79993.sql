-- Allow admin and vorstand to remove "mitglied" role
-- A profile can have zero roles

DROP POLICY IF EXISTS "Admins, vorstand and entwickler can delete roles" ON public.user_roles;

CREATE POLICY "Admins, vorstand and entwickler can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'vorstand'::app_role) 
  OR has_role(auth.uid(), 'entwickler'::app_role)
  OR (
    -- Users can delete their own non-admin roles
    (user_id = auth.uid()) AND (role <> 'admin'::app_role)
  )
);