
-- Fix permissive INSERT policy on leads to require authentication
DROP POLICY "Anyone authenticated can insert leads" ON public.leads;
CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT 
  TO authenticated
  WITH CHECK (true);
