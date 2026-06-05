
-- Table to track incoming calls for real-time UI notifications
CREATE TABLE public.incoming_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_name TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  ejecutiva_user_id UUID NOT NULL,
  twilio_call_sid TEXT,
  status TEXT NOT NULL DEFAULT 'ringing',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incoming_calls ENABLE ROW LEVEL SECURITY;

-- Ejecutivas can see their own incoming calls
CREATE POLICY "Ejecutiva can view own incoming calls"
ON public.incoming_calls
FOR SELECT
USING (ejecutiva_user_id = auth.uid());

-- Admin can see all
CREATE POLICY "Admin full access incoming_calls"
ON public.incoming_calls
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ejecutivas can update their own (to mark as answered/dismissed)
CREATE POLICY "Ejecutiva can update own incoming calls"
ON public.incoming_calls
FOR UPDATE
USING (ejecutiva_user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_calls;
