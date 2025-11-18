-- Add all remaining missing columns and tables

-- Add missing columns to teams table
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS division TEXT,
  ADD COLUMN IF NOT EXISTS training_slots JSONB DEFAULT '[]'::jsonb;

-- Create training_sessions table
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view training sessions"
  ON public.training_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Board members can manage training sessions"
  ON public.training_sessions
  FOR ALL
  USING (is_admin_or_board(auth.uid()));