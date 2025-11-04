-- Create storage bucket for board documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('board-documents', 'board-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for board-documents bucket
CREATE POLICY "Admin, vorstand and entwickler can view documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'board-documents' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'vorstand'::app_role) OR 
      has_role(auth.uid(), 'entwickler'::app_role)
    )
  );

CREATE POLICY "Admin, vorstand and entwickler can upload documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'board-documents' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'vorstand'::app_role) OR 
      has_role(auth.uid(), 'entwickler'::app_role)
    )
  );

CREATE POLICY "Admin, vorstand and entwickler can update documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'board-documents' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'vorstand'::app_role) OR 
      has_role(auth.uid(), 'entwickler'::app_role)
    )
  );

CREATE POLICY "Admin, vorstand and entwickler can delete documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'board-documents' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'vorstand'::app_role) OR 
      has_role(auth.uid(), 'entwickler'::app_role)
    )
  );