-- Create teams table for persistent storage
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id text NOT NULL,
  name text NOT NULL,
  league text NOT NULL,
  division text,
  training_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  home_match jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create team_members junction table
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  member_id text NOT NULL,
  is_captain boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Everyone can view teams"
  ON public.teams
  FOR SELECT
  USING (true);

CREATE POLICY "Admins, vorstand and moderators can insert teams"
  ON public.teams
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'vorstand'::app_role) OR 
    has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Admins, vorstand and moderators can update teams"
  ON public.teams
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'vorstand'::app_role) OR 
    has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Admins and vorstand can delete teams"
  ON public.teams
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'vorstand'::app_role)
  );

-- RLS Policies for team_members
CREATE POLICY "Everyone can view team members"
  ON public.team_members
  FOR SELECT
  USING (true);

CREATE POLICY "Admins, vorstand and moderators can insert team members"
  ON public.team_members
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'vorstand'::app_role) OR 
    has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Admins, vorstand and moderators can update team members"
  ON public.team_members
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'vorstand'::app_role) OR 
    has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Admins, vorstand and moderators can delete team members"
  ON public.team_members
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'vorstand'::app_role) OR 
    has_role(auth.uid(), 'moderator'::app_role)
  );

-- Add trigger for updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();