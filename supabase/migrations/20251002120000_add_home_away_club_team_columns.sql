-- Add home_team, away_team and club_team columns to matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_team TEXT,
  ADD COLUMN IF NOT EXISTS away_team TEXT,
  ADD COLUMN IF NOT EXISTS club_team TEXT;

-- Populate new columns for existing records
UPDATE public.matches
SET
  home_team = COALESCE(home_team, team),
  away_team = COALESCE(away_team, opponent),
  club_team = COALESCE(club_team, team);
