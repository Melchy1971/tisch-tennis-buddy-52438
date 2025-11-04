-- Add qttr_value column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS qttr_value INTEGER;