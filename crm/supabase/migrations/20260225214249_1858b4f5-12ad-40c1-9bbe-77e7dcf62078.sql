
-- App settings table for configurable values
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write settings
CREATE POLICY "Admin can read settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert settings"
ON public.app_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ejecutivas can read settings (needed for inactivity timer, max attempts)
CREATE POLICY "Ejecutiva can read settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

-- Seed default values
INSERT INTO public.app_settings (key, value, label) VALUES
  ('max_attempts', '10', 'Máximo de intentos antes de descartar'),
  ('inactivity_timeout_seconds', '180', 'Segundos de inactividad antes de alerta');
