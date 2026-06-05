
-- Allow ejecutiva to update all leads (needed for drag in advisor kanban)
CREATE POLICY "Ejecutiva can update all leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'ejecutiva'::app_role))
WITH CHECK (has_role(auth.uid(), 'ejecutiva'::app_role));
