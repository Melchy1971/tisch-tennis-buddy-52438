-- Add position column to team_members table
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS position TEXT;