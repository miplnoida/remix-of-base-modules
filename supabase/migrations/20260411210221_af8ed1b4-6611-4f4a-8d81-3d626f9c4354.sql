
CREATE TABLE IF NOT EXISTS public.ce_breach_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breach_id TEXT NOT NULL UNIQUE,
  employer_name TEXT NOT NULL,
  reg_no TEXT,
  plan_id TEXT,
  breach_type TEXT NOT NULL,
  breach_date DATE NOT NULL,
  missed_amount NUMERIC(14,2) DEFAULT 0,
  total_remaining NUMERIC(14,2) DEFAULT 0,
  consecutive_misses INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Active',
  auto_detected BOOLEAN DEFAULT true,
  data_origin TEXT DEFAULT 'operational',
  created_by TEXT, updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ce_legal_proceedings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL UNIQUE,
  employer_name TEXT NOT NULL,
  reg_no TEXT,
  stage TEXT NOT NULL,
  arrears NUMERIC(14,2) DEFAULT 0,
  filed_date DATE, next_hearing DATE,
  court TEXT, solicitor TEXT,
  outcome TEXT DEFAULT 'Pending',
  data_origin TEXT DEFAULT 'operational',
  created_by TEXT, updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ce_audit_report_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_name TEXT NOT NULL, zone TEXT,
  audit_date DATE NOT NULL,
  findings_count INT DEFAULT 0,
  severity TEXT DEFAULT 'None',
  status TEXT DEFAULT 'Open',
  data_origin TEXT DEFAULT 'operational',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ce_arrears_report_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_name TEXT NOT NULL, zone TEXT,
  total_arrears NUMERIC(14,2) DEFAULT 0,
  aging_category TEXT,
  last_payment_date DATE,
  trend TEXT DEFAULT 'stable',
  data_origin TEXT DEFAULT 'operational',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ce_arrangement_report_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_name TEXT NOT NULL, zone TEXT,
  total_debt NUMERIC(14,2) DEFAULT 0,
  installment NUMERIC(14,2) DEFAULT 0,
  payments_made INT DEFAULT 0,
  total_payments INT DEFAULT 0,
  status TEXT DEFAULT 'Active',
  next_due DATE,
  data_origin TEXT DEFAULT 'operational',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ce_inspector_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_name TEXT NOT NULL, zone TEXT,
  plans_submitted INT DEFAULT 0,
  plans_approved INT DEFAULT 0,
  field_visits INT DEFAULT 0,
  cases_handled INT DEFAULT 0,
  compliance_rate NUMERIC(5,2) DEFAULT 0,
  report_period TEXT,
  data_origin TEXT DEFAULT 'operational',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ce_violation_correspondence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id TEXT NOT NULL,
  correspondence_date DATE NOT NULL,
  channel TEXT NOT NULL,
  direction TEXT DEFAULT 'Outgoing',
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  summary TEXT, contact_person TEXT, delivery_method TEXT,
  data_origin TEXT DEFAULT 'operational',
  created_by TEXT, updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed all tables
INSERT INTO public.ce_breach_monitoring (breach_id, employer_name, reg_no, plan_id, breach_type, breach_date, missed_amount, total_remaining, consecutive_misses, status, auto_detected, data_origin)
SELECT * FROM (VALUES
  ('BRH-001','Island Construction Ltd','R-10567','PP-2025-00045','Missed Installment','2026-03-01'::DATE,5400::NUMERIC,42000::NUMERIC,2,'Active',true,'seed'),
  ('BRH-002','Palm View Resort','R-10456','PP-2025-00038','Partial Payment','2026-02-28'::DATE,1200::NUMERIC,28500::NUMERIC,1,'Active',true,'seed'),
  ('BRH-003','Tropical Traders Inc','R-11245','PP-2026-00012','Missed Installment','2026-02-15'::DATE,3800::NUMERIC,15200::NUMERIC,1,'Resolved',true,'seed'),
  ('BRH-004','KN Shipping Services','R-11023','PP-2025-00022','Late Payment (>7 days)','2026-02-10'::DATE,8500::NUMERIC,85000::NUMERIC,3,'Escalated to Legal',false,'seed')
) AS v(breach_id,employer_name,reg_no,plan_id,breach_type,breach_date,missed_amount,total_remaining,consecutive_misses,status,auto_detected,data_origin)
WHERE NOT EXISTS (SELECT 1 FROM public.ce_breach_monitoring LIMIT 1);

