-- Add unique constraint to team_members table to enable upsert operations
ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_team_member_unique UNIQUE (team_id, member_id);