
-- Daily performance tracking per ejecutiva
CREATE TABLE public.daily_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  calls_made integer NOT NULL DEFAULT 0,
  calls_goal integer NOT NULL DEFAULT 0,
  calls_pct numeric(5,2) NOT NULL DEFAULT 0,
  scheduled_made integer NOT NULL DEFAULT 0,
  scheduled_goal integer NOT NULL DEFAULT 0,
  scheduled_pct numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_performance ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin full access daily_performance"
  ON public.daily_performance FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Ejecutiva can view own performance"
  ON public.daily_performance FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Ejecutiva can upsert own performance"
  ON public.daily_performance FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Ejecutiva can update own performance"
  ON public.daily_performance FOR UPDATE
  USING (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_daily_performance_user_date ON public.daily_performance(user_id, date);
CREATE INDEX idx_daily_performance_date ON public.daily_performance(date);
