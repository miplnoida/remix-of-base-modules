-- Create role enum
CREATE TYPE public.app_role AS ENUM ('Clerk', 'LegalOfficer', 'Supervisor', 'FinanceOfficer', 'ReadOnly', 'Admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to check if user has any of the listed roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create enums for legal module
CREATE TYPE public.case_type AS ENUM ('Prosecution', 'Compliance', 'Appeal', 'Recovery', 'Employer Dispute', 'IP Dispute', 'Garnishment', 'Other');
CREATE TYPE public.case_status AS ENUM ('Draft', 'Filed', 'Under Review', 'Hearing Scheduled', 'Hearing Held', 'Decision Pending', 'Order Issued', 'Closed – Compliant', 'Closed – Non-Compliant', 'Withdrawn', 'Appealed', 'Reopened');
CREATE TYPE public.case_flag AS ENUM ('Urgent', 'Escalated', 'On Hold', 'Confidential', 'External Counsel');
CREATE TYPE public.priority_level AS ENUM ('Low', 'Medium', 'High', 'Urgent');
CREATE TYPE public.case_source AS ENUM ('Complaint', 'Referral', 'System', 'Audit');
CREATE TYPE public.service_status AS ENUM ('Not Served', 'Served', 'Service Failed');
CREATE TYPE public.party_role AS ENUM ('Primary Respondent', 'Complainant', 'Representative', 'Third Party');
CREATE TYPE public.task_status AS ENUM ('Open', 'In Progress', 'Completed', 'Deferred');
CREATE TYPE public.document_type AS ENUM ('Filings', 'Evidence', 'Notices', 'Orders', 'Correspondence', 'Internal');
CREATE TYPE public.order_status AS ENUM ('Draft', 'Under Review', 'Approved', 'Published');
CREATE TYPE public.penalty_status AS ENUM ('Pending', 'Paid', 'Overdue', 'Waived');
CREATE TYPE public.settlement_status AS ENUM ('Proposed', 'Accepted', 'Rejected', 'Completed');

-- Legal cases table
CREATE TABLE public.legal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  case_type case_type NOT NULL,
  status case_status DEFAULT 'Draft' NOT NULL,
  stage TEXT DEFAULT 'Intake',
  priority priority_level DEFAULT 'Medium',
  confidential BOOLEAN DEFAULT FALSE,
  source case_source NOT NULL,
  summary TEXT,
  relief_sought TEXT,
  assignee_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  filed_at TIMESTAMPTZ,
  next_event_at TIMESTAMPTZ,
  flags case_flag[] DEFAULT '{}',
  related_case_ids UUID[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;

-- Parties table
CREATE TABLE public.legal_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE NOT NULL,
  role party_role NOT NULL,
  registry_ref TEXT,
  registry_type TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  representative_id UUID REFERENCES public.legal_parties(id),
  service_status service_status DEFAULT 'Not Served',
  service_method TEXT,
  service_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.legal_parties ENABLE ROW LEVEL SECURITY;

-- Hearings table
CREATE TABLE public.legal_hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  venue TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  panel TEXT[] DEFAULT '{}',
  agenda TEXT,
  attendance JSONB,
  outcome TEXT,
  minutes_doc_id UUID,
  recording_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.legal_hearings ENABLE ROW LEVEL SECURITY;

-- Tasks table
CREATE TABLE public.legal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id),
  priority priority_level DEFAULT 'Medium',
  due_on TIMESTAMPTZ,
  status task_status DEFAULT 'Open',
  recurrence TEXT,
  checklist JSONB,
  related_entity TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.legal_tasks ENABLE ROW LEVEL SECURITY;

-- Documents table
CREATE TABLE public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE NOT NULL,
  type document_type NOT NULL,
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  size TEXT,
  file_path TEXT,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  linked_entities TEXT[] DEFAULT '{}',
  confidential BOOLEAN DEFAULT FALSE,
  checksum TEXT,
  url TEXT
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Orders table
CREATE TABLE public.legal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE NOT NULL,
  number TEXT,
  draft_html TEXT,
  published_pdf_id UUID,
  findings TEXT,
  directives TEXT,
  compliance_due TIMESTAMPTZ,
  status order_status DEFAULT 'Draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.legal_orders ENABLE ROW LEVEL SECURITY;

-- Penalties table
CREATE TABLE public.legal_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.legal_orders(id),
  type TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'XCD',
  due_on TIMESTAMPTZ NOT NULL,
  status penalty_status DEFAULT 'Pending',
  payments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.legal_penalties ENABLE ROW LEVEL SECURITY;

-- Settlements table
CREATE TABLE public.legal_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE NOT NULL,
  terms TEXT NOT NULL,
  status settlement_status DEFAULT 'Proposed',
  payment_plan JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.legal_settlements ENABLE ROW LEVEL SECURITY;

-- Timeline events table
CREATE TABLE public.legal_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_name TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB
);

