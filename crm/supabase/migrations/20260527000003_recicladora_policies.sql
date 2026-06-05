-- RLS policies for 'recicladora' role (requires enum value added in previous migration)

-- LEADS: recicladora ve TODOS los leads en estado reciclado
CREATE POLICY "Recicladora can view all reciclado leads"
  ON public.leads FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'recicladora'::app_role) AND status = 'reciclado');

-- LEADS: recicladora puede actualizar leads en estado reciclado (para tomar acción)
CREATE POLICY "Recicladora can update reciclado leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'recicladora'::app_role) AND status = 'reciclado')
  WITH CHECK (has_role(auth.uid(), 'recicladora'::app_role));

-- LEAD_NOTES: recicladora ve todas las notas (para ver historial de ejecutivas)
CREATE POLICY "Recicladora can view all notes"
  ON public.lead_notes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'recicladora'::app_role));

-- LEAD_NOTES: recicladora puede eliminar notas en leads accesibles
CREATE POLICY "Recicladora can delete notes on accessible leads"
  ON public.lead_notes FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'recicladora'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_notes.lead_id
        AND (leads.status = 'reciclado' OR leads.assigned_to = auth.uid() OR leads.advisor_id = auth.uid())
    )
  );

-- LEAD_NOTES: recicladora puede editar notas en leads accesibles
CREATE POLICY "Recicladora can update notes on accessible leads"
  ON public.lead_notes FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'recicladora'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_notes.lead_id
        AND (leads.status = 'reciclado' OR leads.assigned_to = auth.uid() OR leads.advisor_id = auth.uid())
    )
  )
  WITH CHECK (has_role(auth.uid(), 'recicladora'::app_role));

-- TASKS: recicladora ve todas las tareas (para historial de leads reciclados)
CREATE POLICY "Recicladora can view all tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'recicladora'::app_role));

-- USER_ROLES: recicladora puede leer roles (necesario para listar asesores al agendar)
CREATE POLICY "Recicladora can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'recicladora'::app_role));

-- PROFILES: recicladora puede ver todos los perfiles (para mostrar nombres de autores)
CREATE POLICY "Recicladora can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'recicladora'::app_role));
