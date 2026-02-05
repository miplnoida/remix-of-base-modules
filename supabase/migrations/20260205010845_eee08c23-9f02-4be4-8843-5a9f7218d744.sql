-- Create unified C3 configuration audit log table
CREATE TABLE public.c3_unified_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type VARCHAR(50) NOT NULL, -- 'period_config', 'levy_slab', 'levy_slab_detail', 'bonus_exemption'
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'CLONE'
  entity_name VARCHAR(255), -- Human readable name of what was changed
  field_name VARCHAR(100), -- Specific field that changed (for UPDATE)
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(10), -- user_code
  changed_by_name VARCHAR(255),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT,
  metadata JSONB -- Additional context
);

-- Create indexes for efficient querying
CREATE INDEX idx_c3_unified_audit_config_type ON public.c3_unified_audit_log(config_type);
CREATE INDEX idx_c3_unified_audit_record_id ON public.c3_unified_audit_log(record_id);
CREATE INDEX idx_c3_unified_audit_changed_at ON public.c3_unified_audit_log(changed_at DESC);
CREATE INDEX idx_c3_unified_audit_changed_by ON public.c3_unified_audit_log(changed_by);

-- Enable RLS
ALTER TABLE public.c3_unified_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read audit logs
CREATE POLICY "Authenticated users can read audit logs"
ON public.c3_unified_audit_log
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.c3_unified_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to log C3 config changes
CREATE OR REPLACE FUNCTION public.log_c3_config_change(
  p_config_type VARCHAR(50),
  p_record_id UUID,
  p_action VARCHAR(20),
  p_entity_name VARCHAR(255),
  p_field_name VARCHAR(100) DEFAULT NULL,
  p_old_value TEXT DEFAULT NULL,
  p_new_value TEXT DEFAULT NULL,
  p_changed_by VARCHAR(10) DEFAULT NULL,
  p_changed_by_name VARCHAR(255) DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.c3_unified_audit_log (
    config_type,
    record_id,
    action,
    entity_name,
    field_name,
    old_value,
    new_value,
    changed_by,
    changed_by_name,
    reason,
    metadata
  ) VALUES (
    p_config_type,
    p_record_id,
    p_action,
    p_entity_name,
    p_field_name,
    p_old_value,
    p_new_value,
    p_changed_by,
    p_changed_by_name,
    p_reason,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;