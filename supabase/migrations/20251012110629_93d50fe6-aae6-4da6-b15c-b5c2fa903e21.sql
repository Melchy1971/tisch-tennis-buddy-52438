-- Update remaining RLS policies to include 'entwickler' role (part 2)

-- pin_import_logs policies
DROP POLICY IF EXISTS "Admins can insert pin import logs" ON pin_import_logs;
CREATE POLICY "Admins, vorstand and entwickler can insert pin import logs"
ON pin_import_logs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admins can view all pin import logs" ON pin_import_logs;
CREATE POLICY "Admins, vorstand and entwickler can view all pin import logs"
ON pin_import_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- profiles policies
DROP POLICY IF EXISTS "Admins and vorstand can delete profiles" ON profiles;
CREATE POLICY "Admins, vorstand and entwickler can delete profiles"
ON profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admins, vorstand and mitglied can update all profiles" ON profiles;
CREATE POLICY "Admins, vorstand, mitglied and entwickler can update all profiles"
ON profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'mitglied'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'mitglied'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admins, vorstand and mitglied can view all profiles including d" ON profiles;
CREATE POLICY "Admins, vorstand, mitglied and entwickler can view all profiles"
ON profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'mitglied'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
CREATE POLICY "profiles_insert_policy"
ON profiles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role) OR (auth.uid() = user_id));

-- seasons policies
DROP POLICY IF EXISTS "Admin and vorstand can delete seasons" ON seasons;
CREATE POLICY "Admin, vorstand and entwickler can delete seasons"
ON seasons FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can insert seasons" ON seasons;
CREATE POLICY "Admin, vorstand and entwickler can insert seasons"
ON seasons FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can update seasons" ON seasons;
CREATE POLICY "Admin, vorstand and entwickler can update seasons"
ON seasons FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- team_members policies
DROP POLICY IF EXISTS "Admins, vorstand and moderators can delete team members" ON team_members;
CREATE POLICY "Admins, vorstand, moderators and entwickler can delete team members"
ON team_members FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admins, vorstand and moderators can insert team members" ON team_members;
CREATE POLICY "Admins, vorstand, moderators and entwickler can insert team members"
ON team_members FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admins, vorstand and moderators can update team members" ON team_members;
CREATE POLICY "Admins, vorstand, moderators and entwickler can update team members"
ON team_members FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- team_substitute_assignments policies
DROP POLICY IF EXISTS "Admin and vorstand can delete substitute assignments" ON team_substitute_assignments;
CREATE POLICY "Entwickler can delete substitute assignments"
ON team_substitute_assignments FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Authorized users can insert substitute assignments" ON team_substitute_assignments;
CREATE POLICY "Entwickler can insert substitute assignments"
ON team_substitute_assignments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Authorized users can update substitute assignments" ON team_substitute_assignments;
CREATE POLICY "Entwickler can update substitute assignments"
ON team_substitute_assignments FOR UPDATE
USING (has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- team_substitute_requests policies
DROP POLICY IF EXISTS "Authorized users can delete substitute requests" ON team_substitute_requests;
CREATE POLICY "Entwickler can delete substitute requests"
ON team_substitute_requests FOR DELETE
USING (has_role(auth.uid(), 'mitglied'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Authorized users can insert substitute requests" ON team_substitute_requests;
CREATE POLICY "Entwickler can insert substitute requests"
ON team_substitute_requests FOR INSERT
WITH CHECK (has_role(auth.uid(), 'mitglied'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Authorized users can update substitute requests" ON team_substitute_requests;
CREATE POLICY "Entwickler can update substitute requests"
ON team_substitute_requests FOR UPDATE
USING (has_role(auth.uid(), 'mitglied'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- teams policies
DROP POLICY IF EXISTS "Admins and vorstand can delete teams" ON teams;
CREATE POLICY "Admins, vorstand and entwickler can delete teams"
ON teams FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admins, vorstand and moderators can insert teams" ON teams;
CREATE POLICY "Admins, vorstand, moderators and entwickler can insert teams"
ON teams FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admins, vorstand and moderators can update teams" ON teams;
CREATE POLICY "Admins, vorstand, moderators and entwickler can update teams"
ON teams FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- training_sessions policies
DROP POLICY IF EXISTS "Admin and vorstand can delete all training sessions" ON training_sessions;
CREATE POLICY "Admin, vorstand and entwickler can delete all training sessions"
ON training_sessions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- user_roles policies
DROP POLICY IF EXISTS "Admins and vorstand can delete roles" ON user_roles;
CREATE POLICY "Admins, vorstand and entwickler can delete roles"
ON user_roles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role) OR ((user_id = auth.uid()) AND (role <> 'admin'::app_role)));

DROP POLICY IF EXISTS "Admins and vorstand can insert roles" ON user_roles;
CREATE POLICY "Admins, vorstand and entwickler can insert roles"
ON user_roles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admins and vorstand can update roles" ON user_roles;
CREATE POLICY "Admins, vorstand and entwickler can update roles"
ON user_roles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));