ALTER TABLE public.leads DROP CONSTRAINT leads_status_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (status = ANY (ARRAY[
  'new', 'calling', 'answered', 'no_answer', 'busy', 'failed', 'done',
  'scheduled', 'disqualified', 'bad_number', 'answered_no_qualify',
  'first_call', 'second_call',
  'asesoria_agendada', 'asesoria_concretada', 'recontactar',
  'plan_presentado', 'departamento_reservado', 'cierres', 'archived',
  'reciclado'
]));
