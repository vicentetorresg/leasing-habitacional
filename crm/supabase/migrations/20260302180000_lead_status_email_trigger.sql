-- Trigger que llama la edge function lead-status-email
-- cuando un lead entra a un estado que tiene email asociado.
-- Funciona tanto en INSERT (bienvenida) como en UPDATE de status.

CREATE OR REPLACE FUNCTION public.trigger_lead_status_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  allowed_statuses text[] := ARRAY[
    'new',
    'asesoria_agendada',
    'recontactar',
    'asesoria_concretada',
    'plan_presentado'
  ];
  old_status text := NULL;
  payload text;
BEGIN
  -- En UPDATE obtenemos el status anterior
  IF TG_OP = 'UPDATE' THEN
    old_status := OLD.status;
  END IF;

  -- Solo disparar si el nuevo status tiene email y es distinto al anterior
  IF NEW.status = ANY(allowed_statuses) AND (old_status IS DISTINCT FROM NEW.status) THEN
    payload := json_build_object(
      'lead_id',    NEW.id,
      'new_status', NEW.status,
      'old_status', old_status
    )::text;

    PERFORM net.http_post(
      url     := 'https://irvsedcympaaswtwddan.supabase.co/functions/v1/lead-status-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydnNlZGN5bXBhYXN3dHdkZGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDk5OTYsImV4cCI6MjA4NzYyNTk5Nn0.Ust5E8raVFMyBY6iJsxWtWbKHsbe-w9MlAcMlkW6rHI'
      ),
      body    := payload
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS on_lead_status_email ON public.leads;

-- Crear trigger en INSERT y UPDATE
CREATE TRIGGER on_lead_status_email
  AFTER INSERT OR UPDATE OF status
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_lead_status_email();
