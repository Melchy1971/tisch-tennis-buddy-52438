-- Add is_archived column to seasons table
ALTER TABLE public.seasons
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.seasons.is_archived IS 'Indicates if the season is archived (not active anymore)';