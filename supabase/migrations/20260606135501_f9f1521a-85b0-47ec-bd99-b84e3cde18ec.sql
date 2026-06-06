
CREATE OR REPLACE FUNCTION public.bn_materialize_external_tasks_for_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_id UUID;
  v_product_code TEXT;
BEGIN
  -- Resolve product version: use claim's version, else the active version of the product
  v_version_id := NEW.product_version_id;
  IF v_version_id IS NULL THEN
    SELECT id INTO v_version_id
    FROM public.bn_product_version
    WHERE product_id = NEW.product_id
      AND COALESCE(status, '') IN ('ACTIVE','PUBLISHED','APPROVED')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_version_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT benefit_code INTO v_product_code FROM public.bn_product WHERE id = NEW.product_id;

  -- Skip if already materialized for this claim
  IF EXISTS (SELECT 1 FROM public.bn_external_task WHERE claim_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.bn_external_task (
    claim_id, participant_kind, task_type, task_title, task_description,
    screen_template_id, product_code, due_at, status, blocks_workflow, created_by
  )
  SELECT
    NEW.id,
    cfg.participant_kind,
    cfg.task_code,
    cfg.task_title,
    cfg.task_description,
    st.id,
    v_product_code,
    now() + (cfg.due_offset_days || ' days')::interval,
    'PENDING',
    cfg.blocks_workflow,
    NEW.entered_by
  FROM public.bn_product_participant_task_config cfg
  LEFT JOIN public.bn_screen_template st ON st.template_code = cfg.screen_template_code
  WHERE cfg.product_version_id = v_version_id
    AND cfg.is_active = TRUE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bn_claim_materialize_external_tasks ON public.bn_claim;
CREATE TRIGGER trg_bn_claim_materialize_external_tasks
AFTER INSERT ON public.bn_claim
FOR EACH ROW
EXECUTE FUNCTION public.bn_materialize_external_tasks_for_claim();
