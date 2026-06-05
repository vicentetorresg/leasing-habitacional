
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'ejecutiva');

-- Profiles table
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','calling','answered','no_answer','busy','failed','done')),
  assigned_to UUID REFERENCES public.profiles(user_id),
  last_attempt_at TIMESTAMPTZ
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Call attempts table
CREATE TABLE public.call_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  attempt_number INT NOT NULL DEFAULT 1,
  outcome TEXT NOT NULL CHECK (outcome IN ('answered','no_answer','busy','failed','completed')),
  notes TEXT,
  duration_seconds INT
);
ALTER TABLE public.call_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for leads
CREATE POLICY "Ejecutiva can view assigned or unassigned leads" ON public.leads FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') OR assigned_to = auth.uid() OR assigned_to IS NULL);
CREATE POLICY "Admin can do everything on leads" ON public.leads FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Ejecutiva can update assigned leads" ON public.leads FOR UPDATE 
  USING (assigned_to = auth.uid() OR assigned_to IS NULL);
CREATE POLICY "Anyone authenticated can insert leads" ON public.leads FOR INSERT 
  WITH CHECK (true);

-- RLS Policies for call_attempts
CREATE POLICY "Ejecutiva can view own attempts" ON public.call_attempts FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
CREATE POLICY "Ejecutiva can insert own attempts" ON public.call_attempts FOR INSERT 
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can do everything on attempts" ON public.call_attempts FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  -- Default role: ejecutiva
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'ejecutiva');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Seed data: 2 test leads
INSERT INTO public.leads (name, phone, email, source, external_id, created_time, status)
VALUES 
  ('María García López', '+52 55 1234 5678', 'maria.garcia@email.com', 'facebook', 'fb_lead_001', now() - interval '2 minutes', 'new'),
  ('Carlos Hernández Ruiz', '+52 55 8765 4321', 'carlos.hernandez@email.com', 'facebook', 'fb_lead_002', now() - interval '30 seconds', 'new');

-- Fix permissive INSERT policy on leads to require authentication
DROP POLICY "Anyone authenticated can insert leads" ON public.leads;
CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Add phone_e164 to profiles for ejecutiva's personal phone
ALTER TABLE public.profiles ADD COLUMN phone_e164 TEXT;

-- Add telephony provider columns to call_attempts
ALTER TABLE public.call_attempts ADD COLUMN provider TEXT DEFAULT 'telnyx';
ALTER TABLE public.call_attempts ADD COLUMN provider_call_sid_agent TEXT;
ALTER TABLE public.call_attempts ADD COLUMN provider_call_sid_lead TEXT;

-- App settings table for configurable values
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write settings
CREATE POLICY "Admin can read settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert settings"
ON public.app_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ejecutivas can read settings (needed for inactivity timer, max attempts)
CREATE POLICY "Ejecutiva can read settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

-- Seed default values
INSERT INTO public.app_settings (key, value, label) VALUES
  ('max_attempts', '10', 'Máximo de intentos antes de descartar'),
  ('inactivity_timeout_seconds', '180', 'Segundos de inactividad antes de alerta');
ALTER TABLE public.call_attempts ALTER COLUMN provider SET DEFAULT 'twilio';
-- Add new fields to leads table
ALTER TABLE public.leads ADD COLUMN rut TEXT;
ALTER TABLE public.leads ADD COLUMN sueldo_liquido INTEGER;
ALTER TABLE public.leads ADD COLUMN en_dicom BOOLEAN DEFAULT false;

-- Update leads status check to include new statuses
ALTER TABLE public.leads DROP CONSTRAINT leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new', 'calling', 'answered', 'no_answer', 'busy', 'failed', 'done', 'scheduled', 'disqualified', 'bad_number'));

-- Update call_attempts outcome check to include new outcomes
ALTER TABLE public.call_attempts DROP CONSTRAINT call_attempts_outcome_check;
ALTER TABLE public.call_attempts ADD CONSTRAINT call_attempts_outcome_check 
  CHECK (outcome IN ('answered', 'no_answer', 'busy', 'failed', 'completed', 'scheduled', 'answered_no_qualify', 'bad_number'));

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

-- Add 4 new fields to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS uf_sin_bp numeric NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS proyecto text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS fecha_reserva date NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS mes_cierre text NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  -- No default role assigned; admin assigns roles manually
  RETURN NEW;
