-- Create email distribution lists table
CREATE TABLE public.email_distribution_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  groups text[] NOT NULL DEFAULT '{}',
  manual_emails text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.email_distribution_lists IS 'E-Mail-Verteilerlisten für den Nachrichtenversand';

-- Enable RLS
ALTER TABLE public.email_distribution_lists ENABLE ROW LEVEL SECURITY;

-- Policy: Admin and vorstand can view all distribution lists
CREATE POLICY "Admin and vorstand can view distribution lists"
ON public.email_distribution_lists
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Policy: Admin and vorstand can insert distribution lists
CREATE POLICY "Admin and vorstand can insert distribution lists"
ON public.email_distribution_lists
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Policy: Admin and vorstand can update distribution lists
CREATE POLICY "Admin and vorstand can update distribution lists"
ON public.email_distribution_lists
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Policy: Admin and vorstand can delete distribution lists
CREATE POLICY "Admin and vorstand can delete distribution lists"
ON public.email_distribution_lists
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'vorstand'::app_role)
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_email_distribution_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_distribution_lists_updated_at
BEFORE UPDATE ON public.email_distribution_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_email_distribution_lists_updated_at();