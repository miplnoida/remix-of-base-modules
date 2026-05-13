
-- =============================================
-- STEP 1: Add zone/queue columns to ce_violations
-- =============================================
ALTER TABLE public.ce_violations
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.ce_zones(id),
  ADD COLUMN IF NOT EXISTS assigned_queue_id UUID REFERENCES public.ce_assignment_queues(id),
  ADD COLUMN IF NOT EXISTS assignment_method VARCHAR;

CREATE INDEX IF NOT EXISTS idx_ce_violations_zone ON public.ce_violations(zone_id);
CREATE INDEX IF NOT EXISTS idx_ce_violations_queue ON public.ce_violations(assigned_queue_id);

-- =============================================
-- STEP 2: Enroll officers into queues
-- =============================================
-- Z1: James Martinez (LEAD), Sarah Thompson (MEMBER)
INSERT INTO public.ce_queue_members (queue_id, inspector_id, role, created_by) VALUES
  ('971e3b60-de1e-49ea-8dc5-7f9c1975667b', 'b1b2c3d4-0001-4000-8000-000000000001', 'LEAD', 'SEED-ENROLLMENT'),
  ('971e3b60-de1e-49ea-8dc5-7f9c1975667b', 'b1b2c3d4-0002-4000-8000-000000000002', 'MEMBER', 'SEED-ENROLLMENT'),
  ('46bbf236-afb2-42ca-bc61-62effb735994', 'b1b2c3d4-0001-4000-8000-000000000001', 'MEMBER', 'SEED-ENROLLMENT'),
  ('46bbf236-afb2-42ca-bc61-62effb735994', 'b1b2c3d4-0002-4000-8000-000000000002', 'MEMBER', 'SEED-ENROLLMENT'),
  -- Z2: Michael Brown (LEAD)
  ('cb1569f5-df7e-4e10-b5ae-003883e62422', 'b1b2c3d4-0003-4000-8000-000000000003', 'LEAD', 'SEED-ENROLLMENT'),
  ('bfb98e90-c9a8-421c-9129-ce97245de728', 'b1b2c3d4-0003-4000-8000-000000000003', 'MEMBER', 'SEED-ENROLLMENT'),
  -- Z3: Jennifer Davis (LEAD), Robert Wilson (MEMBER + LEG)
  ('96f2cbd2-2cc3-44e3-9588-1133ee2d7ed7', 'b1b2c3d4-0004-4000-8000-000000000004', 'LEAD', 'SEED-ENROLLMENT'),
  ('96f2cbd2-2cc3-44e3-9588-1133ee2d7ed7', 'b1b2c3d4-0005-4000-8000-000000000005', 'MEMBER', 'SEED-ENROLLMENT'),
  ('d20c0acd-053f-43fe-8950-8c9dc0c442dd', 'b1b2c3d4-0004-4000-8000-000000000004', 'MEMBER', 'SEED-ENROLLMENT'),
  ('d20c0acd-053f-43fe-8950-8c9dc0c442dd', 'b1b2c3d4-0005-4000-8000-000000000005', 'MEMBER', 'SEED-ENROLLMENT'),
  ('8fcfa840-a25a-4bf6-b853-5ff8bbd0c0fc', 'b1b2c3d4-0005-4000-8000-000000000005', 'MEMBER', 'SEED-ENROLLMENT');