END;
$function$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_source_external_id ON public.leads (source, external_id) WHERE external_id IS NOT NULL;-- Allow admin to delete leads
CREATE POLICY "Admin can delete leads"
ON public.leads
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to delete related call_attempts
CREATE POLICY "Admin can delete call attempts"
ON public.call_attempts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to delete lead_notes
CREATE POLICY "Admin can delete lead notes"
ON public.lead_notes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));ALTER TABLE public.leads ADD COLUMN sueldo_liquido_raw text;CREATE POLICY "Users can view profiles of note authors on their leads"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT ln.user_id FROM lead_notes ln
    JOIN leads l ON l.id = ln.lead_id
    WHERE l.advisor_id = auth.uid()
  )
);
-- Allow ejecutiva to read user_roles (needed to list advisors for scheduling)
CREATE POLICY "Ejecutiva can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'ejecutiva'::app_role));

-- Allow ejecutiva to read all profiles (needed to see advisor names)
CREATE POLICY "Ejecutiva can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'ejecutiva'::app_role));

-- Allow ejecutiva to view all leads (needed for advisor kanban view)
CREATE POLICY "Ejecutiva can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'ejecutiva'::app_role));

-- Allow ejecutiva to view notes on all leads (for advisor view)
CREATE POLICY "Ejecutiva can view all notes"
ON public.lead_notes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'ejecutiva'::app_role));

-- Allow ejecutiva to update all leads (needed for drag in advisor kanban)
CREATE POLICY "Ejecutiva can update all leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'ejecutiva'::app_role))
WITH CHECK (has_role(auth.uid(), 'ejecutiva'::app_role));
ALTER TABLE public.leads DROP CONSTRAINT leads_status_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (status = ANY (ARRAY[
  'new', 'calling', 'answered', 'no_answer', 'busy', 'failed', 'done', 
  'scheduled', 'disqualified', 'bad_number', 'answered_no_qualify',
  'asesoria_agendada', 'asesoria_concretada', 'recontactar', 
  'departamento_reservado', 'cierres', 'archived'
]));ALTER TABLE public.leads ADD COLUMN priority text NOT NULL DEFAULT 'media';
ALTER TABLE public.leads ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.leads ADD CONSTRAINT leads_priority_check CHECK (priority = ANY (ARRAY['alta', 'media', 'baja']));ALTER TABLE public.leads ADD COLUMN previous_status text;ALTER TABLE public.leads DROP CONSTRAINT leads_status_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (status = ANY (ARRAY[
  'new', 'calling', 'answered', 'no_answer', 'busy', 'failed', 'done', 
  'scheduled', 'disqualified', 'bad_number', 'answered_no_qualify',
  'asesoria_agendada', 'asesoria_concretada', 'recontactar', 
  'plan_presentado', 'departamento_reservado', 'cierres', 'archived'
]));ALTER TABLE public.leads ADD COLUMN scheduled_at timestamp with time zone;
-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_minutes INTEGER, -- null = no reminder, 0 = at time, 10 = 10min before, 30 = 30min before
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users can view their own tasks
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (user_id = auth.uid());

-- Ejecutiva can view all tasks
CREATE POLICY "Ejecutiva can view all tasks"
  ON public.tasks FOR SELECT
  USING (has_role(auth.uid(), 'ejecutiva'::app_role));

-- Admin can do everything
CREATE POLICY "Admin full access tasks"
  ON public.tasks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert own tasks
CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update own tasks
CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete own tasks
CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Enable pg_cron and pg_net extensions for scheduled task reminders
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read projects
CREATE POLICY "Authenticated users can read projects"
ON public.projects FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admin can manage projects
CREATE POLICY "Admin can manage projects"
ON public.projects FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial projects (alphabetically ordered)
INSERT INTO public.projects (name) VALUES
  ('Argomedo'),
  ('Aires de Marañón'),
  ('Ciudad Cerrillos'),
  ('Conecta Huechuraba'),
  ('Optimus'),
  ('Portales Covadonga'),
  ('Residencial Park');

-- Add is_demo flag to leads
ALTER TABLE public.leads ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

-- Mark existing demo leads
UPDATE public.leads SET is_demo = true WHERE source = 'demo';

