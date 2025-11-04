-- Create club_halls table for storing hall information
CREATE TABLE public.club_halls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hall_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.club_halls ENABLE ROW LEVEL SECURITY;

-- Everyone can view halls
CREATE POLICY "Everyone can view club halls"
ON public.club_halls
FOR SELECT
TO authenticated
USING (true);

-- Admin and vorstand can insert halls
CREATE POLICY "Admin and vorstand can insert club halls"
ON public.club_halls
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Admin and vorstand can update halls
CREATE POLICY "Admin and vorstand can update club halls"
ON public.club_halls
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Admin and vorstand can delete halls
CREATE POLICY "Admin and vorstand can delete club halls"
ON public.club_halls
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_club_halls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_club_halls_updated_at
BEFORE UPDATE ON public.club_halls
FOR EACH ROW
EXECUTE FUNCTION public.update_club_halls_updated_at();