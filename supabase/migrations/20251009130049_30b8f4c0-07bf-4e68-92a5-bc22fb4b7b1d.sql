-- Add valid_until field to team_substitute_requests
ALTER TABLE public.team_substitute_requests
ADD COLUMN valid_until DATE;

-- Add comment to explain the field
COMMENT ON COLUMN public.team_substitute_requests.valid_until IS 'Date until which this substitute request is valid (typically the match date)';