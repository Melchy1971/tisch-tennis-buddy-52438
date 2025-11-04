-- Create season 2025/26 if it doesn't exist
INSERT INTO public.seasons (id, label, start_year, end_year, is_current)
VALUES ('2025-2026', 'Saison 2025/26 Vorrunde', 2025, 2026, false)
ON CONFLICT (id) DO NOTHING;

-- Update existing teams to correct category
-- Erwachsene teams
UPDATE public.teams
SET category = 'erwachsene'
WHERE name IN ('Herren I', 'Herren II', 'Herren III', 'Senioren 40')
  AND season_id = '2025-2026';

-- Jugend teams
UPDATE public.teams
SET category = 'jugend'
WHERE name IN ('Mädchen', 'Jugend 19', 'Jugend 19 I', 'Jugend 19 II', 'Jugend 19 III', 'Jugend 19 IV', 'Jugend 13', 'Jugend 13 I', 'Jugend 13 II')
  AND season_id = '2025-2026';