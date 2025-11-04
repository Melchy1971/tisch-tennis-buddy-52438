-- Create all missing tables for match and team management features

-- Create match_availability table
CREATE TABLE IF NOT EXISTS public.match_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- Create team_substitute_requests table
CREATE TABLE IF NOT EXISTS public.team_substitute_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  team_name TEXT,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  needs_substitute BOOLEAN DEFAULT false,
  notes TEXT,
  marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  valid_until TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create match_pins table
CREATE TABLE IF NOT EXISTS public.match_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  spielpin TEXT,
  spielpartie_pin TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(match_id)
);

-- Enable RLS on new tables
ALTER TABLE public.match_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_substitute_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_pins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_availability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'match_availability' 
    AND policyname = 'Players can view match availability'
  ) THEN
    CREATE POLICY "Players can view match availability"
      ON public.match_availability FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'match_availability' 
    AND policyname = 'Players can manage own availability'
  ) THEN
    CREATE POLICY "Players can manage own availability"
      ON public.match_availability FOR ALL
      USING (auth.uid() = player_id OR is_admin_or_board(auth.uid()));
  END IF;
END$$;

-- RLS Policies for team_substitute_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'team_substitute_requests' 
    AND policyname = 'Team members can view substitute requests'
  ) THEN
    CREATE POLICY "Team members can view substitute requests"
      ON public.team_substitute_requests FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'team_substitute_requests' 
    AND policyname = 'Players can manage own requests'
  ) THEN
    CREATE POLICY "Players can manage own requests"
      ON public.team_substitute_requests FOR ALL
      USING (auth.uid() = player_id OR is_admin_or_board(auth.uid()));
  END IF;
END$$;

-- RLS Policies for match_pins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'match_pins' 
    AND policyname = 'Team members can view pins'
  ) THEN
    CREATE POLICY "Team members can view pins"
      ON public.match_pins FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'match_pins' 
    AND policyname = 'Board can manage pins'
  ) THEN
    CREATE POLICY "Board can manage pins"
      ON public.match_pins FOR ALL
      USING (is_admin_or_board(auth.uid()));
  END IF;
END$$;

-- Add update triggers
DROP TRIGGER IF EXISTS update_match_availability_updated_at ON public.match_availability;
CREATE TRIGGER update_match_availability_updated_at
  BEFORE UPDATE ON public.match_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_substitute_requests_updated_at ON public.team_substitute_requests;
CREATE TRIGGER update_team_substitute_requests_updated_at
  BEFORE UPDATE ON public.team_substitute_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_match_pins_updated_at ON public.match_pins;
CREATE TRIGGER update_match_pins_updated_at
  BEFORE UPDATE ON public.match_pins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();