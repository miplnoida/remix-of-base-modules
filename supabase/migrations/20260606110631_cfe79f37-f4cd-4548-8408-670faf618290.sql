
ALTER TABLE public.bn_product_version
  ADD COLUMN IF NOT EXISTS builder_canvas jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS builder_canvas_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS builder_canvas_updated_by varchar(50);

COMMENT ON COLUMN public.bn_product_version.builder_canvas IS
  'Visual Builder canvas JSON (sections of blocks). Source of truth for the drag-and-drop builder; normalized tables are derived via sync.';

-- Clone a product version to a new DRAFT, copying configs + builder canvas.
CREATE OR REPLACE FUNCTION public.bn_clone_product_version_to_draft(
  p_source_id uuid,
  p_user_code varchar
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid := gen_random_uuid();
  v_next_version integer;
  v_product_id uuid;
BEGIN
  SELECT product_id, COALESCE(MAX(version_number), 0) + 1
    INTO v_product_id, v_next_version
  FROM public.bn_product_version
  WHERE product_id = (SELECT product_id FROM public.bn_product_version WHERE id = p_source_id)
  GROUP BY product_id;

  INSERT INTO public.bn_product_version (
    id, product_id, version_number, effective_from, effective_to, description,
    eligibility_config, calculation_config, timeline_config,
    workflow_template_id, document_profile_id, screen_template_id,
    workflow_scheme, requires_employer_verification, requires_medical_board_review,
    requires_means_test, max_concurrent_claims, status,
    entered_by, modified_by, entered_at, modified_at,
    benefit_duration_type, award_creation_rule, payment_frequency,
    review_policy, life_certificate_policy, medical_review_policy, survivor_beneficiary_policy,
    builder_canvas, builder_canvas_updated_by, builder_canvas_updated_at
  )
  SELECT
    v_new_id, product_id, v_next_version, effective_from, effective_to,
    COALESCE(description, '') || ' (Cloned from v' || version_number || ')',
    eligibility_config, calculation_config, timeline_config,
    workflow_template_id, document_profile_id, screen_template_id,
    workflow_scheme, requires_employer_verification, requires_medical_board_review,
    requires_means_test, max_concurrent_claims, 'DRAFT',
    p_user_code, p_user_code, now(), now(),
    benefit_duration_type, award_creation_rule, payment_frequency,
    review_policy, life_certificate_policy, medical_review_policy, survivor_beneficiary_policy,
    builder_canvas, p_user_code, now()
  FROM public.bn_product_version
  WHERE id = p_source_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bn_clone_product_version_to_draft(uuid, varchar) TO authenticated, service_role;
