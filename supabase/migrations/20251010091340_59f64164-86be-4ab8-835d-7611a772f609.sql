-- Drop trigger first
DROP TRIGGER IF EXISTS update_email_distribution_lists_updated_at ON public.email_distribution_lists;

-- Drop and recreate function with proper search_path
DROP FUNCTION IF EXISTS public.update_email_distribution_lists_updated_at();

CREATE OR REPLACE FUNCTION public.update_email_distribution_lists_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_email_distribution_lists_updated_at
BEFORE UPDATE ON public.email_distribution_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_email_distribution_lists_updated_at();