-- Update demo user password to 'demo123'
-- We need to use the auth.users table via a function
SELECT auth.uid(); -- just to check; actual password update needs admin API

-- Allow ejecutiva to delete any lead note
CREATE POLICY "Ejecutiva can delete lead notes"
ON public.lead_notes
FOR DELETE
USING (has_role(auth.uid(), 'ejecutiva'::app_role));

-- Allow users to delete their own notes
CREATE POLICY "Users can delete own notes"
ON public.lead_notes
FOR DELETE
USING (user_id = auth.uid());
ALTER TABLE public.call_attempts DROP CONSTRAINT call_attempts_outcome_check;

ALTER TABLE public.call_attempts ADD CONSTRAINT call_attempts_outcome_check 
CHECK (outcome = ANY (ARRAY[
  'initiated'::text, 'in-progress'::text, 'answered'::text, 'no_answer'::text, 
  'busy'::text, 'failed'::text, 'completed'::text, 'scheduled'::text, 
  'answered_no_qualify'::text, 'bad_number'::text, 'canceled'::text
]));ALTER TABLE public.leads DROP CONSTRAINT leads_status_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (status = ANY (ARRAY[
  'new', 'calling', 'answered', 'no_answer', 'busy', 'failed', 'done',
  'scheduled', 'disqualified', 'bad_number', 'answered_no_qualify',
  'first_call', 'second_call',
  'asesoria_agendada', 'asesoria_concretada', 'recontactar',
  'plan_presentado', 'departamento_reservado', 'cierres', 'archived'
]));-- Allow users to update their own notes
CREATE POLICY "Users can update own notes"
ON public.lead_notes
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
-- Daily performance tracking per ejecutiva
CREATE TABLE public.daily_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  calls_made integer NOT NULL DEFAULT 0,
  calls_goal integer NOT NULL DEFAULT 0,
  calls_pct numeric(5,2) NOT NULL DEFAULT 0,
  scheduled_made integer NOT NULL DEFAULT 0,
  scheduled_goal integer NOT NULL DEFAULT 0,
  scheduled_pct numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_performance ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin full access daily_performance"
  ON public.daily_performance FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Ejecutiva can view own performance"
  ON public.daily_performance FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Ejecutiva can upsert own performance"
  ON public.daily_performance FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Ejecutiva can update own performance"
  ON public.daily_performance FOR UPDATE
  USING (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_daily_performance_user_date ON public.daily_performance(user_id, date);
CREATE INDEX idx_daily_performance_date ON public.daily_performance(date);
ALTER TABLE public.leads ADD COLUMN sms_sent boolean NOT NULL DEFAULT false;CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
-- Table to track incoming calls for real-time UI notifications
CREATE TABLE public.incoming_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_name TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  ejecutiva_user_id UUID NOT NULL,
  twilio_call_sid TEXT,
  status TEXT NOT NULL DEFAULT 'ringing',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incoming_calls ENABLE ROW LEVEL SECURITY;

-- Ejecutivas can see their own incoming calls
CREATE POLICY "Ejecutiva can view own incoming calls"
ON public.incoming_calls
FOR SELECT
USING (ejecutiva_user_id = auth.uid());

-- Admin can see all
CREATE POLICY "Admin full access incoming_calls"
ON public.incoming_calls
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ejecutivas can update their own (to mark as answered/dismissed)
CREATE POLICY "Ejecutiva can update own incoming calls"
ON public.incoming_calls
FOR UPDATE
USING (ejecutiva_user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_calls;
-- Enable pg_cron and pg_net if not already enabled
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove old schedules if they exist
select cron.unschedule('daily-advisor-digest') where exists (
  select 1 from cron.job where jobname = 'daily-advisor-digest'
);
select cron.unschedule('daily-executive-digest') where exists (
  select 1 from cron.job where jobname = 'daily-executive-digest'
);

-- Daily advisor digest at 9:00 AM Chile time (UTC-3 = 12:00 UTC)
select cron.schedule(
  'daily-advisor-digest',
  '0 12 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/daily-advisor-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id
  $$
);

-- Daily executive digest at 9:00 AM Chile time (UTC-3 = 12:00 UTC)
select cron.schedule(
  'daily-executive-digest',
  '0 12 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/daily-executive-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id
  $$
);

-- Table to track manual calls (no lead associated)
CREATE TABLE public.manual_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  twilio_call_sid text,
  status text NOT NULL DEFAULT 'initiated',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ejecutiva can view own manual calls"
ON public.manual_calls FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Ejecutiva can insert own manual calls"
ON public.manual_calls FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin full access manual_calls"
ON public.manual_calls FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_manual_calls_phone ON public.manual_calls(phone);
CREATE INDEX idx_manual_calls_user_id ON public.manual_calls(user_id);
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
-- Add 'dialer' role for users who only need to make manual calls
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dialer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dialer';
-- Drop the restrictive INSERT policy and recreate as permissive
DROP POLICY IF EXISTS "Users can insert own notes" ON public.lead_notes;
CREATE POLICY "Users can insert own notes"
  ON public.lead_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Drop all existing restrictive policies on lead_notes
DROP POLICY IF EXISTS "Admin full access notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Users can view notes on accessible leads" ON public.lead_notes;
DROP POLICY IF EXISTS "Admin can delete lead notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Ejecutiva can view all notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Ejecutiva can delete lead notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Users can update own notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON public.lead_notes;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admin full access notes" ON public.lead_notes FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Ejecutiva can view all notes" ON public.lead_notes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'ejecutiva'::app_role));

CREATE POLICY "Users can view notes on accessible leads" ON public.lead_notes FOR SELECT TO public USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_notes.lead_id AND (leads.assigned_to = auth.uid() OR leads.advisor_id = auth.uid())));

