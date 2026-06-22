
-- =========================================================
-- PR1: Intake -> Routing -> Assignment backend
-- =========================================================

-- 1. lg_staff -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_code varchar(50),
  full_name text NOT NULL,
  email text,
  role_code varchar(64),
  team_id uuid REFERENCES public.lg_team(id) ON DELETE SET NULL,
  office_code varchar(40),
  is_active boolean NOT NULL DEFAULT true,
  availability varchar(20) NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available','leave','inactive')),
  max_active_cases integer NOT NULL DEFAULT 25,
  max_high_priority_cases integer NOT NULL DEFAULT 8,
  skills text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes text,
  country_code varchar(8) NOT NULL DEFAULT 'SKN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(50),
  updated_by varchar(50),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_lg_staff_team  ON public.lg_staff(team_id);
CREATE INDEX IF NOT EXISTS idx_lg_staff_user  ON public.lg_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_lg_staff_avail ON public.lg_staff(availability) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_staff TO authenticated;
GRANT ALL ON public.lg_staff TO service_role;

DROP TRIGGER IF EXISTS trg_lg_staff_updated ON public.lg_staff;
CREATE TRIGGER trg_lg_staff_updated BEFORE UPDATE ON public.lg_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Assignment history ---------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_case_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id uuid NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  assigned_from_user_id uuid,
  assigned_to_user_id uuid,
  assigned_team_code varchar(80),
  workbasket_code varchar(80),
  strategy varchar(40),
  reason varchar(40) NOT NULL,           -- intake|reassign|escalation|workload|override|queue
  notes text,
  assigned_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lg_assign_hist_case ON public.lg_case_assignment_history(lg_case_id);
CREATE INDEX IF NOT EXISTS idx_lg_assign_hist_to   ON public.lg_case_assignment_history(assigned_to_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_assignment_history TO authenticated;
GRANT ALL ON public.lg_case_assignment_history TO service_role;

-- 3. Extend routing source map --------------------------------
ALTER TABLE public.lg_routing_source_map
  ADD COLUMN IF NOT EXISTS escalation_team_code text,
  ADD COLUMN IF NOT EXISTS backup_team_code     text,
  ADD COLUMN IF NOT EXISTS required_skill       text;

-- 4. Workload view --------------------------------------------
CREATE OR REPLACE VIEW public.lg_staff_workload AS
SELECT
  s.id                                                          AS staff_id,
  s.user_id,
  s.user_code,
  s.full_name,
  s.team_id,
  s.max_active_cases,
  s.max_high_priority_cases,
  s.availability,
  COALESCE(open.cnt, 0)                                         AS active_cases,
  COALESCE(hi.cnt,   0)                                         AS high_priority_cases,
  CASE WHEN s.max_active_cases > 0
       THEN ROUND( (COALESCE(open.cnt,0)::numeric / s.max_active_cases) * 100, 1)
       ELSE 0 END                                               AS capacity_pct
FROM public.lg_staff s
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM public.lg_case_assignment a
  JOIN public.lg_case c ON c.id = a.lg_case_id
  WHERE a.assigned_to_user_id = s.user_id
    AND a.is_current = true
    AND c.status_code NOT IN ('CLOSED','WITHDRAWN','DISMISSED')
) open ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM public.lg_case_assignment a
  JOIN public.lg_case c ON c.id = a.lg_case_id
  WHERE a.assigned_to_user_id = s.user_id
    AND a.is_current = true
    AND c.priority_code IN ('HIGH','URGENT','CRITICAL')
    AND c.status_code NOT IN ('CLOSED','WITHDRAWN','DISMISSED')
) hi ON TRUE;

GRANT SELECT ON public.lg_staff_workload TO authenticated, service_role;

