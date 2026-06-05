ALTER TABLE public.leads ADD COLUMN priority text NOT NULL DEFAULT 'media';
ALTER TABLE public.leads ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.leads ADD CONSTRAINT leads_priority_check CHECK (priority = ANY (ARRAY['alta', 'media', 'baja']));