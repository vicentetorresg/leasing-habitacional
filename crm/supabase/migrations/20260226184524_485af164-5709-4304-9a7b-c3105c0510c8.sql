
-- Add is_demo flag to leads
ALTER TABLE public.leads ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

-- Mark existing demo leads
UPDATE public.leads SET is_demo = true WHERE source = 'demo';
