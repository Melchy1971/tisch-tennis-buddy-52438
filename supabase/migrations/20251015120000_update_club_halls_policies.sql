-- Ensure the club_halls table exists with the expected structure
CREATE TABLE IF NOT EXISTS public.club_halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_number integer NOT NULL UNIQUE,
  name text,
  address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Always keep the unique constraint on hall_number in sync
DO $$
BEGIN
  ALTER TABLE public.club_halls
    ADD CONSTRAINT club_halls_hall_number_key UNIQUE (hall_number);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ensure the update trigger exists
CREATE OR REPLACE FUNCTION public.update_club_halls_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_club_halls_updated_at ON public.club_halls;
CREATE TRIGGER update_club_halls_updated_at
  BEFORE UPDATE ON public.club_halls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_club_halls_updated_at();

-- Enable row level security and make sure policies exist without failing when they already do
ALTER TABLE public.club_halls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and vorstand can view club halls" ON public.club_halls;
DROP POLICY IF EXISTS "Admins and vorstand can insert club halls" ON public.club_halls;
DROP POLICY IF EXISTS "Admins and vorstand can update club halls" ON public.club_halls;
DROP POLICY IF EXISTS "Admins and vorstand can delete club halls" ON public.club_halls;

CREATE POLICY "Admins and vorstand can view club halls"
  ON public.club_halls
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'vorstand'::app_role)
  );

CREATE POLICY "Admins and vorstand can insert club halls"
  ON public.club_halls
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'vorstand'::app_role)
  );

CREATE POLICY "Admins and vorstand can update club halls"
  ON public.club_halls
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'vorstand'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'vorstand'::app_role)
  );

CREATE POLICY "Admins and vorstand can delete club halls"
  ON public.club_halls
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'vorstand'::app_role)
  );
