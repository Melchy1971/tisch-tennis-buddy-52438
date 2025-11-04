-- Delete all team members first (they reference teams)
DELETE FROM public.team_members;

-- Delete all teams (they reference seasons)
DELETE FROM public.teams;

-- Delete all seasons
DELETE FROM public.seasons;