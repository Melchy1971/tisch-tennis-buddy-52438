-- Create match_pins table to store spielpins and spielpartie pins
CREATE TABLE IF NOT EXISTS public.match_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  spielpin text NOT NULL,
  spielpartie_pin text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_pins ENABLE ROW LEVEL SECURITY;

-- Everyone can view match pins
CREATE POLICY "Everyone can view match pins"
ON public.match_pins
FOR SELECT
USING (true);

-- Admins, vorstand and moderators can insert match pins
CREATE POLICY "Admins, vorstand and moderators can insert match pins"
ON public.match_pins
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Admins, vorstand and moderators can update match pins
CREATE POLICY "Admins, vorstand and moderators can update match pins"
ON public.match_pins
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Admins, vorstand and moderators can delete match pins
CREATE POLICY "Admins, vorstand and moderators can delete match pins"
ON public.match_pins
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_match_pins_updated_at
BEFORE UPDATE ON public.match_pins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();