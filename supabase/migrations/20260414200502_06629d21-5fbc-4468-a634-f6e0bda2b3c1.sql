
-- =====================================================
-- Redesign Head Cashier: Default-Per-Branch + Override
-- =====================================================

-- 1. Default head cashier per branch
CREATE TABLE IF NOT EXISTS public.cn_head_cashier_default (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code VARCHAR NOT NULL,
  user_id UUID NOT NULL,
  user_code VARCHAR NOT NULL,
  full_name VARCHAR,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_by VARCHAR NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- One active default per office
CREATE UNIQUE INDEX IF NOT EXISTS uq_hc_default_office_active
  ON public.cn_head_cashier_default (office_code) WHERE is_active = true;

-- 2. Temporary overrides
CREATE TABLE IF NOT EXISTS public.cn_head_cashier_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code VARCHAR NOT NULL,
  user_id UUID NOT NULL,
  user_code VARCHAR NOT NULL,
  full_name VARCHAR,
  override_start DATE NOT NULL,
  override_end DATE NOT NULL,
  reason TEXT,
  assigned_by VARCHAR NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_hc_override_lookup
  ON public.cn_head_cashier_override (office_code, is_active, override_start, override_end);

-- 3. resolve_head_cashier RPC
DROP FUNCTION IF EXISTS public.resolve_head_cashier(DATE, VARCHAR);
CREATE OR REPLACE FUNCTION public.resolve_head_cashier(
  p_date DATE DEFAULT CURRENT_DATE,
  p_office_code VARCHAR DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_rec RECORD;
BEGIN
  -- First check overrides
  IF p_office_code IS NOT NULL THEN
    SELECT o.user_id, o.user_code, o.full_name, o.office_code, o.assigned_by, o.assigned_at::TEXT AS assigned_at
    INTO v_rec
    FROM cn_head_cashier_override o
    WHERE o.office_code = p_office_code
      AND o.is_active = true
      AND p_date BETWEEN o.override_start AND o.override_end
    ORDER BY o.assigned_at DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN json_build_object(
        'found', true,
        'source', 'override',
        'user_id', v_rec.user_id,
        'user_code', v_rec.user_code,
        'full_name', v_rec.full_name,
        'office_code', v_rec.office_code,
        'assigned_by', v_rec.assigned_by,
        'assigned_at', v_rec.assigned_at
      );
    END IF;

    -- Fall back to default
    SELECT d.user_id, d.user_code, d.full_name, d.office_code, d.assigned_by, d.assigned_at::TEXT AS assigned_at
    INTO v_rec
    FROM cn_head_cashier_default d
    WHERE d.office_code = p_office_code
      AND d.is_active = true;

    IF FOUND THEN
      RETURN json_build_object(
        'found', true,
        'source', 'default',
        'user_id', v_rec.user_id,
        'user_code', v_rec.user_code,
        'full_name', v_rec.full_name,
        'office_code', v_rec.office_code,
        'assigned_by', v_rec.assigned_by,
        'assigned_at', v_rec.assigned_at
      );
    END IF;
  END IF;

  RETURN json_build_object('found', false);
END;
$$;

-- 4. set_default_head_cashier RPC
DROP FUNCTION IF EXISTS public.set_default_head_cashier(VARCHAR, UUID, VARCHAR, VARCHAR, VARCHAR);
CREATE OR REPLACE FUNCTION public.set_default_head_cashier(
  p_office_code VARCHAR,
  p_user_id UUID,
  p_user_code VARCHAR,
  p_full_name VARCHAR DEFAULT NULL,
  p_assigned_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_user_code VARCHAR;
  v_new_id UUID;
BEGIN
  -- Get previous default for audit
  SELECT user_code INTO v_prev_user_code
  FROM cn_head_cashier_default
  WHERE office_code = p_office_code AND is_active = true;

  -- Deactivate old default
  UPDATE cn_head_cashier_default SET is_active = false
  WHERE office_code = p_office_code AND is_active = true;

  -- Insert new default
  INSERT INTO cn_head_cashier_default (office_code, user_id, user_code, full_name, assigned_by)
  VALUES (p_office_code, p_user_id, p_user_code, p_full_name, p_assigned_by)
  RETURNING id INTO v_new_id;

  -- Audit log
  INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_id, user_name, after_value, payload_json)
  VALUES ('set_default', 'cn_head_cashier_default', p_office_code, 'Payment Module', p_user_id, p_assigned_by,
    jsonb_build_object('user_code', p_user_code, 'office_code', p_office_code),
    jsonb_build_object('previous_user_code', v_prev_user_code));

  RETURN json_build_object('success', true, 'id', v_new_id, 'user_code', p_user_code);
END;
$$;

-- 5. create_head_cashier_override RPC
DROP FUNCTION IF EXISTS public.create_head_cashier_override(VARCHAR, UUID, VARCHAR, VARCHAR, DATE, DATE, TEXT, VARCHAR);
CREATE OR REPLACE FUNCTION public.create_head_cashier_override(
  p_office_code VARCHAR,
  p_user_id UUID,
  p_user_code VARCHAR,
  p_full_name VARCHAR DEFAULT NULL,
  p_start DATE DEFAULT CURRENT_DATE,
  p_end DATE DEFAULT CURRENT_DATE,
  p_reason TEXT DEFAULT NULL,
  p_assigned_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overlap RECORD;
  v_new_id UUID;
BEGIN
  IF p_end < p_start THEN
    RETURN json_build_object('success', false, 'message', 'End date must be on or after start date');
  END IF;

  -- Check for overlapping active overrides
  SELECT id, user_code, override_start, override_end INTO v_overlap
  FROM cn_head_cashier_override
  WHERE office_code = p_office_code
    AND is_active = true
    AND override_start <= p_end
    AND override_end >= p_start
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'message',
      format('Overlapping override exists for %s (%s to %s)', v_overlap.user_code, v_overlap.override_start, v_overlap.override_end));
  END IF;

  INSERT INTO cn_head_cashier_override (office_code, user_id, user_code, full_name, override_start, override_end, reason, assigned_by)
  VALUES (p_office_code, p_user_id, p_user_code, p_full_name, p_start, p_end, p_reason, p_assigned_by)
  RETURNING id INTO v_new_id;

  -- Audit log
  INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_id, user_name, after_value, payload_json)
  VALUES ('create_override', 'cn_head_cashier_override', v_new_id::TEXT, 'Payment Module', p_user_id, p_assigned_by,
    jsonb_build_object('user_code', p_user_code, 'office_code', p_office_code, 'start', p_start, 'end', p_end),
    jsonb_build_object('reason', p_reason));

  RETURN json_build_object('success', true, 'id', v_new_id);
END;
$$;

-- 6. delete_head_cashier_override RPC
DROP FUNCTION IF EXISTS public.delete_head_cashier_override(UUID, VARCHAR);
CREATE OR REPLACE FUNCTION public.delete_head_cashier_override(
  p_override_id UUID,
  p_deleted_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  SELECT id, office_code, user_code, override_start, override_end INTO v_rec
  FROM cn_head_cashier_override
  WHERE id = p_override_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Override not found or already deleted');
  END IF;

  UPDATE cn_head_cashier_override SET is_active = false WHERE id = p_override_id;

  INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_id, user_name, after_value)
  VALUES ('delete_override', 'cn_head_cashier_override', p_override_id::TEXT, 'Payment Module', NULL, p_deleted_by,
    jsonb_build_object('office_code', v_rec.office_code, 'user_code', v_rec.user_code, 'start', v_rec.override_start, 'end', v_rec.override_end));

  RETURN json_build_object('success', true);
END;
$$;

-- 7. Migrate existing data: pick most recent active assignment per office as default
INSERT INTO cn_head_cashier_default (office_code, user_id, user_code, assigned_by, effective_from, assigned_at)
SELECT DISTINCT ON (a.office_code)
  a.office_code, a.user_id, a.user_code, a.assigned_by, a.assignment_date, now()
FROM cn_head_cashier_assignment a
WHERE a.is_active = true AND a.office_code IS NOT NULL
ORDER BY a.office_code, a.assignment_date DESC
ON CONFLICT DO NOTHING;
