ALTER TABLE public.leads DROP CONSTRAINT leads_status_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (status = ANY (ARRAY[
  'new', 'calling', 'answered', 'no_answer', 'busy', 'failed', 'done', 
  'scheduled', 'disqualified', 'bad_number', 'answered_no_qualify',
  'asesoria_agendada', 'asesoria_concretada', 'recontactar', 
  'departamento_reservado', 'cierres', 'archived'
]));