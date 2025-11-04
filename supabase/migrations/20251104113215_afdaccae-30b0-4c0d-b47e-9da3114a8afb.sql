-- Create missing tables for board communication features

-- Board messages table
CREATE TABLE IF NOT EXISTS public.board_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_urgent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Board flyers table
CREATE TABLE IF NOT EXISTS public.board_flyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  image_path TEXT,
  image_name TEXT,
  image_type TEXT,
  image_size INTEGER,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Club events table
CREATE TABLE IF NOT EXISTS public.club_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email distribution lists table
CREATE TABLE IF NOT EXISTS public.email_distribution_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  groups JSONB DEFAULT '[]'::jsonb,
  manual_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.board_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_flyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_distribution_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for board_messages
CREATE POLICY "Members can view board messages"
  ON public.board_messages FOR SELECT
  USING (true);

CREATE POLICY "Board members can create messages"
  ON public.board_messages FOR INSERT
  WITH CHECK (is_admin_or_board(auth.uid()));

CREATE POLICY "Authors and admins can update messages"
  ON public.board_messages FOR UPDATE
  USING (author_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete messages"
  ON public.board_messages FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for board_flyers
CREATE POLICY "Members can view board flyers"
  ON public.board_flyers FOR SELECT
  USING (true);

CREATE POLICY "Board members can create flyers"
  ON public.board_flyers FOR INSERT
  WITH CHECK (is_admin_or_board(auth.uid()));

CREATE POLICY "Authors and admins can update flyers"
  ON public.board_flyers FOR UPDATE
  USING (author_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete flyers"
  ON public.board_flyers FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for club_events
CREATE POLICY "Members can view club events"
  ON public.club_events FOR SELECT
  USING (true);

CREATE POLICY "Board members can create events"
  ON public.club_events FOR INSERT
  WITH CHECK (is_admin_or_board(auth.uid()));

CREATE POLICY "Authors and admins can update events"
  ON public.club_events FOR UPDATE
  USING (author_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete events"
  ON public.club_events FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for email_distribution_lists
CREATE POLICY "Board members can view distribution lists"
  ON public.email_distribution_lists FOR SELECT
  USING (is_admin_or_board(auth.uid()));

CREATE POLICY "Board members can manage distribution lists"
  ON public.email_distribution_lists FOR ALL
  USING (is_admin_or_board(auth.uid()));

-- Add update triggers
CREATE TRIGGER update_board_messages_updated_at
  BEFORE UPDATE ON public.board_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_board_flyers_updated_at
  BEFORE UPDATE ON public.board_flyers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_club_events_updated_at
  BEFORE UPDATE ON public.club_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_distribution_lists_updated_at
  BEFORE UPDATE ON public.email_distribution_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();