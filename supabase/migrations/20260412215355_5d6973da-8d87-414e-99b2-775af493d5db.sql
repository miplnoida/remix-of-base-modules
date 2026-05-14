
DROP VIEW IF EXISTS public.ce_inspector_profiles CASCADE;

ALTER TABLE public.ce_inspectors
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS status_effective_from DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS status_effective_to DATE,
  ADD COLUMN IF NOT EXISTS status_changed_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status_change_reason TEXT,
  ADD COLUMN IF NOT EXISTS transferred_to_zone_id UUID REFERENCES public.ce_zones(id),
  ADD COLUMN IF NOT EXISTS transferred_from_zone_id UUID REFERENCES public.ce_zones(id);

ALTER TABLE public.ce_inspectors DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.ce_inspectors
  ADD COLUMN is_active BOOLEAN GENERATED ALWAYS AS (status = 'ACTIVE') STORED;

ALTER TABLE public.ce_inspectors
  ADD CONSTRAINT chk_ce_inspectors_status
  CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'TRANSFERRED', 'SUSPENDED', 'RESIGNED', 'INACTIVE'));

CREATE INDEX IF NOT EXISTS idx_ce_inspectors_status ON public.ce_inspectors(status);

ALTER TABLE public.ce_violation_assignments
  ADD COLUMN IF NOT EXISTS reassignment_reason VARCHAR(30),
  ADD COLUMN IF NOT EXISTS reassigned_from_inspector_id UUID REFERENCES public.ce_inspectors(id);

ALTER TABLE public.ce_violation_assignments
  ADD CONSTRAINT chk_violation_assign_reassign_reason
  CHECK (reassignment_reason IS NULL OR reassignment_reason IN (
    'RESIGNATION', 'TRANSFER', 'SUSPENSION', 'LEAVE', 'PROMOTION', 'MANUAL'
  ));

CREATE TABLE IF NOT EXISTS public.ce_inspector_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL REFERENCES public.ce_inspectors(id) ON DELETE CASCADE,
  previous_status VARCHAR(20) NOT NULL,
  new_status VARCHAR(20) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  reason TEXT,
  violations_reassigned_count INTEGER DEFAULT 0,
  changed_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_inspector_status_history_inspector
  ON public.ce_inspector_status_history(inspector_id, created_at DESC);

CREATE TRIGGER trg_ce_inspector_status_history_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.ce_inspector_status_history
  FOR EACH ROW EXECUTE FUNCTION public.fn_ce_log_settings_change();

CREATE OR REPLACE FUNCTION public.fn_ce_inspector_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.ce_inspector_status_history
    SET effective_to = CURRENT_DATE
    WHERE inspector_id = NEW.id AND effective_to IS NULL AND new_status = OLD.status;

    INSERT INTO public.ce_inspector_status_history (
      inspector_id, previous_status, new_status, effective_from, reason, changed_by
    ) VALUES (
      NEW.id, OLD.status, NEW.status,
      COALESCE(NEW.status_effective_from, CURRENT_DATE),
      NEW.status_change_reason,
      COALESCE(NEW.status_changed_by, 'SYSTEM')
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ce_inspectors_status_change
  AFTER UPDATE ON public.ce_inspectors
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.fn_ce_inspector_status_change();

CREATE VIEW public.ce_inspector_profiles AS
SELECT
  ci.id AS inspector_id, ci.inspector_code, ci.status, ci.is_active,
  ci.status_effective_from, ci.status_effective_to,
  ci.max_caseload, ci.can_handle_review, ci.can_handle_legal,
  ci.supervisor_id, ci.primary_zone_id, ci.office_code, ci.legacy_inspector_code,
  ci.transferred_to_zone_id, ci.transferred_from_zone_id,
  p.id AS profile_id, p.first_name, p.last_name, p.email, p.user_code,
  p.designation_id, d.name AS designation_name,
  cz.zone_name AS primary_zone_name,
  sup.inspector_code AS supervisor_code,
  sp.first_name AS supervisor_first_name, sp.last_name AS supervisor_last_name,
  ti.insp_name AS legacy_inspector_name
FROM public.ce_inspectors ci
LEFT JOIN public.profiles p ON p.id = ci.profile_id
LEFT JOIN public.tb_designations d ON d.id = p.designation_id
LEFT JOIN public.ce_zones cz ON cz.id = ci.primary_zone_id
LEFT JOIN public.ce_inspectors sup ON sup.id = ci.supervisor_id
LEFT JOIN public.profiles sp ON sp.id = sup.profile_id
LEFT JOIN public.tb_inspector ti ON ti.code = ci.legacy_inspector_code;
