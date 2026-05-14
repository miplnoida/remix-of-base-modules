
-- 1. Audit trigger on ia_audit_universe
CREATE TRIGGER audit_ia_audit_universe
AFTER INSERT OR UPDATE OR DELETE ON public.ia_audit_universe
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

-- 2. Performance indexes on ia_audit_universe
CREATE INDEX idx_ia_audit_universe_entity_type ON public.ia_audit_universe (entity_type);
CREATE INDEX idx_ia_audit_universe_status ON public.ia_audit_universe (status);
CREATE INDEX idx_ia_audit_universe_is_active ON public.ia_audit_universe (is_active);

-- 3. Mitigation templates table
CREATE TABLE public.ia_mitigation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  template_description TEXT,
  category TEXT,
  default_priority TEXT NOT NULL DEFAULT 'Medium',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE TRIGGER audit_ia_mitigation_templates
AFTER INSERT OR UPDATE OR DELETE ON public.ia_mitigation_templates
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

CREATE TRIGGER set_ia_mitigation_templates_updated_at
BEFORE UPDATE ON public.ia_mitigation_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add template_id FK to mitigation actions
ALTER TABLE public.ia_risk_mitigation_actions
ADD COLUMN template_id UUID REFERENCES public.ia_mitigation_templates(id);

-- 5. Add risk_source to risk register
ALTER TABLE public.ia_risk_register
ADD COLUMN risk_source TEXT;

-- 6. Unique partial index for duplicate prevention
CREATE UNIQUE INDEX idx_ia_risk_register_unique_active_title
ON public.ia_risk_register (audit_universe_id, lower(risk_title))
WHERE is_active = true;
