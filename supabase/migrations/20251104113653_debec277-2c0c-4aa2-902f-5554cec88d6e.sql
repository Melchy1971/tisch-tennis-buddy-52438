-- Add missing columns to existing tables

-- Add missing columns to matches table
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_score INTEGER,
  ADD COLUMN IF NOT EXISTS away_score INTEGER,
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS time TIME,
  ADD COLUMN IF NOT EXISTS club_team TEXT,
  ADD COLUMN IF NOT EXISTS home_team TEXT,
  ADD COLUMN IF NOT EXISTS away_team TEXT,
  ADD COLUMN IF NOT EXISTS team TEXT;

-- Add season_id to teams table
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS season_id TEXT DEFAULT '2024-2025';

-- Add missing columns to board_documents table
ALTER TABLE public.board_documents
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Add email settings columns to club_settings table
ALTER TABLE public.club_settings
  ADD COLUMN IF NOT EXISTS email_provider_type TEXT,
  ADD COLUMN IF NOT EXISTS email_from_address TEXT,
  ADD COLUMN IF NOT EXISTS email_smtp_server TEXT,
  ADD COLUMN IF NOT EXISTS email_smtp_port INTEGER,
  ADD COLUMN IF NOT EXISTS email_smtp_username TEXT,
  ADD COLUMN IF NOT EXISTS email_smtp_password TEXT,
  ADD COLUMN IF NOT EXISTS email_smtp_use_tls BOOLEAN DEFAULT true;

-- Create seasons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on seasons table
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seasons (using DO block to avoid errors if they exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'seasons' 
    AND policyname = 'Anyone can view seasons'
  ) THEN
    CREATE POLICY "Anyone can view seasons"
      ON public.seasons FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'seasons' 
    AND policyname = 'Board members can manage seasons'
  ) THEN
    CREATE POLICY "Board members can manage seasons"
      ON public.seasons FOR ALL
      USING (is_admin_or_board(auth.uid()));
  END IF;
END$$;

-- Add update trigger for seasons
DROP TRIGGER IF EXISTS update_seasons_updated_at ON public.seasons;
CREATE TRIGGER update_seasons_updated_at
  BEFORE UPDATE ON public.seasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default season data
INSERT INTO public.seasons (id, name, is_current, start_date, end_date)
VALUES ('2024-2025', 'Saison 2024/2025', true, '2024-09-01', '2025-08-31')
ON CONFLICT (id) DO NOTHING;