-- =============================================
-- STEP 3: fn_ce_route_violation
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_ce_route_violation(p_violation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_zone_id UUID;
  v_zone_code VARCHAR;
  v_resolution_method VARCHAR;
  v_queue_type VARCHAR;
  v_queue_id UUID;
  v_queue_code VARCHAR;
  v_inspector_id UUID;
  v_inspector_name VARCHAR;
  v_village_code VARCHAR;
  v_office_code VARCHAR;
BEGIN
  -- Get violation + employer context
  SELECT v.id, v.status, v.employer_id, v.territory,
         e.village_code, e.office_code
  INTO v_rec
  FROM ce_violations v
  LEFT JOIN er_master e ON e.regno = v.employer_id
  WHERE v.id = p_violation_id AND v.is_deleted = false;

  IF v_rec IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Violation not found');
  END IF;

  v_village_code := v_rec.village_code;
  v_office_code := v_rec.office_code;

  -- Resolve zone
  SELECT rz.zone_id, rz.zone_code, rz.resolution_method
  INTO v_zone_id, v_zone_code, v_resolution_method
  FROM fn_ce_resolve_zone(v_village_code, v_office_code) rz
  LIMIT 1;

  IF v_zone_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No zone resolved');
  END IF;

  -- Determine queue type from status
  v_queue_type := CASE
    WHEN v_rec.status = 'OPEN' THEN 'OPS'
    WHEN v_rec.status = 'UNDER_REVIEW' THEN 'REV'
    WHEN v_rec.status IN ('ESCALATED', 'LEGAL') THEN 'LEG'
    ELSE 'FLB'
  END;

  -- Resolve queue
  SELECT q.id, q.queue_code INTO v_queue_id, v_queue_code
  FROM ce_assignment_queues q
  WHERE q.zone_id = v_zone_id AND q.queue_type = v_queue_type AND q.is_active = true
  LIMIT 1;

  -- Fallback to FLB if specific queue not found
  IF v_queue_id IS NULL THEN
    SELECT q.id, q.queue_code INTO v_queue_id, v_queue_code
    FROM ce_assignment_queues q
    WHERE q.zone_id = v_zone_id AND q.queue_type = 'FLB' AND q.is_active = true
    LIMIT 1;
    v_queue_type := 'FLB';
  END IF;

  -- Try direct officer: only if exactly 1 active LEAD in this queue
  IF v_queue_id IS NOT NULL THEN
    SELECT qm.inspector_id INTO v_inspector_id
    FROM ce_queue_members qm
    WHERE qm.queue_id = v_queue_id AND qm.role = 'LEAD' AND qm.is_active = true;
    
    -- Only assign if exactly one lead (GET DIAGNOSTICS not needed, use count check)
    IF (SELECT COUNT(*) FROM ce_queue_members WHERE queue_id = v_queue_id AND role = 'LEAD' AND is_active = true) = 1 THEN
      SELECT ci.name INTO v_inspector_name FROM ce_inspectors ci WHERE ci.id = v_inspector_id;
    ELSE
      v_inspector_id := NULL;
      v_inspector_name := NULL;
    END IF;
  END IF;

  -- Mark previous assignments as superseded
  UPDATE ce_violation_assignments
  SET is_current = false, superseded_at = now()
  WHERE violation_id = p_violation_id AND is_current = true;

  -- Write assignment record
  INSERT INTO ce_violation_assignments (
    violation_id, assigned_to_inspector_id, assigned_to_queue_id,
    assignment_type, assigned_by, zone_resolved_from, resolution_method, notes
  ) VALUES (
    p_violation_id, v_inspector_id, v_queue_id,
    'AUTO', 'SYSTEM-ROUTER', v_zone_code, v_resolution_method,
    'Auto-routed: ' || COALESCE(v_resolution_method, 'UNKNOWN') || ' → ' || COALESCE(v_queue_code, 'NONE')
  );

  -- Update violation record
  UPDATE ce_violations SET
    zone_id = v_zone_id,
    assigned_queue_id = v_queue_id,
    assigned_to_user_id = CASE WHEN v_inspector_id IS NOT NULL THEN v_inspector_id::TEXT ELSE NULL END,
    assigned_to_name = v_inspector_name,
    assigned_at = now(),
    assignment_method = v_resolution_method,
    updated_at = now(),
    updated_by = 'SYSTEM-ROUTER'
  WHERE id = p_violation_id;

  RETURN jsonb_build_object(
    'ok', true,
    'violation_id', p_violation_id,
    'zone_code', v_zone_code,
    'queue_code', v_queue_code,
    'queue_type', v_queue_type,
    'resolution_method', v_resolution_method,
    'inspector_id', v_inspector_id,
    'inspector_name', v_inspector_name
  );
END;
$$;

-- =============================================
-- STEP 4: Backfill function
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_ce_backfill_unassigned_violations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_result JSONB;
  v_total INT := 0;
  v_assigned_queue INT := 0;
  v_assigned_officer INT := 0;
  v_failed INT := 0;
BEGIN
  FOR v_row IN
    SELECT id FROM ce_violations
    WHERE is_deleted = false
      AND assigned_queue_id IS NULL
      AND status IN ('OPEN', 'UNDER_REVIEW', 'ESCALATED')
    ORDER BY created_at
  LOOP
    v_total := v_total + 1;
    v_result := fn_ce_route_violation(v_row.id);
    
    IF (v_result->>'ok')::boolean THEN
      IF v_result->>'inspector_id' IS NOT NULL THEN
        v_assigned_officer := v_assigned_officer + 1;
      ELSE
        v_assigned_queue := v_assigned_queue + 1;
      END IF;
    ELSE
      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total_processed', v_total,
    'assigned_to_officer', v_assigned_officer,
    'assigned_to_queue_only', v_assigned_queue,
    'failed', v_failed
  );
END;
$$;
