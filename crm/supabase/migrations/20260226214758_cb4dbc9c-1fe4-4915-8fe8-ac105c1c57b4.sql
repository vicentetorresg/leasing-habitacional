
-- Allow ejecutiva to delete any lead note
CREATE POLICY "Ejecutiva can delete lead notes"
ON public.lead_notes
FOR DELETE
USING (has_role(auth.uid(), 'ejecutiva'::app_role));

-- Allow users to delete their own notes
CREATE POLICY "Users can delete own notes"
ON public.lead_notes
FOR DELETE
USING (user_id = auth.uid());