-- 5. RPC: resolve route ---------------------------------------
CREATE OR REPLACE FUNCTION public.lg_resolve_route(
  p_source        text,
  p_case_type     text,
  p_stage         text,
  p_priority      text DEFAULT 'MEDIUM',
  p_office        text DEFAULT NULL,
  p_jurisdiction  text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_src   public.lg_case_source_config%ROWTYPE;
  v_map   public.lg_routing_source_map%ROWTYPE;
  v_type_ok   boolean := true;
  v_stage_ok  boolean := true;
  v_reasons   text[]  := ARRAY[]::text[];
  v_status    text    := 'OK';
BEGIN
  SELECT * INTO v_src FROM public.lg_case_source_config
   WHERE source_code = p_source AND is_active = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'validation_status','ERROR',
      'reasons', jsonb_build_array('Unknown or inactive source: ' || COALESCE(p_source,'(null)'))
    );
  END IF;

  -- Case type allowed for source
  IF COALESCE(v_src.enforce_case_type_restrictions, true) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.lg_case_source_case_type
       WHERE source_code = p_source
         AND case_type_code = p_case_type
         AND is_active = true
    ) INTO v_type_ok;
    IF NOT v_type_ok THEN
      v_reasons := v_reasons || ('Case type ' || p_case_type || ' not allowed for source ' || p_source);
      v_status  := 'ERROR';
    END IF;
  END IF;

  -- Stage allowed for source
  IF COALESCE(v_src.enforce_stage_restrictions, true) AND p_stage IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.lg_case_source_stage
       WHERE source_code = p_source
         AND stage_code = p_stage
         AND is_active = true
    ) INTO v_stage_ok;
    IF NOT v_stage_ok THEN
      v_reasons := v_reasons || ('Stage ' || p_stage || ' not allowed for source ' || p_source);
      IF v_status <> 'ERROR' THEN v_status := 'WARNING'; END IF;
    END IF;
  END IF;

  -- Find best routing rule (most specific case_type match wins, else source-only)
  SELECT * INTO v_map
    FROM public.lg_routing_source_map
   WHERE source_code = p_source
     AND is_active = true
     AND (case_type_code = p_case_type OR case_type_code IS NULL)
   ORDER BY (case_type_code = p_case_type) DESC NULLS LAST,
            (priority_code = p_priority) DESC NULLS LAST
   LIMIT 1;

  IF NOT FOUND THEN
    v_reasons := v_reasons || ('No routing rule matched source ' || p_source);
    RETURN jsonb_build_object(
      'validation_status', CASE WHEN v_status = 'ERROR' THEN 'ERROR' ELSE 'WARNING' END,
      'reasons', to_jsonb(v_reasons)
    );
  END IF;

  RETURN jsonb_build_object(
    'route_id',             v_map.id,
    'team_code',            v_map.team_code,
    'workbasket_code',      v_map.workbasket_code,
    'assignment_strategy',  COALESCE(v_map.assignment_strategy, 'LEAST_ACTIVE'),
    'escalation_team_code', v_map.escalation_team_code,
    'backup_team_code',     v_map.backup_team_code,
    'required_skill',       v_map.required_skill,
    'validation_status',    v_status,
    'reasons',              to_jsonb(v_reasons)
  );
END
$fn$;

GRANT EXECUTE ON FUNCTION public.lg_resolve_route(text,text,text,text,text,text)
  TO authenticated, service_role;

-- 6. RPC: pick assignee ---------------------------------------
CREATE OR REPLACE FUNCTION public.lg_pick_assignee(
  p_team_code      text,
  p_strategy       text DEFAULT 'LEAST_ACTIVE',
  p_priority       text DEFAULT 'MEDIUM',
  p_required_skill text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_team_id uuid;
  v_user    uuid;
  v_code    varchar(50);
  v_reason  text;
  v_hi      boolean := p_priority IN ('HIGH','URGENT','CRITICAL');
BEGIN
  SELECT id INTO v_team_id FROM public.lg_team WHERE team_code = p_team_code AND is_active = true;
  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('assigned_to_user_id', NULL, 'reason', 'team_not_found');
  END IF;

  WITH eligible AS (
    SELECT w.*
      FROM public.lg_staff_workload w
      JOIN public.lg_staff s ON s.id = w.staff_id
     WHERE s.team_id = v_team_id
       AND s.is_active = true
       AND s.availability = 'available'
       AND w.active_cases       < w.max_active_cases
       AND (NOT v_hi OR w.high_priority_cases < w.max_high_priority_cases)
       AND (p_required_skill IS NULL OR p_required_skill = ANY(s.skills))
  )
  SELECT user_id, user_code
    INTO v_user, v_code
    FROM eligible
   ORDER BY
     CASE p_strategy
       WHEN 'LEAST_ACTIVE'    THEN active_cases
       WHEN 'PRIORITY_BASED'  THEN active_cases
       WHEN 'ROUND_ROBIN'     THEN extract(epoch from now())::int % GREATEST(1, (SELECT COUNT(*) FROM eligible))
       ELSE active_cases
     END ASC,
     capacity_pct ASC,
     random()
   LIMIT 1;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'assigned_to_user_id', NULL,
      'assigned_user_code',  NULL,
      'team_id',             v_team_id,
      'reason',              'no_eligible_staff'
    );
  END IF;

  RETURN jsonb_build_object(
    'assigned_to_user_id', v_user,
    'assigned_user_code',  v_code,
    'team_id',             v_team_id,
    'reason',              'matched_' || lower(p_strategy)
  );
