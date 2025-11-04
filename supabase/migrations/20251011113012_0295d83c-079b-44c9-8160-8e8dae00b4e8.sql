-- Revert DELETE policy for matches table to only admin and vorstand
DROP POLICY IF EXISTS "Admins, vorstand and mannschaftsfuehrer can delete matches" ON public.matches;

CREATE POLICY "Admins and vorstand can delete matches"
ON public.matches
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);