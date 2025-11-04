-- Add missing columns to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS home_team TEXT,
ADD COLUMN IF NOT EXISTS away_team TEXT,
ADD COLUMN IF NOT EXISTS club_team TEXT;