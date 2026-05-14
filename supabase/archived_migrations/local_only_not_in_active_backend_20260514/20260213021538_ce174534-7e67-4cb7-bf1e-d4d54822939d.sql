
-- 1. Add office timing columns to tb_office
ALTER TABLE public.tb_office 
  ADD COLUMN IF NOT EXISTS office_start_time TIME DEFAULT '08:00:00',
  ADD COLUMN IF NOT EXISTS office_end_time TIME DEFAULT '16:00:00';

-- Update existing offices with default timings
UPDATE public.tb_office SET office_start_time = '08:00:00', office_end_time = '16:00:00' 
WHERE office_start_time IS NULL;

-- 2. Create workflow_meeting_departments table
CREATE TABLE IF NOT EXISTS public.workflow_meeting_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  action_id UUID REFERENCES public.workflow_step_actions(id) ON DELETE CASCADE,
  office_code VARCHAR NOT NULL,
  department_id UUID NOT NULL REFERENCES public.tb_office_departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by VARCHAR,
  UNIQUE(workflow_id, step_id, office_code, department_id)
);

-- Create indexes
CREATE INDEX idx_wmd_workflow_step ON public.workflow_meeting_departments(workflow_id, step_id);
CREATE INDEX idx_wmd_office_dept ON public.workflow_meeting_departments(office_code, department_id);

-- Enable RLS
ALTER TABLE public.workflow_meeting_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage workflow meeting departments" ON public.workflow_meeting_departments FOR ALL USING (true) WITH CHECK (true);

-- 3. Add notify_assigned_person to workflow_action_configurations
ALTER TABLE public.workflow_action_configurations 
  ADD COLUMN IF NOT EXISTS notify_assigned_person BOOLEAN DEFAULT false;

-- 4. Add office_code, department_id, assigned_user_id, meeting_end_time to meetings table
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS office_code VARCHAR,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.tb_office_departments(id),
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID,
  ADD COLUMN IF NOT EXISTS meeting_end_time TIME;

-- Create indexes on meetings for performance
CREATE INDEX IF NOT EXISTS idx_meetings_assigned_user_date ON public.meetings(assigned_user_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_office_dept ON public.meetings(office_code, department_id);

-- 5. Insert meeting buffer time system setting
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, display_name, description, category, is_editable)
VALUES ('meeting_buffer_minutes', '20', 'number', 'Meeting Buffer Time (minutes)', 'Minimum buffer time between meetings in minutes. Prevents scheduling overlapping meetings.', 'Meetings', true)
ON CONFLICT (setting_key) DO NOTHING;

-- 6. Create RPC function to validate meeting overlap
CREATE OR REPLACE FUNCTION public.check_meeting_overlap(
  p_assigned_user_id UUID,
  p_meeting_date DATE,
  p_meeting_start_time TIME,
  p_buffer_minutes INT DEFAULT 20,
  p_exclude_meeting_id UUID DEFAULT NULL
)
RETURNS TABLE(
  has_overlap BOOLEAN,
  conflicting_meeting_id UUID,
  conflicting_start_time TIME,
  conflicting_end_time TIME,
  conflicting_reference VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS has_overlap,
    m.id AS conflicting_meeting_id,
    m.meeting_time AS conflicting_start_time,
    COALESCE(m.meeting_end_time, m.meeting_time + (p_buffer_minutes || ' minutes')::INTERVAL) AS conflicting_end_time,
    m.meeting_reference AS conflicting_reference
  FROM public.meetings m
  WHERE m.assigned_user_id = p_assigned_user_id
    AND m.meeting_date = p_meeting_date
    AND m.status IN ('Scheduled', 'Rescheduled', 'InProgress')
    AND (p_exclude_meeting_id IS NULL OR m.id != p_exclude_meeting_id)
    AND (
      -- New meeting overlaps with existing meeting window (start to end + buffer)
      p_meeting_start_time < COALESCE(m.meeting_end_time, m.meeting_time + (p_buffer_minutes || ' minutes')::INTERVAL) + (p_buffer_minutes || ' minutes')::INTERVAL
      AND p_meeting_start_time >= m.meeting_time - (p_buffer_minutes || ' minutes')::INTERVAL
    )
  LIMIT 1;
  
  -- If no overlap found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TIME, NULL::TIME, NULL::VARCHAR;
  END IF;
END;
$$;

-- 7. Create RPC to get user meetings for a date
CREATE OR REPLACE FUNCTION public.get_user_meetings_for_date(
  p_user_id UUID,
  p_date DATE
)
RETURNS TABLE(
  meeting_id UUID,
  meeting_reference VARCHAR,
  application_reference VARCHAR,
  meeting_time TIME,
  meeting_end_time TIME,
  status VARCHAR,
  meeting_type VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.meeting_reference,
    m.application_reference,
    m.meeting_time,
    m.meeting_end_time,
    m.status::VARCHAR,
    m.meeting_type::VARCHAR
  FROM public.meetings m
  WHERE m.assigned_user_id = p_user_id
    AND m.meeting_date = p_date
    AND m.status IN ('Scheduled', 'Rescheduled', 'InProgress')
  ORDER BY m.meeting_time;
END;
$$;

-- 8. Create RPC to validate meeting time within office hours
CREATE OR REPLACE FUNCTION public.validate_meeting_office_hours(
  p_office_code VARCHAR,
  p_meeting_time TIME,
  p_buffer_minutes INT DEFAULT 20
)
RETURNS TABLE(
  is_valid BOOLEAN,
  office_start TIME,
  office_end TIME,
  latest_allowed TIME,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIME;
  v_end TIME;
  v_latest TIME;
BEGIN
  SELECT o.office_start_time, o.office_end_time 
  INTO v_start, v_end
  FROM public.tb_office o
  WHERE o.code = p_office_code;
  
  IF v_start IS NULL THEN
    RETURN QUERY SELECT true, '08:00:00'::TIME, '16:00:00'::TIME, '15:40:00'::TIME, 'Office not found, using defaults'::TEXT;
    RETURN;
  END IF;
  
  v_latest := v_end - (p_buffer_minutes || ' minutes')::INTERVAL;
  
  IF p_meeting_time < v_start THEN
    RETURN QUERY SELECT false, v_start, v_end, v_latest, 
      ('Meeting time is before office opening hours (' || v_start::TEXT || ')')::TEXT;
  ELSIF p_meeting_time > v_latest THEN
    RETURN QUERY SELECT false, v_start, v_end, v_latest,
      ('Meeting time exceeds latest allowed time (' || v_latest::TEXT || ')')::TEXT;
  ELSE
    RETURN QUERY SELECT true, v_start, v_end, v_latest, 'Valid'::TEXT;
  END IF;
END;
$$;
