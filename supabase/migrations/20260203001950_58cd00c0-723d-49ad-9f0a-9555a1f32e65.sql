-- Create RPC function for controlled IP status changes with server-side validation
CREATE OR REPLACE FUNCTION public.change_ip_status(
  p_unique_uuid UUID,
  p_new_status VARCHAR(1),
  p_current_status VARCHAR(1),
  p_user_id UUID DEFAULT NULL,
  p_user_code VARCHAR(50) DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_allowed_transitions VARCHAR[];
  v_is_valid_transition BOOLEAN := false;
BEGIN
  -- Lock the record to prevent concurrent modifications
  SELECT * INTO v_record
  FROM public.ip_master
  WHERE unique_uuid = p_unique_uuid
  FOR UPDATE;
  
  IF v_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RECORD_NOT_FOUND',
      'message', 'Insured person record not found'
    );
  END IF;
  
  -- Check if current status matches what client thinks it is (race condition prevention)
  IF v_record.status IS DISTINCT FROM p_current_status THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'STATUS_CHANGED',
      'message', 'The record status has been changed by another user. Please refresh and try again.',
      'current_status', v_record.status
    );
  END IF;
  
  -- Define allowed transitions based on current status
  CASE v_record.status
    WHEN 'V' THEN
      -- Verified can only go to Active
      v_allowed_transitions := ARRAY['A'];
    WHEN 'A' THEN
      -- Active can go to Suspended, Deleted, or Terminated
      v_allowed_transitions := ARRAY['S', 'D', 'T'];
    WHEN 'S' THEN
      -- Suspended can go to Active, Terminated, or Deleted
      v_allowed_transitions := ARRAY['A', 'T', 'D'];
    ELSE
      -- P, Z, T, D - no changes allowed
      v_allowed_transitions := ARRAY[]::VARCHAR[];
  END CASE;
  
  -- Check if the requested transition is allowed
  IF p_new_status = ANY(v_allowed_transitions) THEN
    v_is_valid_transition := true;
  END IF;
  
  IF NOT v_is_valid_transition THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_TRANSITION',
      'message', format('Status change from %s to %s is not allowed', v_record.status, p_new_status),
      'current_status', v_record.status,
      'allowed_transitions', v_allowed_transitions
    );
  END IF;
  
  -- Perform the status update
  IF p_new_status = 'T' THEN
    -- Terminated status requires additional fields
    UPDATE public.ip_master
    SET 
      status = p_new_status,
      termination_date = CURRENT_DATE,
      termination_code = '1',
      updated_at = NOW(),
      updated_by = p_user_id
    WHERE unique_uuid = p_unique_uuid;
  ELSE
    -- Other status changes
    UPDATE public.ip_master
    SET 
      status = p_new_status,
      updated_at = NOW(),
      updated_by = p_user_id
    WHERE unique_uuid = p_unique_uuid;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Status changed from %s to %s successfully', v_record.status, p_new_status),
    'old_status', v_record.status,
    'new_status', p_new_status,
    'ssn', v_record.ssn,
    'unique_uuid', p_unique_uuid,
    'termination_date', CASE WHEN p_new_status = 'T' THEN CURRENT_DATE ELSE NULL END,
    'termination_code', CASE WHEN p_new_status = 'T' THEN '1' ELSE NULL END
  );
END;
$$;

-- Create helper function to get allowed status transitions
CREATE OR REPLACE FUNCTION public.get_ip_status_transitions(p_current_status VARCHAR(1))
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_allowed_transitions jsonb;
BEGIN
  CASE p_current_status
    WHEN 'V' THEN
      v_allowed_transitions := '[{"code": "A", "description": "Active"}]'::jsonb;
    WHEN 'A' THEN
      v_allowed_transitions := '[{"code": "S", "description": "Suspended"}, {"code": "D", "description": "Deleted"}, {"code": "T", "description": "Terminated"}]'::jsonb;
    WHEN 'S' THEN
      v_allowed_transitions := '[{"code": "A", "description": "Active"}, {"code": "T", "description": "Terminated"}, {"code": "D", "description": "Deleted"}]'::jsonb;
    ELSE
      v_allowed_transitions := '[]'::jsonb;
  END CASE;
  
  RETURN jsonb_build_object(
    'current_status', p_current_status,
    'can_change', jsonb_array_length(v_allowed_transitions) > 0,
    'allowed_transitions', v_allowed_transitions
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.change_ip_status(UUID, VARCHAR, VARCHAR, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ip_status_transitions(VARCHAR) TO authenticated;