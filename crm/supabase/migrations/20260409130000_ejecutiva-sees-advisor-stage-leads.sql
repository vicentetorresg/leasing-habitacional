-- Ejecutivas pueden ver todos los leads en estados de asesor (vista de asesores)
-- Regla: si el lead ya pasó a asesoría agendada o más, ambas ejecutivas lo ven.

DROP POLICY IF EXISTS "Users can view relevant leads" ON public.leads;

CREATE POLICY "Users can view relevant leads"
  ON public.leads FOR SELECT TO authenticated
  USING (
    -- Admin ve todo
    has_role(auth.uid(), 'admin'::app_role)
    -- Asesor ve sus propios leads
    OR advisor_id = auth.uid()
    -- Ejecutiva ve sus leads asignados
    OR assigned_to = auth.uid()
    -- Leads sin asignar y sin asesor (cola de entrada)
    OR (assigned_to IS NULL AND advisor_id IS NULL)
    -- Ejecutivas ven TODOS los leads en etapa de asesor
    OR (
      has_role(auth.uid(), 'ejecutiva'::app_role)
      AND status IN (
        'asesoria_agendada',
        'recontactar',
        'asesoria_concretada',
        'plan_presentado',
        'departamento_reservado',
        'cierres',
        'archived'
      )
    )
  );
