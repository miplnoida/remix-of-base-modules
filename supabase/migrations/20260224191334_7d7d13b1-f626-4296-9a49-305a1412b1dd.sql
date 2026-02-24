
-- RPC: check_dms_transfer_eligibility
-- Returns whether a DMS transfer button should be shown for a given SSN
CREATE OR REPLACE FUNCTION public.check_dms_transfer_eligibility(p_ssn text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_pending_count integer;
  v_result jsonb;
  v_blocked_statuses text[] := ARRAY['Z', 'D', 'P', 'R']; -- Draft, Draft, Pending, Rejected
BEGIN
  -- Get the application status from ip_master
  SELECT status INTO v_status
  FROM ip_master
  WHERE ssn = p_ssn
  LIMIT 1;

  -- If no record found, not eligible
  IF v_status IS NULL THEN
    RETURN jsonb_build_object(
      'can_transfer_to_dms', false,
      'reason', 'no_record',
      'message', 'No IP master record found for this SSN',
      'application_status', NULL,
      'pending_document_count', 0
    );
  END IF;

  -- Check if status is in blocked list
  IF v_status = ANY(v_blocked_statuses) THEN
    RETURN jsonb_build_object(
      'can_transfer_to_dms', false,
      'reason', 'status_blocked',
      'message', 'Application status does not allow DMS transfer',
      'application_status', v_status,
      'pending_document_count', 0
    );
  END IF;

  -- Count documents pending transfer
  SELECT count(*) INTO v_pending_count
  FROM ip_application_documents
  WHERE ssn = p_ssn
    AND (transfer_status IS NULL OR transfer_status IN ('Pending', 'Failed'));

  -- Must have at least one pending document
  IF v_pending_count = 0 THEN
    RETURN jsonb_build_object(
      'can_transfer_to_dms', false,
      'reason', 'no_pending_documents',
      'message', 'No documents pending DMS transfer',
      'application_status', v_status,
      'pending_document_count', 0
    );
  END IF;

  -- All conditions met
  RETURN jsonb_build_object(
    'can_transfer_to_dms', true,
    'reason', 'eligible',
    'message', 'DMS transfer is available',
    'application_status', v_status,
    'pending_document_count', v_pending_count
  );
END;
$$;
