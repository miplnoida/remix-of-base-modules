
-- Phase 4B3 Sub-iter 2 · Step A/provenance: neutralize manual seed + run canonical certifier for APPEALS active template version.
-- Preserves historical evidence (no DELETE). Marks the manually inserted PASS row as non-authoritative and stale
-- so downstream lookups (Sub-iter 2 Step B) cannot treat it as authoritative readiness evidence.
-- Then invokes the canonical certifier once; canonical output becomes the authoritative row.

DO $$
DECLARE
  v_manual_seed_id CONSTANT uuid := '6a5dcbae-0e72-4170-a2f2-fa24c6ff04e0';
  v_template_version_id CONSTANT uuid := '8d1fd9cb-2248-4ff4-86a4-bc42a4995f87';
  v_canonical_result jsonb;
BEGIN
  -- 1. Preserve + neutralize the manual seed (audit-safe; no DELETE).
  UPDATE public.comm_hub_certification
     SET is_stale = TRUE,
         stale_reason = 'NON_AUTHORITATIVE_MANUAL_SEED',
         stale_detected_at = now()
   WHERE id = v_manual_seed_id
     AND is_stale = FALSE;

  -- 2. Invoke canonical certifier. This is the only approved path to produce authoritative
  --    template-version certification evidence.
  BEGIN
    SELECT public.certify_comm_hub_template_version(v_template_version_id)
      INTO v_canonical_result;
    RAISE NOTICE 'CANONICAL_CERTIFIER_OUTPUT: %', v_canonical_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'CANONICAL_CERTIFIER_ERROR: % / %', SQLSTATE, SQLERRM;
  END;
END $$;
