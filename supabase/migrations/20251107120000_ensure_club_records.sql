-- Ensure there is always exactly one club_settings row and provide defaults for hall management

-- Keep only the most recently updated club_settings row and create a default one if missing
DO $$
DECLARE
  keep_id uuid;
BEGIN
  SELECT id
  INTO keep_id
  FROM public.club_settings
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF keep_id IS NULL THEN
    INSERT INTO public.club_settings (primary_color, secondary_color)
    VALUES ('#DC2626', '#991B1B')
    RETURNING id INTO keep_id;
  END IF;

  DELETE FROM public.club_settings
  WHERE id <> keep_id;
END $$;

-- Enforce the singleton behaviour for club_settings
CREATE UNIQUE INDEX IF NOT EXISTS club_settings_singleton_idx
  ON public.club_settings ((true));

-- Ensure the club_halls table exists (matches the expected structure)
DO $$
BEGIN
  IF to_regclass('public.club_halls') IS NULL THEN
    CREATE TABLE public.club_halls (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      hall_number integer NOT NULL UNIQUE,
      name text,
      address text,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TRIGGER update_club_halls_updated_at
      BEFORE UPDATE ON public.club_halls
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    ALTER TABLE public.club_halls ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Seed placeholder hall entries so that the admin UI can display empty forms without errors
INSERT INTO public.club_halls (hall_number)
SELECT hall_number
FROM (VALUES (1), (2), (3)) AS halls(hall_number)
ON CONFLICT (hall_number) DO NOTHING;
