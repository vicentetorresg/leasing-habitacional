-- FIX CRÍTICO: Ejecutiva no puede ver leads de otras ejecutivas/asesores
-- Problema 1: "Ejecutiva can view all leads" le daba acceso total a cualquier ejecutiva
-- Problema 2: "Users can view relevant leads" tenía OR assigned_to IS NULL, que matcheaba
--             leads transferidos a asesores (donde assigned_to se pone NULL al transferir)

-- Eliminar política permisiva que daba acceso total
DROP POLICY IF EXISTS "Ejecutiva can view all leads" ON public.leads;

-- Reemplazar "Users can view relevant leads" con una versión más estricta:
-- - Admin ve todo
-- - Ejecutiva/telemarketing solo ve leads asignados a ella, O leads sin asignar que TAMPOCO tienen asesor
--   (evita ver leads ya transferidos a asesores donde assigned_to=NULL pero advisor_id está seteado)
-- - Asesor solo ve leads donde él es el advisor
DROP POLICY IF EXISTS "Users can view relevant leads" ON public.leads;

CREATE POLICY "Users can view relevant leads"
  ON public.leads FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR advisor_id = auth.uid()
    OR assigned_to = auth.uid()
    OR (assigned_to IS NULL AND advisor_id IS NULL)
  );
