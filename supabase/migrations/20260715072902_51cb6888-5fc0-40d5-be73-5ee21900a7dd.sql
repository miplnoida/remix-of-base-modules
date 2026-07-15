-- Batch 3 remediation: consolidate UAT (U010%) violations into cases, then trigger inspections
DO $$
DECLARE
  r RECORD;
  n_ok INT := 0;
  n_fail INT := 0;
BEGIN
  FOR r IN
    SELECT id FROM ce_violations
    WHERE employer_id LIKE 'U010%'
      AND (case_id IS NULL)
      AND (is_deleted IS NULL OR is_deleted = false)
    ORDER BY created_at
  LOOP
    BEGIN
      PERFORM fn_ce_consolidate_violation_to_case(r.id, 'UAT_BATCH3');
      n_ok := n_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      n_fail := n_fail + 1;
      RAISE NOTICE 'Violation % failed: %', r.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Batch 3 consolidation: ok=%, fail=%', n_ok, n_fail;
END $$;