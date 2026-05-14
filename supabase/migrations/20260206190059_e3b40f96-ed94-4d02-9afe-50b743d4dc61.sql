-- ============================================================
-- SCHEDULE-A-MEETING WORKFLOW FEATURE
-- Comprehensive database schema for reusable meeting scheduling
-- ============================================================

-- 1. Add new action type to workflow_step_action_type enum
ALTER TYPE workflow_step_action_type ADD VALUE IF NOT EXISTS 'ScheduleMeeting';

-- 2. Add new instance status for meetings
ALTER TYPE workflow_instance_status ADD VALUE IF NOT EXISTS 'AwaitingMeeting';

-- 3. Create meeting status enum
CREATE TYPE meeting_status AS ENUM (
  'Scheduled',
  'Rescheduled', 
  'InProgress',
  'Closed',
  'Cancelled',
  'Rejected'
);

-- 4. Create meeting outcome enum
CREATE TYPE meeting_outcome AS ENUM (
  'ClosedWithApproval',
  'ClosedWithRejection',
  'Reschedule',
  'NextSchedule',
  'Cancel'
);

-- 5. Create meeting type enum (extensible for future modules)
CREATE TYPE meeting_type AS ENUM (
  'IP-Registration',
  'Employer-Registration',
  'Doctor-Registration',
  'General'
);

-- ============================================================
-- WORKFLOW ACTION TYPES MASTER TABLE
-- ============================================================
CREATE TABLE workflow_action_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code VARCHAR(50) NOT NULL UNIQUE,
  type_name VARCHAR(100) NOT NULL,
  description TEXT,
  requires_form BOOLEAN DEFAULT false,
  requires_api_integration BOOLEAN DEFAULT false,
  pauses_workflow BOOLEAN DEFAULT false,
  is_system_defined BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(10)
);

-- Insert standard action types
INSERT INTO workflow_action_types (type_code, type_name, description, requires_form, pauses_workflow)
VALUES 
  ('Approve', 'Approve', 'Standard approval action', false, false),
  ('Reject', 'Reject', 'Standard rejection action', false, false),
  ('SendBack', 'Send Back', 'Send back to previous step or applicant', false, false),
  ('Escalate', 'Escalate', 'Escalate to higher authority', false, false),
  ('Review', 'Review', 'Review and provide feedback', false, false),
  ('ScheduleMeeting', 'Schedule Meeting', 'Schedule a meeting with applicant - pauses workflow until meeting outcome', true, true);

-- ============================================================
-- WORKFLOW ACTION CONFIGURATIONS
-- Links workflow steps to configurable action types like ScheduleMeeting
-- ============================================================
CREATE TABLE workflow_action_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  action_type_id UUID NOT NULL REFERENCES workflow_action_types(id),
  action_id UUID REFERENCES workflow_step_actions(id) ON DELETE CASCADE,
  meeting_type meeting_type,
  requires_api_integration BOOLEAN DEFAULT false,
  api_config_id UUID,
  custom_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(10),
  UNIQUE(step_id, action_type_id)
);

-- ============================================================
-- WORKFLOW API CONFIGURATIONS
-- Defines how external APIs are called for workflow actions
-- ============================================================
CREATE TABLE workflow_api_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name VARCHAR(100) NOT NULL,
  description TEXT,
  http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
  endpoint_url TEXT NOT NULL,
  secret_name VARCHAR(100),
  timeout_seconds INTEGER DEFAULT 30,
  retry_count INTEGER DEFAULT 3,
  headers_template JSONB,
  body_template JSONB,
  success_condition JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(10)
);

-- Add foreign key to workflow_action_configurations
ALTER TABLE workflow_action_configurations 
  ADD CONSTRAINT fk_api_config 
  FOREIGN KEY (api_config_id) REFERENCES workflow_api_configurations(id);

-- ============================================================
-- WORKFLOW ACTION OUTCOMES
-- Defines what happens when a meeting/action is completed
-- ============================================================
CREATE TABLE workflow_action_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_config_id UUID NOT NULL REFERENCES workflow_action_configurations(id) ON DELETE CASCADE,
  outcome_code meeting_outcome NOT NULL,
  outcome_label VARCHAR(100) NOT NULL,
  description TEXT,
  icon_name VARCHAR(50),
  button_variant VARCHAR(20) DEFAULT 'default',
  next_step_type VARCHAR(20) NOT NULL DEFAULT 'stay',
  next_step_id UUID REFERENCES workflow_steps(id),
  end_state workflow_end_state,
  triggers_api BOOLEAN DEFAULT false,
  api_config_id UUID REFERENCES workflow_api_configurations(id),
  creates_new_request BOOLEAN DEFAULT false,
  new_request_module VARCHAR(100),
  requires_remarks BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(10)
);

