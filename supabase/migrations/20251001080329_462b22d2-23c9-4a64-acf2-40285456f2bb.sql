-- Create table for board messages (Vorstands-Nachrichten)
CREATE TABLE public.board_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for club events (Vereins-Events)
CREATE TABLE public.club_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.board_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for board_messages
CREATE POLICY "Everyone can view board messages"
ON public.board_messages
FOR SELECT
USING (true);

CREATE POLICY "Admin and vorstand can insert board messages"
ON public.board_messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

CREATE POLICY "Admin and vorstand can update board messages"
ON public.board_messages
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

CREATE POLICY "Admin and vorstand can delete board messages"
ON public.board_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

-- RLS Policies for club_events
CREATE POLICY "Everyone can view club events"
ON public.club_events
FOR SELECT
USING (true);

CREATE POLICY "Admin and vorstand can insert club events"
ON public.club_events
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

CREATE POLICY "Admin and vorstand can update club events"
ON public.club_events
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

CREATE POLICY "Admin and vorstand can delete club events"
ON public.club_events
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vorstand'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_board_messages_updated_at
BEFORE UPDATE ON public.board_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_club_events_updated_at
BEFORE UPDATE ON public.club_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();