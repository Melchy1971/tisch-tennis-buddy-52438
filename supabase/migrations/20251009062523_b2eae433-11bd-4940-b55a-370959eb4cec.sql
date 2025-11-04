-- Add missing columns to club_settings table
ALTER TABLE public.club_settings 
ADD COLUMN IF NOT EXISTS board_chairman TEXT,
ADD COLUMN IF NOT EXISTS board_deputy TEXT,
ADD COLUMN IF NOT EXISTS board_secretary TEXT,
ADD COLUMN IF NOT EXISTS board_treasurer TEXT,
ADD COLUMN IF NOT EXISTS board_youth_leader TEXT,
ADD COLUMN IF NOT EXISTS contact_address TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_website TEXT,
ADD COLUMN IF NOT EXISTS contact_facebook TEXT,
ADD COLUMN IF NOT EXISTS email_from_address TEXT,
ADD COLUMN IF NOT EXISTS email_smtp_server TEXT,
ADD COLUMN IF NOT EXISTS email_smtp_password TEXT;

-- Create board_documents table
CREATE TABLE IF NOT EXISTS public.board_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on board_documents
ALTER TABLE public.board_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for board_documents
CREATE POLICY "Everyone can view board documents"
ON public.board_documents
FOR SELECT
USING (true);

CREATE POLICY "Admin and vorstand can insert board documents"
ON public.board_documents
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

CREATE POLICY "Admin and vorstand can update board documents"
ON public.board_documents
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

CREATE POLICY "Admin and vorstand can delete board documents"
ON public.board_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));