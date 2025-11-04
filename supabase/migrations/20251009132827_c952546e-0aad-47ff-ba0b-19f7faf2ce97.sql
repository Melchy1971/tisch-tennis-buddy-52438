-- Add match_id to team_substitute_requests to link substitute requests to specific matches
ALTER TABLE public.team_substitute_requests
ADD COLUMN match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.team_substitute_requests.match_id IS 'Reference to the specific match where the substitute is needed';