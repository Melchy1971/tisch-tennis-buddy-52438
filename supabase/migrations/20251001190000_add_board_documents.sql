-- Create table for board documents managed by the board
CREATE TABLE public.board_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.board_documents ENABLE ROW LEVEL SECURITY;

-- Allow board and admins to manage board documents
CREATE POLICY "Admin and vorstand can view board documents"
ON public.board_documents
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

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

-- Keep the updated_at timestamp in sync
CREATE TRIGGER update_board_documents_updated_at
BEFORE UPDATE ON public.board_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for board documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('board-documents', 'board-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for board documents
CREATE POLICY "Admin and vorstand can upload board documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'board-documents' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
);

CREATE POLICY "Admin and vorstand can update board documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'board-documents' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
);

CREATE POLICY "Admin and vorstand can delete board documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'board-documents' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
);

CREATE POLICY "Admin and vorstand can download board documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'board-documents' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
);
