
-- Add new fields to leads table
ALTER TABLE public.leads ADD COLUMN rut TEXT;
ALTER TABLE public.leads ADD COLUMN sueldo_liquido INTEGER;
ALTER TABLE public.leads ADD COLUMN en_dicom BOOLEAN DEFAULT false;
