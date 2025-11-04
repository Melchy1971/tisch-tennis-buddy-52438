-- Modify training_sessions table to use member selection instead of location
ALTER TABLE public.training_sessions
DROP COLUMN location;

ALTER TABLE public.training_sessions
ADD COLUMN member1_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
ADD COLUMN member2_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Add indexes for better performance
CREATE INDEX idx_training_sessions_member1 ON public.training_sessions(member1_id);
CREATE INDEX idx_training_sessions_member2 ON public.training_sessions(member2_id);
