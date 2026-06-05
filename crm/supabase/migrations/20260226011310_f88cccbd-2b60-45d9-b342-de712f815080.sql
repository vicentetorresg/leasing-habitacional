-- Allow admin to delete leads
CREATE POLICY "Admin can delete leads"
ON public.leads
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to delete related call_attempts
CREATE POLICY "Admin can delete call attempts"
ON public.call_attempts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to delete lead_notes
CREATE POLICY "Admin can delete lead notes"
ON public.lead_notes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));