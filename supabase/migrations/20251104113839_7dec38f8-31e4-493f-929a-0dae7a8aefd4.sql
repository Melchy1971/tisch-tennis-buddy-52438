-- Create all missing tables and columns

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create club_halls table
CREATE TABLE IF NOT EXISTS public.club_halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  address TEXT,
  hall_number INTEGER UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add missing status column to matches table
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

-- Add member_id column to team_members (keeping user_id for backward compatibility)
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update member_id to match user_id where it's null
UPDATE public.team_members
SET member_id = user_id
WHERE member_id IS NULL AND user_id IS NOT NULL;

-- Enable RLS on new tables
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_halls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'feedback' 
    AND policyname = 'Users can view own feedback'
  ) THEN
    CREATE POLICY "Users can view own feedback"
      ON public.feedback FOR SELECT
      USING (auth.uid() = user_id OR is_admin_or_board(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'feedback' 
    AND policyname = 'Users can create own feedback'
  ) THEN
    CREATE POLICY "Users can create own feedback"
      ON public.feedback FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'feedback' 
    AND policyname = 'Users can update own feedback'
  ) THEN
    CREATE POLICY "Users can update own feedback"
      ON public.feedback FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'feedback' 
    AND policyname = 'Admins can manage all feedback'
  ) THEN
    CREATE POLICY "Admins can manage all feedback"
      ON public.feedback FOR ALL
      USING (is_admin_or_board(auth.uid()));
  END IF;
END$$;

-- RLS Policies for club_halls
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'club_halls' 
    AND policyname = 'Anyone can view halls'
  ) THEN
    CREATE POLICY "Anyone can view halls"
      ON public.club_halls FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'club_halls' 
    AND policyname = 'Admins can manage halls'
  ) THEN
    CREATE POLICY "Admins can manage halls"
      ON public.club_halls FOR ALL
      USING (is_admin_or_board(auth.uid()));
  END IF;
END$$;

-- Add update triggers
DROP TRIGGER IF EXISTS update_feedback_updated_at ON public.feedback;
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_club_halls_updated_at ON public.club_halls;
CREATE TRIGGER update_club_halls_updated_at
  BEFORE UPDATE ON public.club_halls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();