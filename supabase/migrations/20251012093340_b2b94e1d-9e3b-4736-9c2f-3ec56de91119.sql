-- Create table for pin import logs
CREATE TABLE IF NOT EXISTS public.pin_import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  import_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  failed_count INTEGER NOT NULL,
  log_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pin_import_logs ENABLE ROW LEVEL SECURITY;

-- Policies for pin_import_logs
CREATE POLICY "Admins can view all pin import logs"
ON public.pin_import_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role)
);

CREATE POLICY "Admins can insert pin import logs"
ON public.pin_import_logs
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role)
);

-- Create index for better performance
CREATE INDEX idx_pin_import_logs_user_id ON public.pin_import_logs(user_id);
CREATE INDEX idx_pin_import_logs_created_at ON public.pin_import_logs(created_at DESC);