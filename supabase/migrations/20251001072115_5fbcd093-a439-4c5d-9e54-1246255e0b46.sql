-- Update user_roles policies to prevent admins from locking themselves out
-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Create separate policies for different operations
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- For DELETE: Allow if user is admin OR if deleting own non-admin roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (user_id = auth.uid() AND role != 'admin'::app_role)
);