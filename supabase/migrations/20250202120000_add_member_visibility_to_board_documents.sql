-- Allow Vorstand to mark documents as visible for members
ALTER TABLE public.board_documents
ADD COLUMN IF NOT EXISTS is_visible_for_members BOOLEAN NOT NULL DEFAULT false;

-- Refresh SELECT policies to account for the new visibility flag
DROP POLICY IF EXISTS "Admin and vorstand can view board documents" ON public.board_documents;
DROP POLICY IF EXISTS "Admin, vorstand and entwickler can view board documents" ON public.board_documents;
DROP POLICY IF EXISTS "Everyone can view board documents" ON public.board_documents;

CREATE POLICY "Privileged roles can view board documents"
ON public.board_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'vorstand'::app_role)
  OR has_role(auth.uid(), 'entwickler'::app_role)
);

CREATE POLICY "Members can view shared board documents"
ON public.board_documents
FOR SELECT
USING (
  is_visible_for_members = true
  AND (
    has_role(auth.uid(), 'mitglied'::app_role)
    OR has_role(auth.uid(), 'spieler'::app_role)
    OR has_role(auth.uid(), 'trainer'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'vorstand'::app_role)
    OR has_role(auth.uid(), 'entwickler'::app_role)
  )
);

-- Allow members to download shared documents from storage
DROP POLICY IF EXISTS "Admin and vorstand can download board documents" ON storage.objects;
CREATE POLICY "Authorized users can download board documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'board-documents'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'vorstand'::app_role)
    OR has_role(auth.uid(), 'entwickler'::app_role)
    OR (
      EXISTS (
        SELECT 1
        FROM public.board_documents bd
        WHERE bd.file_path = name
          AND bd.is_visible_for_members = true
      )
      AND (
        has_role(auth.uid(), 'mitglied'::app_role)
        OR has_role(auth.uid(), 'spieler'::app_role)
        OR has_role(auth.uid(), 'trainer'::app_role)
        OR has_role(auth.uid(), 'moderator'::app_role)
        OR has_role(auth.uid(), 'mannschaftsfuehrer'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'vorstand'::app_role)
        OR has_role(auth.uid(), 'entwickler'::app_role)
      )
    )
  )
);