-- ============================================================
-- MEETINGS TABLE
-- Core table for scheduled meetings
-- ============================================================
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_reference VARCHAR(20) NOT NULL UNIQUE,
  application_reference VARCHAR(50) NOT NULL,
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  workflow_id UUID REFERENCES workflow_definitions(id),
  step_id UUID REFERENCES workflow_steps(id),
  action_config_id UUID REFERENCES workflow_action_configurations(id),
  meeting_type meeting_type NOT NULL,
  status meeting_status NOT NULL DEFAULT 'Scheduled',
  outcome meeting_outcome,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  contact_person VARCHAR(100),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  office_address TEXT,
  office_location_id UUID,
  remarks TEXT,
  outcome_remarks TEXT,
  parent_meeting_id UUID REFERENCES meetings(id),
  reschedule_count INTEGER DEFAULT 0,
  scheduled_by UUID REFERENCES auth.users(id),
  scheduled_by_name VARCHAR(100),
  closed_by UUID,
  closed_by_name VARCHAR(100),
  closed_at TIMESTAMPTZ,
  api_notified BOOLEAN DEFAULT false,
  api_notification_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(10)
);

-- Indexes for meetings
CREATE INDEX idx_meetings_reference ON meetings(meeting_reference);
CREATE INDEX idx_meetings_app_reference ON meetings(application_reference);
CREATE INDEX idx_meetings_workflow_instance ON meetings(workflow_instance_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_date ON meetings(meeting_date);
CREATE INDEX idx_meetings_type ON meetings(meeting_type);
CREATE INDEX idx_meetings_scheduled_by ON meetings(scheduled_by);

-- ============================================================
-- MEETING HISTORY TABLE
-- Audit trail for all meeting status changes
-- ============================================================
CREATE TABLE meeting_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  old_status meeting_status,
  new_status meeting_status NOT NULL,
  action_taken VARCHAR(50) NOT NULL,
  outcome meeting_outcome,
  old_date DATE,
  new_date DATE,
  old_time TIME,
  new_time TIME,
  remarks TEXT,
  performed_by UUID,
  performed_by_name VARCHAR(100),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_meeting_history_meeting ON meeting_history(meeting_id);
CREATE INDEX idx_meeting_history_action ON meeting_history(action_taken);
CREATE INDEX idx_meeting_history_date ON meeting_history(performed_at);

-- ============================================================
-- MEETING API LOGS TABLE
-- Audit trail for all third-party API calls
-- ============================================================
CREATE TABLE meeting_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  api_config_id UUID REFERENCES workflow_api_configurations(id),
  action_type VARCHAR(50) NOT NULL,
  request_url TEXT,
  request_method VARCHAR(10),
  request_headers JSONB,
  request_payload JSONB,
  response_status INTEGER,
  response_headers JSONB,
  response_payload JSONB,
  is_success BOOLEAN,
  error_message TEXT,
  duration_ms INTEGER,
  retry_attempt INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(10)
);

CREATE INDEX idx_meeting_api_logs_meeting ON meeting_api_logs(meeting_id);
CREATE INDEX idx_meeting_api_logs_success ON meeting_api_logs(is_success);
CREATE INDEX idx_meeting_api_logs_date ON meeting_api_logs(created_at);

-- ============================================================
-- ADD OFFICE ADDRESS TO SYSTEM SETTINGS
-- ============================================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, display_name, description, category, is_editable)
VALUES (
  'default_office_address',
  'Social Security Board, Bay Road, Basseterre, St. Kitts',
  'text',
  'Default Office Address',
  'Default office address used for scheduling meetings',
  'General',
  true
) ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- FUNCTION TO GENERATE MEETING REFERENCE NUMBER
-- ============================================================
CREATE OR REPLACE FUNCTION generate_meeting_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_ref TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(meeting_reference FROM 5 FOR 6) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM meetings
  WHERE meeting_reference LIKE 'MTG-' || v_year || '%';
  
  v_ref := 'MTG-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  
  RETURN v_ref;
END;
$$;

