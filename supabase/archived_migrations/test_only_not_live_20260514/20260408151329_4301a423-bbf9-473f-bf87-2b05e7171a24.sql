
-- =============================================================
-- 1. ia_risk_register
-- =============================================================
CREATE TABLE public.ia_risk_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_universe_id UUID REFERENCES public.ia_audit_universe(id) ON DELETE SET NULL,
  risk_title TEXT NOT NULL,
  risk_description TEXT,
  risk_category TEXT DEFAULT 'Operational',
  inherent_likelihood INT CHECK (inherent_likelihood BETWEEN 1 AND 5),
  inherent_impact INT CHECK (inherent_impact BETWEEN 1 AND 5),
  inherent_risk_score NUMERIC GENERATED ALWAYS AS (inherent_likelihood * inherent_impact) STORED,
  inherent_risk_level TEXT,
  residual_likelihood INT CHECK (residual_likelihood BETWEEN 1 AND 5),
  residual_impact INT CHECK (residual_impact BETWEEN 1 AND 5),
  residual_risk_score NUMERIC GENERATED ALWAYS AS (residual_likelihood * residual_impact) STORED,
  residual_risk_level TEXT,
  control_effectiveness TEXT DEFAULT 'Moderate',
  risk_owner TEXT,
  review_date DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Open',
  fiscal_year TEXT,
  linked_risk_id UUID REFERENCES public.ia_risk_register(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

CREATE INDEX idx_risk_register_universe ON public.ia_risk_register(audit_universe_id);
CREATE INDEX idx_risk_register_status ON public.ia_risk_register(status);
CREATE INDEX idx_risk_register_category ON public.ia_risk_register(risk_category);

-- =============================================================
-- 2. ia_risk_mitigation_actions
-- =============================================================
CREATE TABLE public.ia_risk_mitigation_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES public.ia_risk_register(id) ON DELETE CASCADE,
  action_title TEXT NOT NULL,
  action_description TEXT,
  assigned_to TEXT,
  due_date DATE,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'Planned',
  priority TEXT DEFAULT 'Medium',
  evidence_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

CREATE INDEX idx_risk_mitigation_risk ON public.ia_risk_mitigation_actions(risk_id);

-- =============================================================
-- 3. ia_risk_reviews
-- =============================================================
CREATE TABLE public.ia_risk_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES public.ia_risk_register(id) ON DELETE CASCADE,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reviewed_by TEXT,
  previous_risk_level TEXT,
  new_risk_level TEXT,
  previous_score NUMERIC,
  new_score NUMERIC,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM'
);

CREATE INDEX idx_risk_reviews_risk ON public.ia_risk_reviews(risk_id);

-- =============================================================
-- 4. Audit triggers (fn_audit_row_change already exists)
-- =============================================================
CREATE TRIGGER trg_audit_ia_risk_register
  AFTER INSERT OR UPDATE OR DELETE ON public.ia_risk_register
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

CREATE TRIGGER trg_audit_ia_risk_mitigation_actions
  AFTER INSERT OR UPDATE OR DELETE ON public.ia_risk_mitigation_actions
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

CREATE TRIGGER trg_audit_ia_risk_reviews
  AFTER INSERT OR UPDATE OR DELETE ON public.ia_risk_reviews
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

-- =============================================================
-- 5. updated_at triggers
-- =============================================================
CREATE TRIGGER update_ia_risk_register_updated_at
  BEFORE UPDATE ON public.ia_risk_register
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ia_risk_mitigation_updated_at
  BEFORE UPDATE ON public.ia_risk_mitigation_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- 6. Enable realtime
-- =============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.ia_risk_register;
