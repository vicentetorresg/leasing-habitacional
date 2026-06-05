
-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_minutes INTEGER, -- null = no reminder, 0 = at time, 10 = 10min before, 30 = 30min before
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users can view their own tasks
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (user_id = auth.uid());

-- Ejecutiva can view all tasks
CREATE POLICY "Ejecutiva can view all tasks"
  ON public.tasks FOR SELECT
  USING (has_role(auth.uid(), 'ejecutiva'::app_role));

-- Admin can do everything
CREATE POLICY "Admin full access tasks"
  ON public.tasks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert own tasks
CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update own tasks
CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete own tasks
CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
