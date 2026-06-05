
-- Update leads status check to include new statuses
ALTER TABLE public.leads DROP CONSTRAINT leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new', 'calling', 'answered', 'no_answer', 'busy', 'failed', 'done', 'scheduled', 'disqualified', 'bad_number'));

-- Update call_attempts outcome check to include new outcomes
ALTER TABLE public.call_attempts DROP CONSTRAINT call_attempts_outcome_check;
ALTER TABLE public.call_attempts ADD CONSTRAINT call_attempts_outcome_check 
  CHECK (outcome IN ('answered', 'no_answer', 'busy', 'failed', 'completed', 'scheduled', 'answered_no_qualify', 'bad_number'));
