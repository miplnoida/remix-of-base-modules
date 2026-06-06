
CREATE OR REPLACE FUNCTION public.bn_materialize_external_tasks(p_claim_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim public.bn_claim%ROWTYPE;
  v_version_id UUID;
  v_product_code TEXT;
  v_inserted INTEGER := 0;
BEGIN
  SELECT * INTO v_claim FROM public.bn_claim WHERE id = p_claim_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_version_id := v_claim.product_version_id;
  IF v_version_id IS NULL THEN
    SELECT id INTO v_version_id
    FROM public.bn_product_version
    WHERE product_id = v_claim.product_id
      AND COALESCE(status,'') IN ('ACTIVE','PUBLISHED','APPROVED')
    ORDER BY version_number DESC LIMIT 1;
  END IF;
  IF v_version_id IS NULL THEN RETURN 0; END IF;

  SELECT benefit_code INTO v_product_code FROM public.bn_product WHERE id = v_claim.product_id;

  WITH ins AS (
    INSERT INTO public.bn_external_task (
      claim_id, participant_kind, task_type, task_title, task_description,
      screen_template_id, product_code, due_at, status, blocks_workflow, created_by
    )
    SELECT
      v_claim.id, cfg.participant_kind, cfg.task_code, cfg.task_title, cfg.task_description,
      st.id, v_product_code,
      now() + (cfg.due_offset_days || ' days')::interval,
      'PENDING', cfg.blocks_workflow, v_claim.entered_by
    FROM public.bn_product_participant_task_config cfg
    LEFT JOIN public.bn_screen_template st ON st.template_code = cfg.screen_template_code
    WHERE cfg.product_version_id = v_version_id
      AND cfg.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM public.bn_external_task t
        WHERE t.claim_id = v_claim.id AND t.task_type = cfg.task_code
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bn_materialize_external_tasks(UUID) TO authenticated, service_role;

-- Fix the trigger function similarly
CREATE OR REPLACE FUNCTION public.bn_materialize_external_tasks_for_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.bn_materialize_external_tasks(NEW.id);
  RETURN NEW;
END;
$$;

-- Backfill
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.id FROM public.bn_claim c
    WHERE NOT EXISTS (SELECT 1 FROM public.bn_external_task t WHERE t.claim_id = c.id)
  LOOP
    PERFORM public.bn_materialize_external_tasks(r.id);
  END LOOP;
END $$;
