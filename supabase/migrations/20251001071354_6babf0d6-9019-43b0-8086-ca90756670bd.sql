-- Create storage bucket for QTTR/TTR lists
INSERT INTO storage.buckets (id, name, public)
VALUES ('qttr-lists', 'qttr-lists', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins and vorstand to upload QTTR lists
CREATE POLICY "Admins and vorstand can upload QTTR lists"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'qttr-lists' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
);

-- Allow admins and vorstand to update QTTR lists
CREATE POLICY "Admins and vorstand can update QTTR lists"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'qttr-lists' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
);

-- Allow admins and vorstand to delete QTTR lists
CREATE POLICY "Admins and vorstand can delete QTTR lists"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'qttr-lists' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role))
);

-- Allow everyone to view/download QTTR lists
CREATE POLICY "Everyone can view QTTR lists"
ON storage.objects
FOR SELECT
USING (bucket_id = 'qttr-lists');