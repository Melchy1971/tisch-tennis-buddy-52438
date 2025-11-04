-- Add archived column to team_substitute_requests table
ALTER TABLE public.team_substitute_requests
ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- Create an index for better performance when filtering archived requests
CREATE INDEX idx_team_substitute_requests_archived 
ON public.team_substitute_requests(archived);