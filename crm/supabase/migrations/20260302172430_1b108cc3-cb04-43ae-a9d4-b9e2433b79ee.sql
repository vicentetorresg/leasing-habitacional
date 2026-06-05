
-- Table to track manual calls (no lead associated)
CREATE TABLE public.manual_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  twilio_call_sid text,
  status text NOT NULL DEFAULT 'initiated',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ejecutiva can view own manual calls"
ON public.manual_calls FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Ejecutiva can insert own manual calls"
ON public.manual_calls FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin full access manual_calls"
ON public.manual_calls FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_manual_calls_phone ON public.manual_calls(phone);
CREATE INDEX idx_manual_calls_user_id ON public.manual_calls(user_id);
