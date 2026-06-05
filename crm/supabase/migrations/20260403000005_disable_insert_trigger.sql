-- El trigger solo debe dispararse en UPDATE, no en INSERT
-- para evitar emails masivos al importar datos

DROP TRIGGER IF EXISTS on_lead_status_email ON public.leads;

CREATE TRIGGER on_lead_status_email
  AFTER UPDATE OF status
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_lead_status_email();
