
-- Add column to track when status was last changed
ALTER TABLE public.leads ADD COLUMN status_changed_at timestamp with time zone DEFAULT now();

-- Initialize: set to last_attempt_at if available, otherwise created_at
UPDATE public.leads SET status_changed_at = COALESCE(last_attempt_at, created_at);

-- Create trigger to auto-update status_changed_at on status change
CREATE OR REPLACE FUNCTION public.update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_status_changed_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_status_changed_at();
