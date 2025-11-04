-- Create seasons table
CREATE TABLE IF NOT EXISTS public.seasons (
  id text PRIMARY KEY,
  label text NOT NULL,
  start_year integer NOT NULL,
  end_year integer NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.seasons IS 'Stores season information for team management';

-- Enable RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Everyone can view seasons
CREATE POLICY "Everyone can view seasons"
ON public.seasons
FOR SELECT
USING (true);

-- Admin and vorstand can insert seasons
CREATE POLICY "Admin and vorstand can insert seasons"
ON public.seasons
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

-- Admin and vorstand can update seasons
CREATE POLICY "Admin and vorstand can update seasons"
ON public.seasons
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

-- Admin and vorstand can delete seasons
CREATE POLICY "Admin and vorstand can delete seasons"
ON public.seasons
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

-- Insert initial seasons
INSERT INTO public.seasons (id, label, start_year, end_year, is_current)
VALUES 
  ('2024-2025', 'Saison 2024/25', 2024, 2025, true),
  ('2023-2024', 'Saison 2023/24', 2023, 2024, false),
  ('2022-2023', 'Saison 2022/23', 2022, 2023, false)
ON CONFLICT (id) DO NOTHING;