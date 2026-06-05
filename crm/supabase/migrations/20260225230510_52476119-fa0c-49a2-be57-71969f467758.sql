
-- Add 4 new fields to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS uf_sin_bp numeric NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS proyecto text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS fecha_reserva date NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS mes_cierre text NULL;
