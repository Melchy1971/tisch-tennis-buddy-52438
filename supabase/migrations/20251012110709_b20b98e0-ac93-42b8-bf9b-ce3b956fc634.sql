-- Update only remaining policies that haven't been updated yet

-- profiles policies (already done, skipping)
-- seasons policies (already done, skipping)
-- team_members policies (already done, skipping)

-- team_substitute_assignments policies
DROP POLICY IF EXISTS "Admin and vorstand can delete substitute assignments" ON team_substitute_assignments;
DROP POLICY IF EXISTS "Entwickler can delete substitute assignments" ON team_substitute_assignments;
CREATE POLICY "Entwickler can delete substitute assignments"
ON team_substitute_assignments FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Authorized users can insert substitute assignments" ON team_substitute_assignments;
DROP POLICY IF EXISTS "Entwickler can insert substitute assignments" ON team_substitute_assignments;
CREATE POLICY "Entwickler can insert substitute assignments"
ON team_substitute_assignments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Authorized users can update substitute assignments" ON team_substitute_assignments;
DROP POLICY IF EXISTS "Entwickler can update substitute assignments" ON team_substitute_assignments;
CREATE POLICY "Entwickler can update substitute assignments"
ON team_substitute_assignments FOR UPDATE
USING (has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- team_substitute_requests policies
DROP POLICY IF EXISTS "Authorized users can delete substitute requests" ON team_substitute_requests;
DROP POLICY IF EXISTS "Entwickler can delete substitute requests" ON team_substitute_requests;
CREATE POLICY "Entwickler can delete substitute requests"
ON team_substitute_requests FOR DELETE
USING (has_role(auth.uid(), 'mitglied'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Authorized users can insert substitute requests" ON team_substitute_requests;
DROP POLICY IF EXISTS "Entwickler can insert substitute requests" ON team_substitute_requests;
CREATE POLICY "Entwickler can insert substitute requests"
ON team_substitute_requests FOR INSERT
WITH CHECK (has_role(auth.uid(), 'mitglied'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Authorized users can update substitute requests" ON team_substitute_requests;
DROP POLICY IF EXISTS "Entwickler can update substitute requests" ON team_substitute_requests;
CREATE POLICY "Entwickler can update substitute requests"
ON team_substitute_requests FOR UPDATE
USING (has_role(auth.uid(), 'mitglied'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- teams policies (already done, skipping)
-- training_sessions policies (already done, skipping)
-- user_roles policies (already done, skipping)