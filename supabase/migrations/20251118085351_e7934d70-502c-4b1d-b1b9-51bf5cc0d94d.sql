-- Comprehensive schema fix: Add all missing columns that the code expects

-- Add missing columns to team_substitute_assignments
ALTER TABLE public.team_substitute_assignments
  ADD COLUMN IF NOT EXISTS team_name TEXT,
  ADD COLUMN IF NOT EXISTS substitute_team_name TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add missing columns to team_members  
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false;

-- Add missing columns to teams
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS home_match TEXT;

-- Add missing columns to seasons
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS start_year INTEGER,
  ADD COLUMN IF NOT EXISTS end_year INTEGER,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Update seasons to populate label, start_year, end_year from existing data
UPDATE public.seasons
SET 
  label = name,
  start_year = EXTRACT(YEAR FROM start_date)::INTEGER,
  end_year = EXTRACT(YEAR FROM end_date)::INTEGER
WHERE label IS NULL AND start_date IS NOT NULL;

-- Create index for better performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_team_substitute_assignments_team_name ON public.team_substitute_assignments(team_name);
CREATE INDEX IF NOT EXISTS idx_team_substitute_assignments_archived ON public.team_substitute_assignments(archived);
CREATE INDEX IF NOT EXISTS idx_teams_category ON public.teams(category);
CREATE INDEX IF NOT EXISTS idx_seasons_category ON public.seasons(category);