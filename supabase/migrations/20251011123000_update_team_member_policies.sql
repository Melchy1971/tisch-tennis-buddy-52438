-- Allow team captains, admins, and board members to manage team member assignments
DROP POLICY IF EXISTS "Admins, vorstand and moderators can insert team members" ON public.team_members;
CREATE POLICY "Admins, vorstand, moderators and mannschaftsfuehrer can insert team members"
ON public.team_members
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role) OR
  has_role(auth.uid(), 'moderator'::app_role) OR
  has_role(auth.uid(), 'mannschaftsfuehrer'::app_role)
);

DROP POLICY IF EXISTS "Admins, vorstand and moderators can update team members" ON public.team_members;
CREATE POLICY "Admins, vorstand, moderators and mannschaftsfuehrer can update team members"
ON public.team_members
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role) OR
  has_role(auth.uid(), 'moderator'::app_role) OR
  has_role(auth.uid(), 'mannschaftsfuehrer'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role) OR
  has_role(auth.uid(), 'moderator'::app_role) OR
  has_role(auth.uid(), 'mannschaftsfuehrer'::app_role)
);

DROP POLICY IF EXISTS "Admins, vorstand and moderators can delete team members" ON public.team_members;
CREATE POLICY "Admins, vorstand, moderators and mannschaftsfuehrer can delete team members"
ON public.team_members
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role) OR
  has_role(auth.uid(), 'moderator'::app_role) OR
  has_role(auth.uid(), 'mannschaftsfuehrer'::app_role)
);
