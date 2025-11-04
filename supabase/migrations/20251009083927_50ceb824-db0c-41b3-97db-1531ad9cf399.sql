-- Add category column to seasons table
ALTER TABLE public.seasons
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'erwachsene' CHECK (category IN ('erwachsene', 'jugend'));

-- Add comment for documentation
COMMENT ON COLUMN public.seasons.category IS 'Category of the season: erwachsene (adults) or jugend (youth)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_seasons_category ON public.seasons(category);

-- Update existing seasons to have the category
UPDATE public.seasons SET category = 'erwachsene' WHERE category IS NULL;