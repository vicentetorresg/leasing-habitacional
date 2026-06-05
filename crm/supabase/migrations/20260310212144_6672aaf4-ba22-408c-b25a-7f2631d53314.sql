
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS no_califica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_califica_razon text;