-- ============================================================
-- FUNCTION TO SCHEDULE A MEETING
-- ============================================================
CREATE OR REPLACE FUNCTION schedule_meeting(
  p_application_reference VARCHAR,
  p_workflow_instance_id UUID,
  p_workflow_id UUID,
  p_step_id UUID,
  p_action_config_id UUID,
  p_meeting_type meeting_type,
  p_meeting_date DATE,
  p_meeting_time TIME,
  p_contact_person VARCHAR,
  p_contact_email VARCHAR DEFAULT NULL,
  p_contact_phone VARCHAR DEFAULT NULL,
  p_office_address TEXT DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_user_name VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting_ref TEXT;
  v_meeting_id UUID;
  v_default_address TEXT;
BEGIN
  -- Generate meeting reference
  v_meeting_ref := generate_meeting_reference();
  
  -- Get default office address if not provided
  IF p_office_address IS NULL THEN
    SELECT setting_value INTO v_default_address
    FROM system_settings
    WHERE setting_key = 'default_office_address';
  ELSE
    v_default_address := p_office_address;
  END IF;
  
  -- Create meeting record
  INSERT INTO meetings (
    meeting_reference,
    application_reference,
    workflow_instance_id,
    workflow_id,
    step_id,
    action_config_id,
    meeting_type,
    status,
    meeting_date,
    meeting_time,
    contact_person,
    contact_email,
    contact_phone,
    office_address,
    remarks,
    scheduled_by,
    scheduled_by_name,
    created_by
  ) VALUES (
    v_meeting_ref,
    p_application_reference,
    p_workflow_instance_id,
    p_workflow_id,
    p_step_id,
    p_action_config_id,
    p_meeting_type,
    'Scheduled',
    p_meeting_date,
    p_meeting_time,
    p_contact_person,
    p_contact_email,
    p_contact_phone,
    v_default_address,
    p_remarks,
    p_user_id,
    p_user_name,
    LEFT(p_user_name, 10)
  )
  RETURNING id INTO v_meeting_id;
  
  -- Create history record
  INSERT INTO meeting_history (
    meeting_id,
    new_status,
    action_taken,
    new_date,
    new_time,
    remarks,
    performed_by,
    performed_by_name
  ) VALUES (
    v_meeting_id,
    'Scheduled',
    'CREATED',
    p_meeting_date,
    p_meeting_time,
    'Meeting scheduled',
    p_user_id,
    p_user_name
  );
  
  -- Update workflow instance status to AwaitingMeeting
  IF p_workflow_instance_id IS NOT NULL THEN
    UPDATE workflow_instances
    SET status = 'AwaitingMeeting',
        updated_at = NOW()
    WHERE id = p_workflow_instance_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'meeting_id', v_meeting_id,
    'meeting_reference', v_meeting_ref,
    'message', 'Meeting scheduled successfully'
  );
END;
$$;

