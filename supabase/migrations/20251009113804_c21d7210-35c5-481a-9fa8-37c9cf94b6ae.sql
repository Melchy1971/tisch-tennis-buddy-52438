-- Create table for team player substitute requests
CREATE TABLE public.team_substitute_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name TEXT NOT NULL,
  player_id UUID NOT NULL,
  needs_substitute BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  marked_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_name, player_id)
);

-- Enable RLS
ALTER TABLE public.team_substitute_requests ENABLE ROW LEVEL SECURITY;

-- Everyone can view substitute requests
CREATE POLICY "Everyone can view substitute requests"
ON public.team_substitute_requests
FOR SELECT
USING (true);

-- Mitglied, mannschaftsfuehrer, admin and vorstand can insert
CREATE POLICY "Authorized users can insert substitute requests"
ON public.team_substitute_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'mitglied'::app_role) OR
  has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Mitglied, mannschaftsfuehrer, admin and vorstand can update
CREATE POLICY "Authorized users can update substitute requests"
ON public.team_substitute_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'mitglied'::app_role) OR
  has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Mitglied, mannschaftsfuehrer, admin and vorstand can delete
CREATE POLICY "Authorized users can delete substitute requests"
ON public.team_substitute_requests
FOR DELETE
USING (
  has_role(auth.uid(), 'mitglied'::app_role) OR
  has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_team_substitute_requests_updated_at
BEFORE UPDATE ON public.team_substitute_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();