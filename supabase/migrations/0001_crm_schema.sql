-- CRM Schema for Crystal Web Solution
-- Security: Uses raw_app_meta_data (service-role only) instead of raw_user_meta_data for role assignment
-- All tables have comprehensive RLS policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User role enum
CREATE TYPE public.user_role AS ENUM ('client', 'staff', 'admin');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role DEFAULT 'client' NOT NULL,
  full_name TEXT,
  company_id UUID,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  industry TEXT,
  employee_count INT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  title TEXT,
  linkedin_url TEXT,
  status TEXT DEFAULT 'lead',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value DECIMAL(15, 2),
  stage TEXT DEFAULT 'prospecting',
  probability INT DEFAULT 0,
  expected_close_date DATE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  due_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company members table (for role assignment within companies)
CREATE TABLE public.company_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_deals_company_id ON public.deals(company_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_deals_owner_id ON public.deals(owner_id);
CREATE INDEX idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_notes_company_id ON public.notes(company_id);
CREATE INDEX idx_company_members_company_id ON public.company_members(company_id);
CREATE INDEX idx_company_members_user_id ON public.company_members(user_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
         OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff() RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('admin', 'staff')
         OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff')
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_company_member(company_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.company_members
    WHERE company_members.company_id = $1 AND company_members.user_id = auth.uid()
  )
$$ LANGUAGE SQL SECURITY DEFINER;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for companies
CREATE POLICY "Staff can view all companies" ON public.companies
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Company members can view their company" ON public.companies
  FOR SELECT USING (public.is_company_member(id));

CREATE POLICY "Staff can create companies" ON public.companies
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Staff can update companies" ON public.companies
  FOR UPDATE USING (public.is_staff());

-- RLS Policies for contacts
CREATE POLICY "Staff can view all contacts" ON public.contacts
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Company members can view contacts" ON public.contacts
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "Staff can create contacts" ON public.contacts
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Staff can update contacts" ON public.contacts
  FOR UPDATE USING (public.is_staff());

-- RLS Policies for deals
CREATE POLICY "Staff can view all deals" ON public.deals
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Company members can view deals" ON public.deals
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "Staff can create deals" ON public.deals
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Deal owner and staff can update" ON public.deals
  FOR UPDATE USING (public.is_staff() OR auth.uid() = owner_id);

-- RLS Policies for tasks
CREATE POLICY "Staff can view all tasks" ON public.tasks
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Assigned user can view task" ON public.tasks
  FOR SELECT USING (auth.uid() = assigned_to);

CREATE POLICY "Staff can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Assigned user and staff can update" ON public.tasks
  FOR UPDATE USING (public.is_staff() OR auth.uid() = assigned_to);

-- RLS Policies for notes
CREATE POLICY "Staff can view all notes" ON public.notes
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Company members can view notes" ON public.notes
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "Any authenticated user can create notes" ON public.notes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for company_members
CREATE POLICY "Staff can view all members" ON public.company_members
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Company members can view their company members" ON public.company_members
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "Staff can manage members" ON public.company_members
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Staff can update members" ON public.company_members
  FOR UPDATE USING (public.is_staff());

-- Trigger for handle_new_user (CRITICAL FIX: uses raw_app_meta_data, not raw_user_meta_data)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only read role from app_metadata if it exists (set by admin via service role)
  -- Default to 'client' role for all new users
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    new.id,
    COALESCE((new.raw_app_meta_data ->> 'role')::public.user_role, 'client'),
    new.raw_user_meta_data ->> 'full_name'
  );
  RETURN new;
END;
$$;

-- Trigger for profile updates
CREATE OR REPLACE FUNCTION public.handle_profile_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  new.updated_at = NOW();
  RETURN new;
END;
$$;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated();

-- Create similar triggers for other tables
CREATE TRIGGER on_companies_updated
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated();

CREATE TRIGGER on_contacts_updated
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated();

CREATE TRIGGER on_deals_updated
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated();

CREATE TRIGGER on_tasks_updated
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated();

CREATE TRIGGER on_notes_updated
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated();
