-- Add category column to teams table
ALTER TABLE public.teams 
ADD COLUMN category text NOT NULL DEFAULT 'erwachsene' 
CHECK (category IN ('erwachsene', 'jugend'));

-- Add comment to explain the column
COMMENT ON COLUMN public.teams.category IS 'Category of the team: erwachsene (adults: Herren, Damen, Senioren) or jugend (youth: Jugend, Mädchen)';

-- Create index for better performance when filtering by category
CREATE INDEX idx_teams_category ON public.teams(category);