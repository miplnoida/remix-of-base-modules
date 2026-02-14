
-- Create tb_marital table
CREATE TABLE public.tb_marital (
  code VARCHAR(1) NOT NULL PRIMARY KEY,
  description VARCHAR(25) NULL
);

-- Enable RLS
ALTER TABLE public.tb_marital ENABLE ROW LEVEL SECURITY;

-- RLS: Allow authenticated users to read
CREATE POLICY "Authenticated users can read marital statuses"
  ON public.tb_marital FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Allow anon to read
CREATE POLICY "Anon can read marital statuses"
  ON public.tb_marital FOR SELECT
  TO anon
  USING (true);

-- RLS: Only admins can modify
CREATE POLICY "Admins can manage marital statuses"
  ON public.tb_marital FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- Seed data (idempotent)
INSERT INTO public.tb_marital (code, description) VALUES
  ('C', 'Common-Law'),
  ('D', 'Divorced'),
  ('M', 'Married'),
  ('P', 'Separated'),
  ('S', 'Single'),
  ('U', 'Unknown'),
  ('W', 'Widowed')
ON CONFLICT (code) DO NOTHING;

-- Register in api_registry
INSERT INTO public.api_registry (api_name, api_version, http_method, endpoint_path, description, requires_auth, is_enabled, category, sort_order)
VALUES ('Marital Statuses', 'v1', 'GET', '/api/v1/marital-statuses', 'Retrieve all marital status lookup values', true, true, 'Master Data', 20)
ON CONFLICT DO NOTHING;
