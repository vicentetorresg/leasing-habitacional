-- Allow users to update their own notes
CREATE POLICY "Users can update own notes"
ON public.lead_notes
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());