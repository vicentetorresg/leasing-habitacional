
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
