-- Create table for player availability per match
CREATE TABLE public.match_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable', 'substitute_needed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- Enable RLS
ALTER TABLE public.match_availability ENABLE ROW LEVEL SECURITY;

-- Everyone can view availability
CREATE POLICY "Everyone can view match availability"
ON public.match_availability
FOR SELECT
USING (true);

-- Authenticated users can insert their own availability
CREATE POLICY "Users can insert own availability"
ON public.match_availability
FOR INSERT
WITH CHECK (auth.uid() = player_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role));

-- Users can update their own availability, privileged roles can update all
CREATE POLICY "Users can update availability"
ON public.match_availability
FOR UPDATE
USING (auth.uid() = player_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role));

-- Privileged roles can delete availability
CREATE POLICY "Privileged roles can delete availability"
ON public.match_availability
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_match_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_match_availability_updated_at
BEFORE UPDATE ON public.match_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_match_availability_updated_at();