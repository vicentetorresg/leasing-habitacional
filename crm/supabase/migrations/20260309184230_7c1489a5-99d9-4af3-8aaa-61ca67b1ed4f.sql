
-- Drop the restrictive INSERT policy and recreate as permissive
DROP POLICY IF EXISTS "Users can insert own notes" ON public.lead_notes;
CREATE POLICY "Users can insert own notes"
  ON public.lead_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
