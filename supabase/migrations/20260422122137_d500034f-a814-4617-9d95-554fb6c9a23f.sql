-- ============================================
-- Weekly Plan Builder — Selection Mode + Exception Audit Trail
-- ============================================

-- 1. Extend ce_weekly_plan_items with selection-mode metadata
ALTER TABLE public.ce_weekly_plan_items
  ADD COLUMN IF NOT EXISTS selection_mode varchar(16),
  ADD COLUMN IF NOT EXISTS exception_category varchar(64),
  ADD COLUMN IF NOT EXISTS exception_reason_note text,
  ADD COLUMN IF NOT EXISTS exception_status varchar(32) DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS exception_approved_by varchar(64),
  ADD COLUMN IF NOT EXISTS exception_approved_at timestamptz;

-- 2. Backfill selection_mode using existing source_type signals
UPDATE public.ce_weekly_plan_items
SET selection_mode = CASE
  WHEN selection_mode IS NOT NULL THEN selection_mode
  WHEN source_type = 'MANUAL' THEN 'DIRECT'
  WHEN source_type IS NULL THEN 'DIRECT'
  ELSE 'RECOMMENDED'
END
WHERE selection_mode IS NULL;

CREATE INDEX IF NOT EXISTS idx_ce_wpi_selection_mode
  ON public.ce_weekly_plan_items (selection_mode);

CREATE INDEX IF NOT EXISTS idx_ce_wpi_exception_status
  ON public.ce_weekly_plan_items (exception_status)
  WHERE selection_mode = 'EXCEPTION';

-- 3. Audit trail table — every selection / exception lifecycle event
CREATE TABLE IF NOT EXISTS public.ce_weekly_plan_item_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  item_id uuid,
  action varchar(48) NOT NULL,            -- ADDED_RECOMMENDED, ADDED_DIRECT, ADDED_EXCEPTION,
                                          -- EXCEPTION_APPROVED, EXCEPTION_REJECTED, REMOVED, OVERRIDE_NOTE
  selection_mode varchar(16),
  employer_id varchar(64),
  employer_name varchar(255),
  exception_category varchar(64),
  exception_reason_note text,
  override_note text,
  snapshot jsonb,                          -- snapshot of relevant item fields at time of action
  performed_by varchar(64) NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_wpi_audit_plan
  ON public.ce_weekly_plan_item_audit (plan_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ce_wpi_audit_item
  ON public.ce_weekly_plan_item_audit (item_id);

CREATE INDEX IF NOT EXISTS idx_ce_wpi_audit_action
  ON public.ce_weekly_plan_item_audit (action);

COMMENT ON COLUMN public.ce_weekly_plan_items.selection_mode IS
  'How the employer entered the plan: RECOMMENDED (system intelligence), DIRECT (operator-picked from master), EXCEPTION (controlled override).';

COMMENT ON COLUMN public.ce_weekly_plan_items.exception_status IS
  'NOT_REQUIRED for non-exception items; PENDING_APPROVAL / APPROVED / REJECTED for exceptions per policy.';

COMMENT ON TABLE public.ce_weekly_plan_item_audit IS
  'Immutable audit trail of selection-mode events for weekly plan items (used by Weekly Plan Builder governance).';