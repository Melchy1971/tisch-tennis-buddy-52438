-- Create table for substitute player assignments across teams
CREATE TABLE public.team_substitute_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  substitute_player_id UUID NOT NULL,
  substitute_team_name TEXT NOT NULL,
  requested_by UUID NOT NULL,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_substitute_assignments ENABLE ROW LEVEL SECURITY;

-- Everyone can view substitute assignments
CREATE POLICY "Everyone can view substitute assignments"
ON public.team_substitute_assignments
FOR SELECT
USING (true);

-- Mannschaftsführer, admin and vorstand can insert assignments
CREATE POLICY "Authorized users can insert substitute assignments"
ON public.team_substitute_assignments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Mannschaftsführer, admin and vorstand can update assignments
CREATE POLICY "Authorized users can update substitute assignments"
ON public.team_substitute_assignments
FOR UPDATE
USING (
  has_role(auth.uid(), 'mannschaftsfuehrer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Admin and vorstand can delete assignments
CREATE POLICY "Admin and vorstand can delete substitute assignments"
ON public.team_substitute_assignments
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_team_substitute_assignments_updated_at
BEFORE UPDATE ON public.team_substitute_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();