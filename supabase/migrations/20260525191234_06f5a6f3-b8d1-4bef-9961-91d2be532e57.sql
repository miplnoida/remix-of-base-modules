
CREATE TABLE IF NOT EXISTS public.ce_workflow_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key VARCHAR(80) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  workflow_definition_id UUID REFERENCES public.workflow_definitions(id),
  fallback_behavior VARCHAR(40) NOT NULL DEFAULT 'DIRECT_APPLY'
    CHECK (fallback_behavior IN ('DIRECT_APPLY','BLOCK','REQUIRE_NOTE')),
  applicable_fund VARCHAR(50),
  applicable_severity VARCHAR(20),
  applicable_min_amount NUMERIC(18,2),
  applicable_violation_type_id UUID,
  priority INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_wf_mappings_event ON public.ce_workflow_mappings(event_key, enabled);

ALTER TABLE public.ce_workflow_mappings DISABLE ROW LEVEL SECURITY;

INSERT INTO public.ce_workflow_mappings (event_key, enabled, fallback_behavior, notes)
SELECT k, false, 'DIRECT_APPLY', 'SEED- default disabled mapping'
FROM (VALUES
  ('violation.verify'),
  ('violation.manual_create'),
  ('case.create_approval'),
  ('notice.approval'),
  ('arrangement.approval'),
  ('waiver.approval'),
  ('legal.escalation_approval'),
  ('case.closure_approval'),
  ('case.reopen_approval'),
  ('case.merge_approval'),
  ('inspection.plan_approval'),
  ('inspection.finding_approval'),
  ('rule.activation_approval')
) AS t(k)
WHERE NOT EXISTS (SELECT 1 FROM public.ce_workflow_mappings m WHERE m.event_key = t.k);
