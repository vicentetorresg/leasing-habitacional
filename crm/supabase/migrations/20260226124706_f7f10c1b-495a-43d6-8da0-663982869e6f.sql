
-- Allow ejecutiva to read user_roles (needed to list advisors for scheduling)
CREATE POLICY "Ejecutiva can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'ejecutiva'::app_role));

-- Allow ejecutiva to read all profiles (needed to see advisor names)
CREATE POLICY "Ejecutiva can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'ejecutiva'::app_role));

-- Allow ejecutiva to view all leads (needed for advisor kanban view)
CREATE POLICY "Ejecutiva can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'ejecutiva'::app_role));

-- Allow ejecutiva to view notes on all leads (for advisor view)
CREATE POLICY "Ejecutiva can view all notes"
ON public.lead_notes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'ejecutiva'::app_role));
