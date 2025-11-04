-- Update RLS policies to include 'entwickler' role (continued from previous migrations)

-- board_documents policies
DROP POLICY IF EXISTS "Admin and vorstand can delete board documents" ON board_documents;
CREATE POLICY "Admin, vorstand and entwickler can delete board documents"
ON board_documents FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can insert board documents" ON board_documents;
CREATE POLICY "Admin, vorstand and entwickler can insert board documents"
ON board_documents FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can update board documents" ON board_documents;
CREATE POLICY "Admin, vorstand and entwickler can update board documents"
ON board_documents FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- board_messages policies
DROP POLICY IF EXISTS "Admin and vorstand can delete board messages" ON board_messages;
CREATE POLICY "Admin, vorstand and entwickler can delete board messages"
ON board_messages FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can insert board messages" ON board_messages;
CREATE POLICY "Admin, vorstand and entwickler can insert board messages"
ON board_messages FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can update board messages" ON board_messages;
CREATE POLICY "Admin, vorstand and entwickler can update board messages"
ON board_messages FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- club_events policies
DROP POLICY IF EXISTS "Admin and vorstand can delete club events" ON club_events;
CREATE POLICY "Admin, vorstand and entwickler can delete club events"
ON club_events FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can insert club events" ON club_events;
CREATE POLICY "Admin, vorstand and entwickler can insert club events"
ON club_events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can update club events" ON club_events;
CREATE POLICY "Admin, vorstand and entwickler can update club events"
ON club_events FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- club_halls policies
DROP POLICY IF EXISTS "Admin and vorstand can delete club halls" ON club_halls;
CREATE POLICY "Admin, vorstand and entwickler can delete club halls"
ON club_halls FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can insert club halls" ON club_halls;
CREATE POLICY "Admin, vorstand and entwickler can insert club halls"
ON club_halls FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can update club halls" ON club_halls;
CREATE POLICY "Admin, vorstand and entwickler can update club halls"
ON club_halls FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- club_settings policies
DROP POLICY IF EXISTS "Admin and vorstand can insert club settings" ON club_settings;
CREATE POLICY "Admin, vorstand and entwickler can insert club settings"
ON club_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can update club settings" ON club_settings;
CREATE POLICY "Admin, vorstand and entwickler can update club settings"
ON club_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- email_distribution_lists policies
DROP POLICY IF EXISTS "Admin and vorstand can delete distribution lists" ON email_distribution_lists;
CREATE POLICY "Admin, vorstand and entwickler can delete distribution lists"
ON email_distribution_lists FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can insert distribution lists" ON email_distribution_lists;
CREATE POLICY "Admin, vorstand and entwickler can insert distribution lists"
ON email_distribution_lists FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can update distribution lists" ON email_distribution_lists;
CREATE POLICY "Admin, vorstand and entwickler can update distribution lists"
ON email_distribution_lists FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can view distribution lists" ON email_distribution_lists;
CREATE POLICY "Admin, vorstand and entwickler can view distribution lists"
ON email_distribution_lists FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- feedback policies
DROP POLICY IF EXISTS "Admin and vorstand can delete feedback" ON feedback;
CREATE POLICY "Admin, vorstand and entwickler can delete feedback"
ON feedback FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can update feedback" ON feedback;
CREATE POLICY "Admin, vorstand and entwickler can update feedback"
ON feedback FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- match_availability policies
DROP POLICY IF EXISTS "Privileged roles can delete availability" ON match_availability;
CREATE POLICY "Privileged roles can delete availability"
ON match_availability FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Users can insert own availability" ON match_availability;
CREATE POLICY "Users can insert own availability"
ON match_availability FOR INSERT
WITH CHECK ((auth.uid() = player_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Users can update availability" ON match_availability;
CREATE POLICY "Users can update availability"
ON match_availability FOR UPDATE
USING ((auth.uid() = player_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- match_pins policies
DROP POLICY IF EXISTS "Admin and vorstand can delete match pins" ON match_pins;
CREATE POLICY "Admin, vorstand and entwickler can delete match pins"
ON match_pins FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can insert match pins" ON match_pins;
CREATE POLICY "Admin, vorstand and entwickler can insert match pins"
ON match_pins FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can update match pins" ON match_pins;
CREATE POLICY "Admin, vorstand and entwickler can update match pins"
ON match_pins FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admin and vorstand can view match pins" ON match_pins;
CREATE POLICY "Admin, vorstand and entwickler can view match pins"
ON match_pins FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

-- matches policies
DROP POLICY IF EXISTS "Admins and vorstand can delete matches" ON matches;
CREATE POLICY "Entwickler can delete all matches"
ON matches FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admins, moderators, vorstand and mannschaftsfuehrer can insert" ON matches;
CREATE POLICY "Entwickler can insert matches"
ON matches FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));

DROP POLICY IF EXISTS "Admins, moderators, vorstand and mannschaftsfuehrer can update" ON matches;
CREATE POLICY "Entwickler can update matches"
ON matches FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR has_role(auth.uid(), 'entwickler'::app_role));