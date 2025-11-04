-- Add optional position field to team_members for storing lineup positions
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS position text;

COMMENT ON COLUMN public.team_members.position IS 'Optional lineup position identifier (e.g. 1.1, 1.2) for the member within the team.';
