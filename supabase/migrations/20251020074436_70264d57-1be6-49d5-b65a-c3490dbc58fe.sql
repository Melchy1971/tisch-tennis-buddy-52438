-- Add category column to matches table to distinguish between youth and adult matches
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'erwachsene';

-- Add a check constraint to ensure only valid categories
ALTER TABLE public.matches
ADD CONSTRAINT matches_category_check 
CHECK (category IN ('erwachsene', 'jugend'));