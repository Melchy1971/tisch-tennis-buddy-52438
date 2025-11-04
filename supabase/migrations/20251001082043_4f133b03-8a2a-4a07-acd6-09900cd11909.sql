-- Update RLS policies for matches to include mannschaftsfuehrer
DROP POLICY IF EXISTS "Admins, moderators and vorstand can insert matches" ON matches;
CREATE POLICY "Admins, moderators, vorstand and mannschaftsfuehrer can insert matches"
ON matches FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role) OR
  has_role(auth.uid(), 'mannschaftsfuehrer'::app_role)
);

DROP POLICY IF EXISTS "Admins, moderators and vorstand can update matches" ON matches;
CREATE POLICY "Admins, moderators, vorstand and mannschaftsfuehrer can update matches"
ON matches FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role) OR
  has_role(auth.uid(), 'mannschaftsfuehrer'::app_role)
);