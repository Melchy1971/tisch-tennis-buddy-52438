-- Create training_sessions table
CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  participants UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for training sessions
CREATE POLICY "Training sessions are viewable by everyone"
ON public.training_sessions
FOR SELECT
USING (true);

CREATE POLICY "Users can create training sessions"
ON public.training_sessions
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their training sessions"
ON public.training_sessions
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their training sessions"
ON public.training_sessions
FOR DELETE
USING (auth.uid() = created_by);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_training_sessions_updated_at
BEFORE UPDATE ON public.training_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_training_sessions_date ON public.training_sessions(date);
CREATE INDEX idx_training_sessions_created_by ON public.training_sessions(created_by);
