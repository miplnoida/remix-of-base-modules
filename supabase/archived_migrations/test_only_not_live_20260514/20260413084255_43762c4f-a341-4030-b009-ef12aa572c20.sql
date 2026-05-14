-- Step 1: Update the RPC to add explicit date cast for safety
CREATE OR REPLACE FUNCTION public.get_next_c3_schedule_no(
  p_payer_id VARCHAR,
  p_payer_type VARCHAR,
  p_period DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_max_seq INT;
BEGIN
    SELECT COALESCE(MAX(sequence_no), 0) + 1
    INTO v_max_seq
    FROM cn_c3_reported
    WHERE payer_id = p_payer_id
      AND payer_type = p_payer_type
      AND period::date = p_period::date;
    
    RETURN v_max_seq;
END;
$function$;

-- Step 2: Temporarily disable the specific edit restriction trigger
ALTER TABLE cn_c3_reported DISABLE TRIGGER trg_enforce_c3_edit_restriction;

-- Step 3: Backfill verified_by and date_verified for existing VAC records
UPDATE cn_c3_reported
SET 
  verified_by = COALESCE(
    (SELECT wl.user_id::text FROM workflow_logs wl 
     JOIN workflow_instances wi ON wi.id = wl.instance_id
     WHERE wi.source_record_id = cn_c3_reported.id::text
       AND wl.action = 'approve'
     ORDER BY wl.created_at DESC
     LIMIT 1),
    cn_c3_reported.modified_by
  ),
  date_verified = COALESCE(
    (SELECT wl.created_at::timestamptz FROM workflow_logs wl 
     JOIN workflow_instances wi ON wi.id = wl.instance_id
     WHERE wi.source_record_id = cn_c3_reported.id::text
       AND wl.action = 'approve'
     ORDER BY wl.created_at DESC
     LIMIT 1),
    cn_c3_reported.modified_date
  )
WHERE posting_status = 'VAC'
  AND verified_by IS NULL;

-- Step 4: Re-enable the trigger
ALTER TABLE cn_c3_reported ENABLE TRIGGER trg_enforce_c3_edit_restriction;

-- Step 5: Backfill ip_wages verification fields for affected records
UPDATE ip_wages w
SET 
  verified_by = c.verified_by,
  date_verified = c.date_verified
FROM cn_c3_reported c
WHERE w.c3_id = c.id
  AND c.posting_status = 'VAC'
  AND w.verified_by IS NULL
  AND c.verified_by IS NOT NULL;