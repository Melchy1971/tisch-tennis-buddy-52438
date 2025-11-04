-- Create board_flyers table for storing flyer images
CREATE TABLE IF NOT EXISTS public.board_flyers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_path TEXT NOT NULL,
  image_name TEXT NOT NULL,
  image_type TEXT,
  image_size INTEGER,
  author_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.board_flyers ENABLE ROW LEVEL SECURITY;

-- Create policies for board_flyers
CREATE POLICY "Everyone can view board flyers"
  ON public.board_flyers
  FOR SELECT
  USING (true);

CREATE POLICY "Admin, vorstand and entwickler can insert board flyers"
  ON public.board_flyers
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'vorstand'::app_role) OR 
    has_role(auth.uid(), 'entwickler'::app_role)
  );

CREATE POLICY "Admin, vorstand and entwickler can update board flyers"
  ON public.board_flyers
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'vorstand'::app_role) OR 
    has_role(auth.uid(), 'entwickler'::app_role)
  );

CREATE POLICY "Admin, vorstand and entwickler can delete board flyers"
  ON public.board_flyers
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'vorstand'::app_role) OR 
    has_role(auth.uid(), 'entwickler'::app_role)
  );

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_board_flyers_updated_at
  BEFORE UPDATE ON public.board_flyers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for board flyers if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('board-flyers', 'board-flyers', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for board-flyers bucket
CREATE POLICY "Flyer images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'board-flyers');

CREATE POLICY "Admin, vorstand and entwickler can upload flyers"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'board-flyers' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'vorstand'::app_role) OR 
      has_role(auth.uid(), 'entwickler'::app_role)
    )
  );

CREATE POLICY "Admin, vorstand and entwickler can update flyers"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'board-flyers' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'vorstand'::app_role) OR 
      has_role(auth.uid(), 'entwickler'::app_role)
    )
  );

CREATE POLICY "Admin, vorstand and entwickler can delete flyers"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'board-flyers' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'vorstand'::app_role) OR 
      has_role(auth.uid(), 'entwickler'::app_role)
    )
  );