-- ============================================================
-- FUNCTION TO PROCESS MEETING OUTCOME
-- ============================================================
CREATE OR REPLACE FUNCTION process_meeting_outcome(
  p_meeting_id UUID,
  p_outcome meeting_outcome,
  p_remarks TEXT DEFAULT NULL,
  p_new_date DATE DEFAULT NULL,
  p_new_time TIME DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_user_name VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting RECORD;
  v_outcome_config RECORD;
  v_new_status meeting_status;
  v_new_meeting_id UUID;
  v_new_meeting_ref TEXT;
BEGIN
  -- Get meeting details
  SELECT * INTO v_meeting FROM meetings WHERE id = p_meeting_id;
  
  IF v_meeting IS NULL THEN
    RAISE EXCEPTION 'Meeting not found';
  END IF;
  
  -- Get outcome configuration
  SELECT * INTO v_outcome_config
  FROM workflow_action_outcomes
  WHERE action_config_id = v_meeting.action_config_id
    AND outcome_code = p_outcome
    AND is_active = true;
  
  -- Determine new status based on outcome
  CASE p_outcome
    WHEN 'ClosedWithApproval' THEN v_new_status := 'Closed';
    WHEN 'ClosedWithRejection' THEN v_new_status := 'Rejected';
    WHEN 'Reschedule' THEN v_new_status := 'Rescheduled';
    WHEN 'NextSchedule' THEN v_new_status := 'Closed';
    WHEN 'Cancel' THEN v_new_status := 'Cancelled';
    ELSE v_new_status := 'Closed';
  END CASE;
  
  -- Update meeting record
  UPDATE meetings
  SET status = v_new_status,
      outcome = p_outcome,
      outcome_remarks = p_remarks,
      closed_by = p_user_id,
      closed_by_name = p_user_name,
      closed_at = NOW(),
      updated_at = NOW(),
      updated_by = LEFT(p_user_name, 10)
  WHERE id = p_meeting_id;
  
  -- Create history record
  INSERT INTO meeting_history (
    meeting_id,
    old_status,
    new_status,
    action_taken,
    outcome,
    remarks,
    performed_by,
    performed_by_name
  ) VALUES (
    p_meeting_id,
    v_meeting.status,
    v_new_status,
    p_outcome::TEXT,
    p_outcome,
    p_remarks,
    p_user_id,
    p_user_name
  );
  
  -- Handle reschedule - create new meeting
  IF p_outcome = 'Reschedule' AND p_new_date IS NOT NULL THEN
    v_new_meeting_ref := generate_meeting_reference();
    
    INSERT INTO meetings (
      meeting_reference,
      application_reference,
      workflow_instance_id,
      workflow_id,
      step_id,
      action_config_id,
      meeting_type,
      status,
      meeting_date,
      meeting_time,
      contact_person,
      contact_email,
      contact_phone,
      office_address,
      remarks,
      parent_meeting_id,
      reschedule_count,
      scheduled_by,
      scheduled_by_name,
      created_by
    )
    SELECT 
      v_new_meeting_ref,
      application_reference,
      workflow_instance_id,
      workflow_id,
      step_id,
      action_config_id,
      meeting_type,
      'Scheduled',
      p_new_date,
      COALESCE(p_new_time, meeting_time),
      contact_person,
      contact_email,
      contact_phone,
      office_address,
      p_remarks,
      id,
      reschedule_count + 1,
      p_user_id,
      p_user_name,
      LEFT(p_user_name, 10)
    FROM meetings WHERE id = p_meeting_id
    RETURNING id INTO v_new_meeting_id;
    
    -- Create history for new meeting
    INSERT INTO meeting_history (
      meeting_id,
      new_status,
      action_taken,
      new_date,
      new_time,
      remarks,
      performed_by,
      performed_by_name
    ) VALUES (
      v_new_meeting_id,
      'Scheduled',
      'RESCHEDULED',
      p_new_date,
      COALESCE(p_new_time, v_meeting.meeting_time),
      'Rescheduled from ' || v_meeting.meeting_reference,
      p_user_id,
      p_user_name
    );
  END IF;
  
  -- Process workflow transition if outcome config exists
  IF v_outcome_config.id IS NOT NULL THEN
    -- Handle workflow step transition
    IF v_outcome_config.next_step_type = 'next' AND v_outcome_config.next_step_id IS NOT NULL THEN
      UPDATE workflow_instances
      SET current_step_id = v_outcome_config.next_step_id,
          status = 'InProgress',
          updated_at = NOW()
      WHERE id = v_meeting.workflow_instance_id;
    ELSIF v_outcome_config.next_step_type = 'end' AND v_outcome_config.end_state IS NOT NULL THEN
      UPDATE workflow_instances
      SET status = v_outcome_config.end_state::text::workflow_instance_status,
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_meeting.workflow_instance_id;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'meeting_id', p_meeting_id,
    'new_status', v_new_status,
    'new_meeting_id', v_new_meeting_id,
    'new_meeting_reference', v_new_meeting_ref,
    'message', 'Meeting outcome processed successfully'
  );
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE workflow_action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_action_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_api_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_action_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_api_logs ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Allow authenticated read workflow_action_types" ON workflow_action_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read workflow_action_configurations" ON workflow_action_configurations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read workflow_api_configurations" ON workflow_api_configurations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read workflow_action_outcomes" ON workflow_action_outcomes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated all on meetings" ON meetings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated all on meeting_history" ON meeting_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated all on meeting_api_logs" ON meeting_api_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Admin write policies
CREATE POLICY "Allow admins write workflow_action_types" ON workflow_action_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow admins write workflow_action_configurations" ON workflow_action_configurations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow admins write workflow_api_configurations" ON workflow_api_configurations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow admins write workflow_action_outcomes" ON workflow_action_outcomes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- REGISTER MODULE IN APP_MODULES
-- ============================================================
INSERT INTO app_modules (name, display_name, description, route, icon, is_enabled, sort_order)
VALUES (
  'manage-meetings',
  'Manage Meetings',
  'Schedule and manage meetings across workflow processes',
  '/meetings/manage',
  'Calendar',
  true,
  150
) ON CONFLICT (name) DO NOTHING;