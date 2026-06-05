
-- Drop all existing restrictive policies on lead_notes
DROP POLICY IF EXISTS "Admin full access notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Users can view notes on accessible leads" ON public.lead_notes;
DROP POLICY IF EXISTS "Admin can delete lead notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Ejecutiva can view all notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Ejecutiva can delete lead notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Users can update own notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON public.lead_notes;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admin full access notes" ON public.lead_notes FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Ejecutiva can view all notes" ON public.lead_notes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'ejecutiva'::app_role));

CREATE POLICY "Users can view notes on accessible leads" ON public.lead_notes FOR SELECT TO public USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_notes.lead_id AND (leads.assigned_to = auth.uid() OR leads.advisor_id = auth.uid())));

CREATE POLICY "Users can insert own notes" ON public.lead_notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notes" ON public.lead_notes FOR UPDATE TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notes" ON public.lead_notes FOR DELETE TO public USING (user_id = auth.uid());

CREATE POLICY "Ejecutiva can delete lead notes" ON public.lead_notes FOR DELETE TO public USING (has_role(auth.uid(), 'ejecutiva'::app_role));

CREATE POLICY "Admin can delete lead notes" ON public.lead_notes FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
