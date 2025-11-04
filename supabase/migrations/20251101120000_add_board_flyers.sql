-- Create table for board flyers
CREATE TABLE public.board_flyers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_path TEXT NOT NULL,
  image_name TEXT NOT NULL,
  image_type TEXT,
  image_size INTEGER,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.board_flyers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for board_flyers
CREATE POLICY "Everyone can view board flyers"
ON public.board_flyers
FOR SELECT
USING (true);

CREATE POLICY "Admin and vorstand can insert board flyers"
ON public.board_flyers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

CREATE POLICY "Admin and vorstand can update board flyers"
ON public.board_flyers
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

CREATE POLICY "Admin and vorstand can delete board flyers"
ON public.board_flyers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_board_flyers_updated_at
BEFORE UPDATE ON public.board_flyers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for board flyers
INSERT INTO storage.buckets (id, name, public)
VALUES ('board-flyers', 'board-flyers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for board flyers
CREATE POLICY "Admin and vorstand can upload board flyers"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'board-flyers' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
);

CREATE POLICY "Admin and vorstand can update board flyers"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'board-flyers' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
);

CREATE POLICY "Admin and vorstand can delete board flyers"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'board-flyers' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
);

CREATE POLICY "Everyone can download board flyers"
ON storage.objects
FOR SELECT
USING (bucket_id = 'board-flyers');
