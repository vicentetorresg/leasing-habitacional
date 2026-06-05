
-- 1. Add 'asesor' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'asesor';

-- 2. Add advisor_id to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS advisor_id uuid;

-- 3. Update leads status check with advisor statuses
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN (
    'new', 'calling', 'answered', 'no_answer', 'busy', 'failed', 'done', 
    'scheduled', 'disqualified', 'bad_number',
    'asesoria_agendada', 'asesoria_concretada', 'recontactar', 'departamento_reservado'
  ));

-- 4. Update call_attempts outcome check
ALTER TABLE public.call_attempts DROP CONSTRAINT IF EXISTS call_attempts_outcome_check;
ALTER TABLE public.call_attempts ADD CONSTRAINT call_attempts_outcome_check 
  CHECK (outcome IN (
    'answered', 'no_answer', 'busy', 'failed', 'completed', 
    'scheduled', 'answered_no_qualify', 'bad_number'
  ));

-- 5. Create lead_notes table
CREATE TABLE public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access notes" ON public.lead_notes 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view notes on accessible leads" ON public.lead_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = lead_notes.lead_id 
      AND (leads.assigned_to = auth.uid() OR leads.advisor_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own notes" ON public.lead_notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 6. Update leads policies to include advisor access
DROP POLICY IF EXISTS "Ejecutiva can view assigned or unassigned leads" ON public.leads;
CREATE POLICY "Users can view relevant leads" ON public.leads
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR assigned_to = auth.uid() 
    OR assigned_to IS NULL 
    OR advisor_id = auth.uid()
  );

DROP POLICY IF EXISTS "Ejecutiva can update assigned leads" ON public.leads;
CREATE POLICY "Users can update relevant leads" ON public.leads
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_to = auth.uid() 
    OR assigned_to IS NULL 
    OR advisor_id = auth.uid()
  );

-- 7. Enable realtime for lead_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_notes;
