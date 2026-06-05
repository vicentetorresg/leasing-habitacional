
-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read projects
CREATE POLICY "Authenticated users can read projects"
ON public.projects FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admin can manage projects
CREATE POLICY "Admin can manage projects"
ON public.projects FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial projects (alphabetically ordered)
INSERT INTO public.projects (name) VALUES
  ('Argomedo'),
  ('Aires de Marañón'),
  ('Ciudad Cerrillos'),
  ('Conecta Huechuraba'),
  ('Optimus'),
  ('Portales Covadonga'),
  ('Residencial Park');