END
$fn$;

GRANT EXECUTE ON FUNCTION public.lg_pick_assignee(text,text,text,text)
  TO authenticated, service_role;

-- 7. RPC: assign case (atomic) --------------------------------
CREATE OR REPLACE FUNCTION public.lg_assign_case(
  p_case_id          uuid,
  p_actor_user_code  text,
  p_reason           text DEFAULT 'intake',
  p_override_user_id uuid DEFAULT NULL,
  p_override_team    text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_case   public.lg_case%ROWTYPE;
  v_route  jsonb;
  v_pick   jsonb;
  v_team   text;
  v_wb     text;
  v_strat  text;
  v_skill  text;
  v_user   uuid;
  v_code   text;
  v_prev   uuid;
  v_esc    text;
  v_pickReason text;
BEGIN
  SELECT * INTO v_case FROM public.lg_case WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lg_case % not found', p_case_id;
  END IF;

  IF p_override_user_id IS NOT NULL OR p_override_team IS NOT NULL THEN
    v_team := COALESCE(p_override_team, v_case.assigned_team_code);
    v_user := p_override_user_id;
    v_pickReason := 'manual_override';
  ELSE
    v_route := public.lg_resolve_route(
      v_case.case_source_code,
      v_case.case_type_code,
      v_case.current_stage_code,
      v_case.priority_code,
      NULL, NULL
    );

    IF v_route->>'validation_status' = 'ERROR' THEN
      RETURN jsonb_build_object('ok', false, 'route', v_route);
    END IF;

    v_team  := v_route->>'team_code';
    v_wb    := v_route->>'workbasket_code';
    v_strat := COALESCE(v_route->>'assignment_strategy','LEAST_ACTIVE');
    v_skill := v_route->>'required_skill';
    v_esc   := v_route->>'escalation_team_code';

    v_pick := public.lg_pick_assignee(v_team, v_strat, v_case.priority_code, v_skill);
    v_user := NULLIF(v_pick->>'assigned_to_user_id','')::uuid;
    v_code := v_pick->>'assigned_user_code';
    v_pickReason := v_pick->>'reason';

    -- fallback to escalation team
    IF v_user IS NULL AND v_esc IS NOT NULL THEN
      v_team := v_esc;
      v_pick := public.lg_pick_assignee(v_team, v_strat, v_case.priority_code, v_skill);
      v_user := NULLIF(v_pick->>'assigned_to_user_id','')::uuid;
      v_code := v_pick->>'assigned_user_code';
      v_pickReason := COALESCE(v_pick->>'reason','escalated');
    END IF;
  END IF;

  -- Close prior current assignment
  UPDATE public.lg_case_assignment
     SET is_current = false, unassigned_at = now()
   WHERE lg_case_id = p_case_id AND is_current = true
  RETURNING assigned_to_user_id INTO v_prev;

  INSERT INTO public.lg_case_assignment
    (lg_case_id, assigned_to_user_id, assigned_team_code, assigned_by, reason, is_current)
  VALUES
    (p_case_id, v_user, v_team, p_actor_user_code,
     COALESCE(v_pickReason, p_reason), true);

  INSERT INTO public.lg_case_assignment_history
    (lg_case_id, assigned_from_user_id, assigned_to_user_id, assigned_team_code,
     workbasket_code, strategy, reason, assigned_by, notes)
  VALUES
    (p_case_id, v_prev, v_user, v_team, v_wb, v_strat,
     p_reason, p_actor_user_code,
     CASE WHEN v_user IS NULL THEN 'Queued: ' || COALESCE(v_pickReason,'no_eligible_staff') END);

  -- Update case header
  UPDATE public.lg_case
     SET assigned_team_code = v_team,
         assigned_legal_officer_id = v_user,
         updated_by = p_actor_user_code,
         updated_at = now()
   WHERE id = p_case_id;

  RETURN jsonb_build_object(
    'ok', true,
    'team_code',          v_team,
    'workbasket_code',    v_wb,
    'strategy',           v_strat,
    'assigned_to_user_id', v_user,
    'assigned_user_code',  v_code,
    'reason',              v_pickReason,
    'queued',              (v_user IS NULL)
  );
END
$fn$;

GRANT EXECUTE ON FUNCTION public.lg_assign_case(uuid,text,text,uuid,text)
  TO authenticated, service_role;
