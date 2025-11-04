-- Add archived column to team_substitute_assignments
ALTER TABLE public.team_substitute_assignments
ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.team_substitute_assignments.archived IS 'Indicates if this substitute assignment has been archived';