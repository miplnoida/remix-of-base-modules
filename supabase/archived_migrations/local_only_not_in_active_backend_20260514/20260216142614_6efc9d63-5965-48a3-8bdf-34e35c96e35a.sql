
-- External API Master Table
CREATE TABLE public.external_api_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_code TEXT NOT NULL UNIQUE,
  api_name TEXT NOT NULL,
  api_group TEXT NOT NULL,
  description TEXT,
  http_method TEXT NOT NULL DEFAULT 'GET' CHECK (http_method IN ('GET','POST','PUT','DELETE')),
  endpoint_url TEXT NOT NULL,
  requires_auth BOOLEAN NOT NULL DEFAULT false,
  auth_type TEXT NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none','bearer_token','api_key')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.external_api_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active external APIs"
  ON public.external_api_master FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage external APIs"
  ON public.external_api_master FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- External API Request Fields
CREATE TABLE public.external_api_request_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id UUID NOT NULL REFERENCES public.external_api_master(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'string' CHECK (data_type IN ('string','number','boolean','date','json')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  location TEXT NOT NULL DEFAULT 'body' CHECK (location IN ('query','path','header','body')),
  sample_value TEXT,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0
);

ALTER TABLE public.external_api_request_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read request fields"
  ON public.external_api_request_fields FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage request fields"
  ON public.external_api_request_fields FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- External API Response Fields
CREATE TABLE public.external_api_response_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id UUID NOT NULL REFERENCES public.external_api_master(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  sample_value TEXT,
  display_order INT NOT NULL DEFAULT 0
);

ALTER TABLE public.external_api_response_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read response fields"
  ON public.external_api_response_fields FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage response fields"
  ON public.external_api_response_fields FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- External API Change Log
CREATE TABLE public.external_api_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id UUID NOT NULL REFERENCES public.external_api_master(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  change_description TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT
);

ALTER TABLE public.external_api_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read change logs"
  ON public.external_api_change_log FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage change logs"
  ON public.external_api_change_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- External API Execution Logs
CREATE TABLE public.external_api_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id UUID NOT NULL REFERENCES public.external_api_master(id) ON DELETE CASCADE,
  request_payload JSONB,
  response_payload JSONB,
  http_status_code INT,
  execution_time_ms INT,
  executed_by UUID REFERENCES auth.users(id),
  is_success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.external_api_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own execution logs"
  ON public.external_api_execution_logs FOR SELECT TO authenticated
  USING (executed_by = auth.uid());

CREATE POLICY "Users can insert execution logs"
  ON public.external_api_execution_logs FOR INSERT TO authenticated
  WITH CHECK (executed_by = auth.uid());

CREATE POLICY "Admins can view all execution logs"
  ON public.external_api_execution_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));

-- External API Role Mapping
CREATE TABLE public.external_api_role_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id UUID NOT NULL REFERENCES public.external_api_master(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(api_id, role_name)
);

ALTER TABLE public.external_api_role_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read role mappings"
  ON public.external_api_role_mapping FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage role mappings"
  ON public.external_api_role_mapping FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- Auto-update updated_at trigger
CREATE TRIGGER update_external_api_master_updated_at
  BEFORE UPDATE ON public.external_api_master
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create change log on update
CREATE OR REPLACE FUNCTION public.fn_external_api_change_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.external_api_change_log (api_id, version, change_description, changed_by)
  VALUES (NEW.id, NEW.version, 'API definition updated', current_setting('request.jwt.claims', true)::json->>'sub');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_external_api_change_log
  AFTER UPDATE ON public.external_api_master
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_external_api_change_log();