CREATE POLICY "Users can insert own notes" ON public.lead_notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notes" ON public.lead_notes FOR UPDATE TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notes" ON public.lead_notes FOR DELETE TO public USING (user_id = auth.uid());

CREATE POLICY "Ejecutiva can delete lead notes" ON public.lead_notes FOR DELETE TO public USING (has_role(auth.uid(), 'ejecutiva'::app_role));

CREATE POLICY "Admin can delete lead notes" ON public.lead_notes FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Recreate leads policies as PERMISSIVE
DROP POLICY IF EXISTS "Admin can do everything on leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view relevant leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update relevant leads" ON public.leads;
DROP POLICY IF EXISTS "Admin can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Ejecutiva can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Ejecutiva can update all leads" ON public.leads;

CREATE POLICY "Admin can do everything on leads" ON public.leads FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view relevant leads" ON public.leads FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role) OR assigned_to = auth.uid() OR assigned_to IS NULL OR advisor_id = auth.uid());

CREATE POLICY "Users can update relevant leads" ON public.leads FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role) OR assigned_to = auth.uid() OR assigned_to IS NULL OR advisor_id = auth.uid());

CREATE POLICY "Admin can delete leads" ON public.leads FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Ejecutiva can view all leads" ON public.leads FOR SELECT TO authenticated USING (has_role(auth.uid(), 'ejecutiva'::app_role));

CREATE POLICY "Ejecutiva can update all leads" ON public.leads FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'ejecutiva'::app_role)) WITH CHECK (has_role(auth.uid(), 'ejecutiva'::app_role));

ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS no_califica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_califica_razon text;

-- Fix: Convert restrictive UPDATE policies on leads to permissive so advisors can save no_califica
DROP POLICY IF EXISTS "Users can update relevant leads" ON public.leads;
DROP POLICY IF EXISTS "Ejecutiva can update all leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view relevant leads" ON public.leads;

-- Recreate UPDATE policies as PERMISSIVE
CREATE POLICY "Ejecutiva can update all leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'ejecutiva'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ejecutiva'::app_role));

CREATE POLICY "Advisor can update assigned leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (advisor_id = auth.uid())
  WITH CHECK (advisor_id = auth.uid());

-- Recreate SELECT policy as PERMISSIVE
CREATE POLICY "Users can view relevant leads"
  ON public.leads FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR assigned_to = auth.uid() 
    OR assigned_to IS NULL 
    OR advisor_id = auth.uid()
  );

CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  email_to TEXT NOT NULL,
  cc TEXT[] DEFAULT '{}',
  reply_to TEXT[] DEFAULT '{}',
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on email_queue"
  ON public.email_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view email queue"
  ON public.email_queue
  FOR SELECT
  TO authenticated
  USING (true);
