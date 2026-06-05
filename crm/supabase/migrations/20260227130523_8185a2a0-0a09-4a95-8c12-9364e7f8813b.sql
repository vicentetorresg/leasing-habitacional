ALTER TABLE public.call_attempts DROP CONSTRAINT call_attempts_outcome_check;

ALTER TABLE public.call_attempts ADD CONSTRAINT call_attempts_outcome_check 
CHECK (outcome = ANY (ARRAY[
  'initiated'::text, 'in-progress'::text, 'answered'::text, 'no_answer'::text, 
  'busy'::text, 'failed'::text, 'completed'::text, 'scheduled'::text, 
  'answered_no_qualify'::text, 'bad_number'::text, 'canceled'::text
]));