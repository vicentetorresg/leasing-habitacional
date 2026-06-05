CREATE POLICY "Users can view profiles of note authors on their leads"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT ln.user_id FROM lead_notes ln
    JOIN leads l ON l.id = ln.lead_id
    WHERE l.advisor_id = auth.uid()
  )
);