ALTER TABLE public.legal_timeline_events ENABLE ROW LEVEL SECURITY;

-- Audit log table
CREATE TABLE public.legal_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before JSONB,
  after JSONB,
  ip_address TEXT
);

ALTER TABLE public.legal_audit_log ENABLE ROW LEVEL SECURITY;

-- Saved views table
CREATE TABLE public.legal_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.legal_saved_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));

-- RLS Policies for legal_cases
CREATE POLICY "Users can view non-confidential cases"
  ON public.legal_cases FOR SELECT
  TO authenticated
  USING (
    NOT confidential OR
    public.has_any_role(auth.uid(), ARRAY['LegalOfficer', 'Supervisor', 'Admin']::app_role[])
  );

CREATE POLICY "Authorized users can create cases"
  ON public.legal_cases FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['Clerk', 'LegalOfficer', 'Supervisor', 'Admin']::app_role[])
  );

CREATE POLICY "Authorized users can update cases"
  ON public.legal_cases FOR UPDATE
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['Clerk', 'LegalOfficer', 'Supervisor', 'Admin']::app_role[])
  );

-- RLS Policies for legal_parties
CREATE POLICY "Users can view parties for accessible cases"
  ON public.legal_parties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.legal_cases
      WHERE id = legal_parties.case_id
      AND (NOT confidential OR public.has_any_role(auth.uid(), ARRAY['LegalOfficer', 'Supervisor', 'Admin']::app_role[]))
    )
  );

CREATE POLICY "Authorized users can manage parties"
  ON public.legal_parties FOR ALL
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['Clerk', 'LegalOfficer', 'Supervisor', 'Admin']::app_role[])
  );

-- RLS Policies for other tables (hearings, tasks, documents, etc.)
CREATE POLICY "Users can view hearings for accessible cases"
  ON public.legal_hearings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.legal_cases
      WHERE id = legal_hearings.case_id
      AND (NOT confidential OR public.has_any_role(auth.uid(), ARRAY['LegalOfficer', 'Supervisor', 'Admin']::app_role[]))
    )
  );

CREATE POLICY "Authorized users can manage hearings"
  ON public.legal_hearings FOR ALL
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['LegalOfficer', 'Supervisor', 'Admin']::app_role[])
  );

CREATE POLICY "Users can view tasks for accessible cases"
  ON public.legal_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.legal_cases
      WHERE id = legal_tasks.case_id
      AND (NOT confidential OR public.has_any_role(auth.uid(), ARRAY['LegalOfficer', 'Supervisor', 'Admin']::app_role[]))
    )
  );

CREATE POLICY "Authorized users can manage tasks"
  ON public.legal_tasks FOR ALL
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['Clerk', 'LegalOfficer', 'Supervisor', 'Admin']::app_role[])
  );

CREATE POLICY "Users can view documents for accessible cases"
  ON public.legal_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.legal_cases
      WHERE id = legal_documents.case_id
      AND (NOT legal_documents.confidential OR public.has_any_role(auth.uid(), ARRAY['LegalOfficer', 'Supervisor', 'Admin']::app_role[]))
    )
  );

CREATE POLICY "Authorized users can manage documents"
  ON public.legal_documents FOR ALL
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['Clerk', 'LegalOfficer', 'Supervisor', 'Admin']::app_role[])
  );

CREATE POLICY "Users can view orders for accessible cases"
  ON public.legal_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.legal_cases
      WHERE id = legal_orders.case_id
      AND (NOT confidential OR public.has_any_role(auth.uid(), ARRAY['LegalOfficer', 'Supervisor', 'Admin']::app_role[]))
    )
  );

CREATE POLICY "Authorized users can create/update orders"
  ON public.legal_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['LegalOfficer', 'Supervisor', 'Admin']::app_role[])
  );

CREATE POLICY "Authorized users can update orders"
  ON public.legal_orders FOR UPDATE
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['LegalOfficer', 'Supervisor', 'Admin']::app_role[])
  );

CREATE POLICY "Users can view penalties, settlements, timeline, audit"
  ON public.legal_penalties FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view settlements"
  ON public.legal_settlements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view timeline events"
  ON public.legal_timeline_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view audit log"
  ON public.legal_audit_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own saved views"
  ON public.legal_saved_views FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_legal_cases_updated_at
  BEFORE UPDATE ON public.legal_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();