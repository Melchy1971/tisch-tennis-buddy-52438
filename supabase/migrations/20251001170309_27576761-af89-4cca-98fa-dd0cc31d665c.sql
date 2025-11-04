-- Create club_settings table for storing design customization
CREATE TABLE public.club_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_color text NOT NULL DEFAULT '#DC2626',
  secondary_color text NOT NULL DEFAULT '#991B1B',
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view club settings
CREATE POLICY "Everyone can view club settings"
  ON public.club_settings
  FOR SELECT
  USING (true);

-- Admin and vorstand can update club settings
CREATE POLICY "Admin and vorstand can update club settings"
  ON public.club_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

-- Admin and vorstand can insert club settings
CREATE POLICY "Admin and vorstand can insert club settings"
  ON public.club_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_club_settings_updated_at
  BEFORE UPDATE ON public.club_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.club_settings (primary_color, secondary_color)
VALUES ('#DC2626', '#991B1B');

-- Create storage bucket for club logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('club-logos', 'club-logos', true)
ON CONFLICT DO NOTHING;

-- Create storage policies for club logos
CREATE POLICY "Club logos are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'club-logos');

CREATE POLICY "Admin and vorstand can upload club logos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'club-logos' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
  );

CREATE POLICY "Admin and vorstand can update club logos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'club-logos' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
  );

CREATE POLICY "Admin and vorstand can delete club logos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'club-logos' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
  );