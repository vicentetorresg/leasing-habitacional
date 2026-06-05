
-- Fix: Convert restrictive UPDATE policies on leads to permissive so advisors can save no_califica
DROP POLICY IF EXISTS "Users can update relevant leads" ON public.leads;
DROP POLICY IF EXISTS "Ejecutiva can update all leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view relevant leads" ON public.leads;

-- Recreate UPDATE policies as PERMISSIVE
CREATE POLICY "Ejecutiva can update all leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'ejecutiva'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ejecutiva'::app_role));

CREATE POLICY "Advisor can update assigned leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (advisor_id = auth.uid())
  WITH CHECK (advisor_id = auth.uid());

-- Recreate SELECT policy as PERMISSIVE
CREATE POLICY "Users can view relevant leads"
  ON public.leads FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR assigned_to = auth.uid() 
    OR assigned_to IS NULL 
    OR advisor_id = auth.uid()
  );
