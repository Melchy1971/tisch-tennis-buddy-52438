-- Create table for board flyres (Flyre-Nachrichten)
CREATE TABLE public.board_flyres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.board_flyres ENABLE ROW LEVEL SECURITY;

-- RLS Policies for board_flyres
CREATE POLICY "Everyone can view board flyres"
ON public.board_flyres
FOR SELECT
USING (true);

CREATE POLICY "Admin and vorstand can insert board flyres"
ON public.board_flyres
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

CREATE POLICY "Admin and vorstand can update board flyres"
ON public.board_flyres
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

CREATE POLICY "Admin and vorstand can delete board flyres"
ON public.board_flyres
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_board_flyres_updated_at
BEFORE UPDATE ON public.board_flyres
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
