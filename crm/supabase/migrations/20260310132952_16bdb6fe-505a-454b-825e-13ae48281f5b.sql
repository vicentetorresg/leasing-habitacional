
-- Recreate leads policies as PERMISSIVE
DROP POLICY IF EXISTS "Admin can do everything on leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view relevant leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update relevant leads" ON public.leads;
DROP POLICY IF EXISTS "Admin can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Ejecutiva can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Ejecutiva can update all leads" ON public.leads;

CREATE POLICY "Admin can do everything on leads" ON public.leads FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view relevant leads" ON public.leads FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role) OR assigned_to = auth.uid() OR assigned_to IS NULL OR advisor_id = auth.uid());

CREATE POLICY "Users can update relevant leads" ON public.leads FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role) OR assigned_to = auth.uid() OR assigned_to IS NULL OR advisor_id = auth.uid());

CREATE POLICY "Admin can delete leads" ON public.leads FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Ejecutiva can view all leads" ON public.leads FOR SELECT TO authenticated USING (has_role(auth.uid(), 'ejecutiva'::app_role));

CREATE POLICY "Ejecutiva can update all leads" ON public.leads FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'ejecutiva'::app_role)) WITH CHECK (has_role(auth.uid(), 'ejecutiva'::app_role));
