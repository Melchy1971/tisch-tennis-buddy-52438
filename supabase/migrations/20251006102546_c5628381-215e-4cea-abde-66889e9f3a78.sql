-- Add 'mitglieder' role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'mitglieder';

-- Update RLS policies for training_sessions to allow mitglieder role

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Creators can update their training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Creators can delete their training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Training sessions are viewable by everyone" ON public.training_sessions;

-- Create new policies with role-based access
CREATE POLICY "Mitglieder, admin and vorstand can view training sessions"
ON public.training_sessions
FOR SELECT
USING (
  has_role(auth.uid(), 'mitglieder'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);

CREATE POLICY "Mitglieder, admin and vorstand can create training sessions"
ON public.training_sessions
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND (
    has_role(auth.uid(), 'mitglieder'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'vorstand'::app_role)
  )
);

CREATE POLICY "Creators can update their training sessions"
ON public.training_sessions
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their training sessions"
ON public.training_sessions
FOR DELETE
USING (auth.uid() = created_by);

CREATE POLICY "Admin and vorstand can delete all training sessions"
ON public.training_sessions
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vorstand'::app_role)
);