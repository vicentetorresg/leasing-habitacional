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
BEGIN
  IF TG_OP = 'UPDATE' THEN
    old_status := OLD.status;
  END IF;

  IF NEW.status = ANY(allowed_statuses) AND (old_status IS DISTINCT FROM NEW.status) THEN
    PERFORM net.http_post(
      url     := 'https://bzmzuoxapedvxmqcnhqq.supabase.co/functions/v1/lead-status-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bXp1b3hhcGVkdnhtcWNuaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxNDM3NSwiZXhwIjoyMDkwNzkwMzc1fQ.PSxmllwNWogKtqYUdlBbxAnPiJzt4aya-Wr9vTuSPpM'
      ),
      body    := jsonb_build_object(
        'lead_id',    NEW.id,
        'new_status', NEW.status,
        'old_status', old_status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