INSERT INTO public.ce_legal_proceedings (case_number, employer_name, reg_no, stage, arrears, filed_date, next_hearing, court, solicitor, outcome, data_origin)
SELECT * FROM (VALUES
  ('LGL-2026-00034','KN Shipping Services','R-11023','Summons',210000::NUMERIC,'2026-01-15'::DATE,'2026-03-12'::DATE,'Magistrate Court','A. Harris','Pending','seed'),
  ('LGL-2026-00028','Island Construction Ltd','R-10567','Judgment Summons',128500::NUMERIC,'2025-11-20'::DATE,'2026-03-15'::DATE,'High Court','A. Harris','Pending','seed'),
  ('LGL-2026-00041','Nevis Traders Ltd','R-10892','Writ of Execution',52000::NUMERIC,'2025-09-10'::DATE,'2026-03-20'::DATE,'Magistrate Court','D. Francis','Pending','seed'),
  ('LGL-2025-00089','Palm View Resort','R-10456','Recovery Monitoring',35000::NUMERIC,'2025-06-01'::DATE,NULL::DATE,'Magistrate Court','A. Harris','Judgment Granted','seed'),
  ('LGL-2025-00076','Tropical Imports','R-10333','Commitment/JDS',92000::NUMERIC,'2025-04-15'::DATE,'2026-04-01'::DATE,'High Court','D. Francis','Pending','seed')
) AS v(case_number,employer_name,reg_no,stage,arrears,filed_date,next_hearing,court,solicitor,outcome,data_origin)
WHERE NOT EXISTS (SELECT 1 FROM public.ce_legal_proceedings LIMIT 1);

INSERT INTO public.ce_audit_report_entries (employer_name, zone, audit_date, findings_count, severity, status, data_origin) VALUES
  ('ABC Manufacturing Ltd','Zone A','2024-10-15',3,'Medium','Resolved','seed'),
  ('XYZ Construction Co','Zone B','2024-10-20',5,'High','In Progress','seed'),
  ('Tech Solutions Inc','Zone A','2024-11-01',0,'None','Compliant','seed'),
  ('Retail Mart Ltd','Zone C','2024-10-28',2,'Low','Resolved','seed'),
  ('Hospitality Group','Zone B','2024-11-05',7,'High','Open','seed');

INSERT INTO public.ce_arrears_report_entries (employer_name, zone, total_arrears, aging_category, last_payment_date, trend, data_origin) VALUES
  ('ABC Manufacturing Ltd','Zone A',125000,'90+ days','2024-08-15','increasing','seed'),
  ('XYZ Construction Co','Zone B',89000,'60-90 days','2024-09-20','stable','seed'),
  ('Retail Mart Ltd','Zone C',67000,'30-60 days','2024-10-05','decreasing','seed'),
  ('Hospitality Group','Zone B',156000,'90+ days','2024-07-30','increasing','seed'),
  ('Transport Services','Zone A',45000,'30-60 days','2024-10-12','stable','seed');

INSERT INTO public.ce_arrangement_report_entries (employer_name, zone, total_debt, installment, payments_made, total_payments, status, next_due, data_origin) VALUES
  ('ABC Manufacturing Ltd','Zone A',125000,10000,8,15,'Active','2024-12-01','seed'),
  ('XYZ Construction Co','Zone B',89000,8000,4,12,'Defaulted','2024-11-15','seed'),
  ('Retail Mart Ltd','Zone C',67000,5500,12,12,'Completed',NULL,'seed'),
  ('Hospitality Group','Zone B',156000,12000,6,18,'Active','2024-11-28','seed'),
  ('Transport Services','Zone A',45000,4500,7,10,'Active','2024-12-05','seed');

INSERT INTO public.ce_inspector_performance (inspector_name, zone, plans_submitted, plans_approved, field_visits, cases_handled, compliance_rate, report_period, data_origin) VALUES
  ('John Smith','Zone A',12,11,48,15,92,'2024-H2','seed'),
  ('Mary Johnson','Zone B',12,12,52,18,100,'2024-H2','seed'),
  ('Robert Brown','Zone A',11,10,44,12,91,'2024-H2','seed'),
  ('Sarah Davis','Zone C',12,11,50,16,92,'2024-H2','seed'),
  ('Michael Wilson','Zone B',10,9,38,10,90,'2024-H2','seed');

INSERT INTO public.ce_violation_correspondence (violation_id, correspondence_date, channel, direction, subject, status, summary, data_origin) VALUES
  ('VIO-DEMO-001','2024-01-15','Call','Outgoing','Registration Follow-up','Completed','Called employer regarding registration requirement. Agreed to visit office next week.','seed'),
  ('VIO-DEMO-001','2024-01-18','Letter','Outgoing','Formal Notice - Registration Required','Sent','Formal letter sent notifying employer of registration requirements and penalties.','seed');

-- Audit triggers on new tables
DO $$
DECLARE t TEXT;
  tables TEXT[] := ARRAY['ce_breach_monitoring','ce_legal_proceedings','ce_violation_correspondence'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_ce_audit_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_ce_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_ce_log_settings_change()', t, t);
  END LOOP;
END;
$$;
