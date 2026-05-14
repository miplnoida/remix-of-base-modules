CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'Clerk',
    'LegalOfficer',
    'Supervisor',
    'FinanceOfficer',
    'ReadOnly',
    'Admin',
    'FinanceManager'
);


--
-- Name: audit_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_status AS ENUM (
    'assigned',
    'in_progress',
    'completed',
    'escalated',
    'closed'
);


--
-- Name: audit_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_type AS ENUM (
    'random',
    'complaint',
    'referral',
    'follow_up',
    'scouting',
    'investigation'
);


--
-- Name: bema_audit_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bema_audit_status AS ENUM (
    'assigned',
    'in_progress',
    'completed',
    'escalated',
    'closed'
);


--
-- Name: bema_audit_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bema_audit_type AS ENUM (
    'random',
    'complaint',
    'referral',
    'follow_up',
    'scouting',
    'investigation'
);


--
-- Name: bema_c3_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bema_c3_status AS ENUM (
    'draft',
    'submitted',
    'validated',
    'posted',
    'rejected',
    'query_raised'
);


--
-- Name: bema_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bema_category AS ENUM (
    'cat_a',
    'cat_b',
    'cat_c',
    'cat_d',
    'cat_e'
);


--
-- Name: bema_inspector_activity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bema_inspector_activity AS ENUM (
    'inspection',
    'audit',
    'investigation',
    'scouting',
    'education',
    'notice_service'
);


--
-- Name: bema_plan_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bema_plan_status AS ENUM (
    'active',
    'completed',
    'broken',
    'escalated'
);


--
-- Name: bema_registration_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bema_registration_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'active',
    'inactive',
    'suspended'
);


--
-- Name: bema_registration_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bema_registration_type AS ENUM (
    'employer',
    'self_employed',
    'voluntary'
);


--
-- Name: bema_waiver_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bema_waiver_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: c3_filing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.c3_filing_status AS ENUM (
    'draft',
    'submitted',
    'validated',
    'posted',
    'rejected',
    'query_raised'
);


--
-- Name: case_flag; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.case_flag AS ENUM (
    'Urgent',
    'Escalated',
    'On Hold',
    'Confidential',
    'External Counsel'
);


--
-- Name: case_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.case_source AS ENUM (
    'Complaint',
    'Referral',
    'System',
    'Audit'
);


--
-- Name: case_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.case_status AS ENUM (
    'Draft',
    'Filed',
    'Under Review',
    'Hearing Scheduled',
    'Hearing Held',
    'Decision Pending',
    'Order Issued',
    'Closed – Compliant',
    'Closed – Non-Compliant',
    'Withdrawn',
    'Appealed',
    'Reopened'
);


--
-- Name: case_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.case_type AS ENUM (
    'Prosecution',
    'Compliance',
    'Appeal',
    'Recovery',
    'Employer Dispute',
    'IP Dispute',
    'Garnishment',
    'Other'
);


--
-- Name: compliance_registration_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.compliance_registration_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'active',
    'inactive',
    'suspended'
);


--
-- Name: compliance_registration_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.compliance_registration_type AS ENUM (
    'employer',
    'self_employed',
    'voluntary'
);


--
-- Name: contribution_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contribution_category AS ENUM (
    'cat_a',
    'cat_b',
    'cat_c',
    'cat_d',
    'cat_e'
);


--
-- Name: data_scope_condition_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.data_scope_condition_type AS ENUM (
    'owner',
    'department',
    'office',
    'created_by',
    'custom_sql'
);


--
-- Name: document_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_type AS ENUM (
    'Filings',
    'Evidence',
    'Notices',
    'Orders',
    'Correspondence',
    'Internal'
);


--
-- Name: field_masking_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.field_masking_type AS ENUM (
    'none',
    'partial',
    'full'
);


--
-- Name: inspector_activity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inspector_activity_type AS ENUM (
    'inspection',
    'audit',
    'investigation',
    'scouting',
    'education',
    'notice_service'
);


--
-- Name: next_step_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.next_step_type AS ENUM (
    'next_step',
    'specific_step',
    'end_workflow',
    'send_back_to_applicant'
);


--
-- Name: notification_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_channel AS ENUM (
    'email',
    'sms',
    'push',
    'in_app'
);


--
-- Name: notification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_status AS ENUM (
    'queued',
    'sending',
    'sent',
    'failed',
    'cancelled'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'Draft',
    'Under Review',
    'Approved',
    'Published'
);


--
-- Name: party_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.party_role AS ENUM (
    'Primary Respondent',
    'Complainant',
    'Representative',
    'Third Party'
);


--
-- Name: payment_plan_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_plan_status AS ENUM (
    'active',
    'completed',
    'broken',
    'escalated'
);


--
-- Name: penalty_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.penalty_status AS ENUM (
    'Pending',
    'Paid',
    'Overdue',
    'Waived'
);


--
-- Name: priority_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.priority_level AS ENUM (
    'Low',
    'Medium',
    'High',
    'Urgent'
);


--
-- Name: service_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_status AS ENUM (
    'Not Served',
    'Served',
    'Service Failed'
);


--
-- Name: settlement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.settlement_status AS ENUM (
    'Proposed',
    'Accepted',
    'Rejected',
    'Completed'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_status AS ENUM (
    'Open',
    'In Progress',
    'Completed',
    'Deferred'
);


--
-- Name: waiver_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.waiver_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: workflow_end_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workflow_end_state AS ENUM (
    'Approved',
    'Rejected'
);


--
-- Name: workflow_instance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workflow_instance_status AS ENUM (
    'Pending',
    'InProgress',
    'Completed',
    'Rejected',
    'Cancelled',
    'Escalated',
    'Approved',
    'Query'
);


--
-- Name: workflow_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workflow_status AS ENUM (
    'Draft',
    'Active',
    'Disabled',
    'Archived'
);


--
-- Name: workflow_step_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workflow_step_action_type AS ENUM (
    'Approve',
    'Reject',
    'SendBack',
    'Escalate',
    'AutoApprove',
    'Review',
    'Custom'
);


--
-- Name: workflow_task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workflow_task_status AS ENUM (
    'Pending',
    'InProgress',
    'Completed',
    'Skipped',
    'Cancelled'
);


--
-- Name: auto_grant_admin_permission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_grant_admin_permission() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  admin_role_id UUID;
BEGIN
  -- Get the Admin role ID
  SELECT id INTO admin_role_id FROM roles WHERE role_name = 'Admin';
  
  IF admin_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, module_id, action_id, is_granted)
    VALUES (admin_role_id, NEW.module_id, NEW.id, true)
    ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: can_access_module(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_access_module(_user_id uuid, _module_name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Admins can access everything
  IF public.is_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Check if user has 'view' permission for this module through any role
  RETURN EXISTS(
    SELECT 1
    FROM app_modules m
    INNER JOIN module_actions ma ON ma.module_id = m.id
    INNER JOIN role_permissions rp ON rp.module_id = m.id AND rp.action_id = ma.id
    INNER JOIN roles r ON r.id = rp.role_id
    INNER JOIN user_roles ur ON ur.role = r.role_name
    WHERE ur.user_id = _user_id
      AND m.name = _module_name
      AND m.is_enabled = true
      AND ma.action_name = 'view'
      AND ma.is_enabled = true
      AND rp.is_granted = true
  );
END;
$$;


--
-- Name: check_row_access(uuid, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_row_access(_user_id uuid, _module_name text, _table_name text, _action text, _record jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result JSONB;
  user_roles TEXT[];
  rule_record RECORD;
  is_allowed BOOLEAN := false;
  rules_applied JSONB := '[]'::jsonb;
  denial_reason TEXT := NULL;
BEGIN
  IF public.is_admin(_user_id) THEN
    RETURN jsonb_build_object('allowed', true, 'rules_applied', '[{"type": "admin_bypass"}]'::jsonb, 'reason', NULL);
  END IF;

  SELECT array_agg(ur.role::TEXT) INTO user_roles FROM user_roles ur WHERE ur.user_id = _user_id;

  IF user_roles IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'rules_applied', '[]'::jsonb, 'reason', 'No roles assigned');
  END IF;

  FOR rule_record IN
    SELECT dsr.*, r.role_name
    FROM data_scope_rules dsr
    JOIN roles r ON r.id = dsr.role_id
    WHERE dsr.target_table = _table_name AND dsr.is_active = true AND r.role_name = ANY(user_roles)
    ORDER BY dsr.priority ASC
  LOOP
    IF (_action = 'view' AND rule_record.can_view) OR
       (_action = 'edit' AND rule_record.can_edit) OR
       (_action = 'delete' AND rule_record.can_delete) THEN
      rules_applied := rules_applied || jsonb_build_array(jsonb_build_object(
        'type', 'data_scope_rule', 'id', rule_record.id, 'role', rule_record.role_name
      ));
      is_allowed := true;
    END IF;
  END LOOP;

  IF NOT is_allowed THEN denial_reason := 'No matching rules'; END IF;

  RETURN jsonb_build_object('allowed', is_allowed, 'rules_applied', rules_applied, 'reason', denial_reason);
END;
$$;


--
-- Name: check_workflow_task_access(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_workflow_task_access(_user_id uuid, _workflow_instance_id uuid, _action text DEFAULT 'view'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_workflow workflow_instances;
  v_definition workflow_definitions;
  v_user_profile profiles;
  v_is_admin boolean := false;
  v_row_access jsonb;
  v_field_rules jsonb;
  v_result jsonb;
  v_has_task_assignment boolean := false;
  v_secured_table text;
  v_secured_module_id uuid;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_profile FROM profiles WHERE id = _user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'User not found');
  END IF;
  
  -- Check if user is admin using the existing function
  v_is_admin := is_admin(_user_id);
  
  -- Admin bypasses all checks
  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'allowed', true, 
      'reason', 'Admin access',
      'is_admin', true,
      'visible_fields', '[]'::jsonb,
      'editable_fields', '[]'::jsonb,
      'available_actions', '["approve","reject","query","send_back"]'::jsonb
    );
  END IF;
  
  -- Get workflow instance
  SELECT * INTO v_workflow FROM workflow_instances WHERE id = _workflow_instance_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Workflow instance not found');
  END IF;
  
  -- Get workflow definition
  SELECT * INTO v_definition FROM workflow_definitions WHERE id = v_workflow.workflow_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Workflow definition not found');
  END IF;
  
  v_secured_table := v_definition.secured_table;
  v_secured_module_id := v_definition.secured_module_id;
  
  -- Check if user has task assignment (by role, designation, or direct assignment)
  SELECT EXISTS (
    SELECT 1 FROM workflow_tasks wt
    WHERE wt.instance_id = _workflow_instance_id
    AND wt.status IN ('Pending', 'InProgress')
    AND (
      wt.assigned_user_id = _user_id
      OR wt.assigned_role_id IN (SELECT role_id FROM user_roles WHERE user_id = _user_id)
      OR wt.assigned_designation_id = v_user_profile.designation_id
    )
  ) INTO v_has_task_assignment;
  
  IF NOT v_has_task_assignment THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'No task assignment for this user');
  END IF;
  
  -- If no secured table is defined, allow access with no field restrictions
  IF v_secured_table IS NULL OR v_secured_table = '' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'No security binding defined',
      'visible_fields', '[]'::jsonb,
      'editable_fields', '[]'::jsonb,
      'available_actions', '["approve","reject","query","send_back"]'::jsonb
    );
  END IF;
  
  -- Check row-level access via data_scope_rules
  v_row_access := check_row_access(_user_id, '', v_secured_table, _action);
  
  IF NOT COALESCE((v_row_access->>'allowed')::boolean, false) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', COALESCE(v_row_access->>'reason', 'Row access denied'),
      'scope_rules_applied', v_row_access->'rules_applied'
    );
  END IF;
  
  -- Get field visibility rules
  v_field_rules := get_visible_fields(_user_id, '', v_secured_table);
  
  -- Build available actions based on action permissions
  v_result := jsonb_build_object(
    'allowed', true,
    'reason', 'Access granted via data policies',
    'workflow_instance_id', _workflow_instance_id,
    'secured_table', v_secured_table,
    'visible_fields', v_field_rules,
    'editable_fields', (
      SELECT COALESCE(jsonb_agg(f), '[]'::jsonb)
      FROM jsonb_array_elements(v_field_rules) f
      WHERE (f->>'can_edit')::boolean = true
    ),
    'scope_rules_applied', v_row_access->'rules_applied',
    'available_actions', CASE 
      WHEN COALESCE((v_row_access->>'can_edit')::boolean, false) THEN '["approve","reject","query","send_back"]'::jsonb
      ELSE '["view"]'::jsonb
    END
  );
  
  RETURN v_result;
END;
$$;


--
-- Name: clone_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clone_role(source_role_id uuid, new_role_name text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_role_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'Admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF new_role_name IS NULL OR btrim(new_role_name) = '' THEN
    RAISE EXCEPTION 'Role name is required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.roles WHERE role_name = new_role_name) THEN
    RAISE EXCEPTION 'Role name already exists';
  END IF;

  INSERT INTO public.roles (role_name, description, is_active, is_system_role, mfa_required)
  SELECT new_role_name,
         'Cloned from ' || r.role_name,
         true,
         false,
         COALESCE(r.mfa_required, false)
  FROM public.roles r
  WHERE r.id = source_role_id
  RETURNING id INTO new_role_id;

  IF new_role_id IS NULL THEN
    RAISE EXCEPTION 'Source role not found';
  END IF;

  INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
  SELECT new_role_id, rp.module_id, rp.action_id, rp.is_granted
  FROM public.role_permissions rp
  WHERE rp.role_id = source_role_id;

  RETURN new_role_id;
END;
$$;


--
-- Name: find_eligible_approver(uuid, uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_eligible_approver(_workflow_instance_id uuid, _step_id uuid, _exclude_users uuid[] DEFAULT '{}'::uuid[]) RETURNS TABLE(user_id uuid, user_name text, has_data_access boolean, access_details jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_step workflow_steps;
  v_workflow workflow_instances;
  v_definition workflow_definitions;
BEGIN
  -- Get the step configuration
  SELECT * INTO v_step FROM workflow_steps WHERE id = _step_id;
  SELECT * INTO v_workflow FROM workflow_instances WHERE id = _workflow_instance_id;
  SELECT * INTO v_definition FROM workflow_definitions WHERE id = v_workflow.workflow_id;
  
  -- Find users matching the step assignment criteria
  RETURN QUERY
  WITH potential_approvers AS (
    SELECT DISTINCT p.id as uid, p.full_name as uname
    FROM profiles p
    LEFT JOIN user_roles ur ON ur.user_id = p.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE p.is_active = true
    AND NOT (p.id = ANY(_exclude_users))
    AND (
      -- Match by role
      (v_step.assigned_role IS NOT NULL AND r.name = v_step.assigned_role)
      -- Match by designation
      OR (v_step.assigned_designation IS NOT NULL AND p.designation_id IN (
        SELECT d.id FROM designations d WHERE d.name = v_step.assigned_designation
      ))
    )
  )
  SELECT 
    pa.uid as user_id,
    pa.uname as user_name,
    COALESCE((check_workflow_task_access(pa.uid, _workflow_instance_id, 'edit')->>'allowed')::boolean, false) as has_data_access,
    check_workflow_task_access(pa.uid, _workflow_instance_id, 'edit') as access_details
  FROM potential_approvers pa
  WHERE COALESCE((check_workflow_task_access(pa.uid, _workflow_instance_id, 'edit')->>'allowed')::boolean, false) = true
  ORDER BY pa.uname;
END;
$$;


--
-- Name: get_all_public_tables(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_public_tables() RETURNS TABLE(table_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT t.tablename::TEXT as table_name
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$;


--
-- Name: get_module_tables(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_module_tables(_module_id uuid) RETURNS TABLE(table_name text, display_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT mt.table_name, COALESCE(mt.display_name, mt.table_name) as display_name
  FROM module_tables mt
  WHERE mt.module_id = _module_id
  ORDER BY mt.display_name;
END;
$$;


--
-- Name: get_table_columns(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_table_columns(_table_name text) RETURNS TABLE(column_name text, data_type text, is_nullable boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    (c.is_nullable = 'YES')::BOOLEAN
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = _table_name
  ORDER BY c.ordinal_position;
END;
$$;


--
-- Name: get_user_accessible_modules(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_accessible_modules(_user_id uuid) RETURNS TABLE(id uuid, name text, display_name text, icon text, route text, parent_id uuid, sort_order integer, description text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If user is admin, return all enabled modules
  IF public.is_admin(_user_id) THEN
    RETURN QUERY
    SELECT 
      m.id,
      m.name,
      m.display_name,
      m.icon,
      m.route,
      m.parent_id,
      m.sort_order,
      m.description
    FROM app_modules m
    WHERE m.is_enabled = true
    ORDER BY m.sort_order NULLS LAST, m.display_name;
  ELSE
    -- Return modules where user has 'view' permission through any role
    -- Cast app_role enum to text for comparison with roles.role_name
    RETURN QUERY
    SELECT DISTINCT
      m.id,
      m.name,
      m.display_name,
      m.icon,
      m.route,
      m.parent_id,
      m.sort_order,
      m.description
    FROM app_modules m
    INNER JOIN module_actions ma ON ma.module_id = m.id
    INNER JOIN role_permissions rp ON rp.module_id = m.id AND rp.action_id = ma.id
    INNER JOIN roles r ON r.id = rp.role_id
    INNER JOIN user_roles ur ON ur.role::text = r.role_name
    WHERE ur.user_id = _user_id
      AND m.is_enabled = true
      AND ma.action_name = 'view'
      AND ma.is_enabled = true
      AND rp.is_granted = true
    ORDER BY m.sort_order NULLS LAST, m.display_name;
  END IF;
END;
$$;


--
-- Name: get_user_permissions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_permissions(_user_id uuid) RETURNS TABLE(module_id uuid, module_name text, action_id uuid, action_name text, is_granted boolean, source text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH role_perms AS (
    SELECT rp.module_id, am.name as module_name, rp.action_id, ma.action_name, rp.is_granted, 'role'::TEXT as source
    FROM user_roles ur
    JOIN roles r ON r.role_name = ur.role::text  -- Cast app_role enum to text
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN app_modules am ON am.id = rp.module_id
    JOIN module_actions ma ON ma.id = rp.action_id
    WHERE ur.user_id = _user_id AND am.is_enabled = true AND ma.is_enabled = true
  ),
  user_overrides AS (
    SELECT upo.module_id, am.name as module_name, upo.action_id, ma.action_name, upo.is_granted, 'user_override'::TEXT as source
    FROM user_permission_overrides upo
    JOIN app_modules am ON am.id = upo.module_id
    JOIN module_actions ma ON ma.id = upo.action_id
    WHERE upo.user_id = _user_id
  )
  SELECT DISTINCT ON (combined.module_id, combined.action_id) combined.module_id, combined.module_name, combined.action_id, combined.action_name, combined.is_granted, combined.source
  FROM (
    SELECT * FROM user_overrides
    UNION ALL
    SELECT * FROM role_perms rp WHERE NOT EXISTS (SELECT 1 FROM user_overrides uo WHERE uo.module_id = rp.module_id AND uo.action_id = rp.action_id)
  ) combined
  WHERE combined.is_granted = true;
END;
$$;


--
-- Name: get_visible_fields(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_visible_fields(_user_id uuid, _module_name text, _table_name text) RETURNS TABLE(field_name text, can_view boolean, can_edit boolean, masking_type text, rule_source text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_roles TEXT[];
BEGIN
  IF public.is_admin(_user_id) THEN
    RETURN QUERY SELECT fsr.field_name, true, true, 'none'::TEXT, 'admin_bypass'::TEXT
    FROM field_security_rules fsr WHERE fsr.target_table = _table_name GROUP BY fsr.field_name;
    RETURN;
  END IF;

  SELECT array_agg(ur.role::TEXT) INTO user_roles FROM user_roles ur WHERE ur.user_id = _user_id;

  RETURN QUERY
  SELECT fsr.field_name, bool_or(fsr.can_view), bool_or(fsr.can_edit), 
         (array_agg(fsr.masking_type::TEXT ORDER BY fsr.priority))[1], 'role_rule'::TEXT
  FROM field_security_rules fsr
  JOIN roles r ON r.id = fsr.role_id
  WHERE fsr.target_table = _table_name AND fsr.is_active = true AND r.role_name = ANY(user_roles)
  GROUP BY fsr.field_name;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: has_any_role(uuid, public.app_role[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;


--
-- Name: has_permission(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_permission(_user_id uuid, _module_name text, _action_name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Admin role always has permission (cast enum to text for comparison)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'Admin') THEN
    RETURN true;
  END IF;
  
  -- Check normal permissions for non-Admin users
  RETURN EXISTS (SELECT 1 FROM public.get_user_permissions(_user_id) p WHERE p.module_name = _module_name AND p.action_name = _action_name);
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'Admin'
  )
$$;


--
-- Name: log_audit_event(text, text, text, text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_audit_event(_action_type text, _module_name text DEFAULT NULL::text, _entity_type text DEFAULT NULL::text, _entity_id text DEFAULT NULL::text, _field_name text DEFAULT NULL::text, _old_value text DEFAULT NULL::text, _new_value text DEFAULT NULL::text, _metadata jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE _audit_id UUID; _user_email TEXT; _user_name TEXT;
BEGIN
  SELECT email, full_name INTO _user_email, _user_name FROM profiles WHERE id = auth.uid();
  INSERT INTO audit_logs (user_id, user_email, user_name, action_type, module_name, entity_type, entity_id, field_name, old_value, new_value, metadata)
  VALUES (auth.uid(), _user_email, _user_name, _action_type, _module_name, _entity_type, _entity_id, _field_name, _old_value, _new_value, _metadata)
  RETURNING id INTO _audit_id;
  RETURN _audit_id;
END;
$$;


--
-- Name: log_document_action(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_document_action() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO legal_timeline_events (case_id, type, actor_id, actor_name, description)
    VALUES (
      NEW.case_id,
      'Document',
      NEW.uploaded_by,
      (SELECT full_name FROM profiles WHERE id = NEW.uploaded_by),
      'Uploaded document: ' || NEW.name || ' (' || NEW.type || ')'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.version > OLD.version THEN
    INSERT INTO legal_timeline_events (case_id, type, actor_id, actor_name, description)
    VALUES (
      NEW.case_id,
      'Document',
      auth.uid(),
      (SELECT full_name FROM profiles WHERE id = auth.uid()),
      'New version of document: ' || NEW.name || ' (v' || NEW.version || ')'
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: log_workflow_security_event(uuid, uuid, text, uuid, text[], text[], jsonb, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_workflow_security_event(_workflow_instance_id uuid, _user_id uuid, _action text, _record_id uuid DEFAULT NULL::uuid, _fields_viewed text[] DEFAULT NULL::text[], _fields_edited text[] DEFAULT NULL::text[], _rules_applied jsonb DEFAULT NULL::jsonb, _access_granted boolean DEFAULT true, _denial_reason text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_log_id uuid;
  v_workflow workflow_instances;
  v_user profiles;
BEGIN
  SELECT * INTO v_workflow FROM workflow_instances WHERE id = _workflow_instance_id;
  SELECT * INTO v_user FROM profiles WHERE id = _user_id;
  
  INSERT INTO workflow_security_audit_log (
    workflow_instance_id,
    workflow_definition_id,
    user_id,
    user_name,
    action,
    record_id,
    record_table,
    fields_viewed,
    fields_edited,
    rules_applied,
    access_granted,
    denial_reason
  ) VALUES (
    _workflow_instance_id,
    v_workflow.workflow_id,
    _user_id,
    v_user.full_name,
    _action,
    COALESCE(_record_id, v_workflow.source_record_id::uuid),
    (SELECT secured_table FROM workflow_definitions WHERE id = v_workflow.workflow_id),
    _fields_viewed,
    _fields_edited,
    _rules_applied,
    _access_granted,
    _denial_reason
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


--
-- Name: prevent_audit_modification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_audit_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
END;
$$;


--
-- Name: protect_admin_permissions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_admin_permissions() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  admin_role_id UUID;
BEGIN
  -- Get the Admin role ID
  SELECT id INTO admin_role_id FROM roles WHERE role_name = 'Admin';
  
  IF TG_OP = 'DELETE' AND OLD.role_id = admin_role_id THEN
    RAISE EXCEPTION 'Cannot delete Admin role permissions';
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.role_id = admin_role_id THEN
    IF NEW.is_granted = false THEN
      RAISE EXCEPTION 'Cannot revoke Admin role permissions';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: test_data_policy(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_data_policy(_test_user_id uuid, _module_name text, _action text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result JSONB;
  module_record RECORD;
  user_profile RECORD;
  user_roles_list TEXT[];
  applied_scope_rules JSONB := '[]'::jsonb;
  applied_field_rules JSONB := '[]'::jsonb;
  user_overrides_list JSONB := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'Only administrators can test policies');
  END IF;

  SELECT full_name, email INTO user_profile FROM profiles WHERE id = _test_user_id;
  SELECT array_agg(role::TEXT) INTO user_roles_list FROM user_roles WHERE user_id = _test_user_id;
  SELECT * INTO module_record FROM app_modules WHERE name = _module_name AND is_enabled = true;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', dsr.id, 'target_table', dsr.target_table, 'role', r.role_name,
    'condition_type', dsr.condition_type, 'condition_value', dsr.condition_value,
    'can_view', dsr.can_view, 'can_edit', dsr.can_edit, 'can_delete', dsr.can_delete,
    'priority', dsr.priority, 'is_active', dsr.is_active
  )), '[]'::jsonb)
  INTO applied_scope_rules
  FROM data_scope_rules dsr
  JOIN roles r ON r.id = dsr.role_id
  WHERE dsr.module_id = module_record.id AND r.role_name = ANY(user_roles_list);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', fsr.id, 'field_name', fsr.field_name, 'role', r.role_name,
    'can_view', fsr.can_view, 'can_edit', fsr.can_edit,
    'masking_type', fsr.masking_type, 'priority', fsr.priority, 'is_active', fsr.is_active
  )), '[]'::jsonb)
  INTO applied_field_rules
  FROM field_security_rules fsr
  JOIN roles r ON r.id = fsr.role_id
  WHERE fsr.module_id = module_record.id AND r.role_name = ANY(user_roles_list);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', udo.id, 'override_type', udo.override_type, 'field_name', udo.field_name,
    'reason', udo.reason, 'expires_at', udo.expires_at, 'is_active', udo.is_active
  )), '[]'::jsonb)
  INTO user_overrides_list
  FROM user_data_overrides udo
  WHERE udo.user_id = _test_user_id AND udo.module_id = module_record.id;

  RETURN jsonb_build_object(
    'user', jsonb_build_object(
      'id', _test_user_id, 'name', user_profile.full_name, 'email', user_profile.email,
      'roles', user_roles_list, 'is_admin', public.is_admin(_test_user_id)
    ),
    'module', jsonb_build_object('id', module_record.id, 'name', module_record.name, 'display_name', module_record.display_name),
    'action', _action,
    'scope_rules', applied_scope_rules,
    'field_rules', applied_field_rules,
    'user_overrides', user_overrides_list,
    'effective_access', public.check_row_access(_test_user_id, _module_name, '', _action)
  );
END;
$$;


--
-- Name: test_workflow_policy(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_workflow_policy(_test_user_id uuid, _workflow_id uuid, _record_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user profiles;
  v_definition workflow_definitions;
  v_instance workflow_instances;
  v_module app_modules;
  v_task_access jsonb;
  v_field_rules jsonb;
  v_available_actions jsonb;
  v_result jsonb;
  v_is_admin boolean;
BEGIN
  -- Get user
  SELECT * INTO v_user FROM profiles WHERE id = _test_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Check if admin
  v_is_admin := is_admin(_test_user_id);
  
  -- Get workflow definition
  SELECT * INTO v_definition FROM workflow_definitions WHERE id = _workflow_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Workflow not found');
  END IF;
  
  -- Get secured module if set
  IF v_definition.secured_module_id IS NOT NULL THEN
    SELECT * INTO v_module FROM app_modules WHERE id = v_definition.secured_module_id;
  END IF;
  
  -- If record_id provided, find matching workflow instance
  IF _record_id IS NOT NULL THEN
    SELECT * INTO v_instance FROM workflow_instances 
    WHERE workflow_id = _workflow_id AND source_record_id = _record_id::text
    LIMIT 1;
  END IF;
  
  -- Build result
  v_result := jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_user.id,
      'name', v_user.full_name,
      'email', v_user.email,
      'is_admin', v_is_admin,
      'department_id', v_user.department_id
    ),
    'workflow', jsonb_build_object(
      'id', v_definition.id,
      'name', v_definition.name,
      'secured_module', v_module.display_name,
      'secured_table', v_definition.secured_table
    )
  );
  
  -- If no security binding, show full access
  IF v_definition.secured_table IS NULL OR v_definition.secured_table = '' THEN
    v_result := v_result || jsonb_build_object(
      'can_see_workflow', true,
      'reason', 'No security binding - full access',
      'visible_fields', '[]'::jsonb,
      'available_actions', '["approve","reject","query","send_back"]'::jsonb
    );
    RETURN v_result;
  END IF;
  
  -- Check if user is admin
  IF v_is_admin THEN
    v_result := v_result || jsonb_build_object(
      'can_see_workflow', true,
      'reason', 'Admin access',
      'visible_fields', '[]'::jsonb,
      'available_actions', '["approve","reject","query","send_back"]'::jsonb
    );
    RETURN v_result;
  END IF;
  
  -- Check row access
  v_task_access := check_row_access(_test_user_id, '', v_definition.secured_table, 'view');
  
  IF NOT COALESCE((v_task_access->>'allowed')::boolean, false) THEN
    v_result := v_result || jsonb_build_object(
      'can_see_workflow', false,
      'reason', COALESCE(v_task_access->>'reason', 'Access denied by scope rules'),
      'visible_fields', '[]'::jsonb,
      'available_actions', '[]'::jsonb,
      'scope_rules_applied', v_task_access->'rules_applied'
    );
    RETURN v_result;
  END IF;
  
  -- Get visible fields
  v_field_rules := get_visible_fields(_test_user_id, '', v_definition.secured_table);
  
  -- Check edit access for actions
  v_task_access := check_row_access(_test_user_id, '', v_definition.secured_table, 'edit');
  
  IF COALESCE((v_task_access->>'allowed')::boolean, false) THEN
    v_available_actions := '["approve","reject","query","send_back"]'::jsonb;
  ELSE
    v_available_actions := '["view"]'::jsonb;
  END IF;
  
  v_result := v_result || jsonb_build_object(
    'can_see_workflow', true,
    'reason', 'Access granted via data policies',
    'visible_fields', v_field_rules,
    'available_actions', v_available_actions,
    'scope_rules_applied', v_task_access->'rules_applied'
  );
  
  RETURN v_result;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: app_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    icon text,
    route text,
    parent_id uuid,
    sort_order integer DEFAULT 0,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);


--
-- Name: audit_interviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_id uuid,
    employee_name text,
    employee_ssn text,
    "position" text,
    interview_date date,
    interviewer_id uuid,
    wages_claimed numeric(10,2),
    weeks_worked integer,
    discrepancies text,
    notes text,
    signature_data text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_email text,
    user_name text,
    action_type text NOT NULL,
    module_name text,
    entity_type text,
    entity_id text,
    field_name text,
    old_value text,
    new_value text,
    ip_address text,
    user_agent text,
    session_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bema_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    description text,
    actor_id uuid,
    actor_name text,
    metadata jsonb,
    ip_address text,
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: bema_arrears_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_arrears_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    period text NOT NULL,
    period_type text,
    ss_owed numeric(12,2) DEFAULT 0,
    levy_owed numeric(12,2) DEFAULT 0,
    ei_owed numeric(12,2) DEFAULT 0,
    penalties numeric(12,2) DEFAULT 0,
    interest numeric(12,2) DEFAULT 0,
    amount_paid numeric(12,2) DEFAULT 0,
    outstanding_balance numeric(12,2) DEFAULT 0,
    is_estimated boolean DEFAULT false,
    payment_plan_id uuid,
    escalated_to_legal boolean DEFAULT false,
    escalation_date timestamp with time zone,
    due_date timestamp with time zone,
    last_payment_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_audit_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_audit_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_number text,
    audit_type public.bema_audit_type NOT NULL,
    status public.bema_audit_status DEFAULT 'assigned'::public.bema_audit_status,
    employer_id uuid NOT NULL,
    employer_name text,
    source_description text,
    complaint_details text,
    referral_source text,
    assigned_inspector_id uuid,
    assigned_at timestamp with time zone,
    due_date date,
    findings text,
    wage_books_reviewed boolean DEFAULT false,
    employees_interviewed integer DEFAULT 0,
    evidence_documents jsonb DEFAULT '[]'::jsonb,
    wage_book_images jsonb DEFAULT '[]'::jsonb,
    interview_notes jsonb DEFAULT '[]'::jsonb,
    outcome text,
    penalty_recommended numeric(12,2),
    penalty_approved numeric(12,2),
    escalated_to_legal boolean DEFAULT false,
    escalation_date timestamp with time zone,
    completed_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_c3_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_c3_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    c3_id uuid,
    line_number integer,
    employee_ssn text,
    employee_name text,
    weeks_worked integer,
    wages_paid numeric(10,2),
    holidays numeric(10,2) DEFAULT 0,
    overtime numeric(10,2) DEFAULT 0,
    ss_contribution numeric(10,2),
    levy_contribution numeric(10,2),
    ei_contribution numeric(10,2),
    under_age boolean DEFAULT false,
    over_age boolean DEFAULT false,
    invalid_ssn boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_c3_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_c3_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    c3_number text,
    employer_id uuid NOT NULL,
    filing_period text NOT NULL,
    status public.bema_c3_status DEFAULT 'draft'::public.bema_c3_status,
    submission_method text,
    total_employees integer DEFAULT 0,
    total_wages numeric(12,2) DEFAULT 0,
    total_ss_contribution numeric(12,2) DEFAULT 0,
    total_levy_contribution numeric(12,2) DEFAULT 0,
    total_ei_contribution numeric(12,2) DEFAULT 0,
    payment_received boolean DEFAULT false,
    payment_date timestamp with time zone,
    payment_amount numeric(12,2),
    payment_reference text,
    validation_errors jsonb DEFAULT '[]'::jsonb,
    validation_warnings jsonb DEFAULT '[]'::jsonb,
    query_raised boolean DEFAULT false,
    query_text text,
    query_response text,
    query_resolved_at timestamp with time zone,
    scanned_document_url text,
    attachments jsonb DEFAULT '[]'::jsonb,
    submitted_at timestamp with time zone,
    submitted_by uuid,
    validated_at timestamp with time zone,
    validated_by uuid,
    posted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_contributors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_contributors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_id uuid,
    contributor_type public.bema_registration_type NOT NULL,
    ssn text,
    full_name text NOT NULL,
    date_of_birth date,
    contribution_category public.bema_category NOT NULL,
    category_effective_date date,
    category_change_count integer DEFAULT 0,
    last_category_change date,
    active boolean DEFAULT true,
    enrollment_date date,
    cessation_date date,
    email text,
    phone text,
    address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_employee_interviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_employee_interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_id uuid,
    employee_name text,
    employee_ssn text,
    "position" text,
    interview_date date,
    interviewer_id uuid,
    wages_claimed numeric(10,2),
    weeks_worked integer,
    discrepancies text,
    notes text,
    signature_data text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_field_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_field_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspector_id uuid NOT NULL,
    activity_type public.bema_inspector_activity NOT NULL,
    activity_date date NOT NULL,
    employer_id uuid,
    employer_name text,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    purpose text,
    findings text,
    action_taken text,
    photos jsonb DEFAULT '[]'::jsonb,
    documents jsonb DEFAULT '[]'::jsonb,
    notice_type text,
    notice_served boolean DEFAULT false,
    employer_signature_data text,
    follow_up_required boolean DEFAULT false,
    follow_up_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_inspector_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_inspector_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspector_id uuid NOT NULL,
    zone_id uuid,
    is_primary boolean DEFAULT true,
    assigned_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_installments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_plan_id uuid,
    installment_number integer NOT NULL,
    due_date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    paid boolean DEFAULT false,
    paid_date timestamp with time zone,
    paid_amount numeric(12,2),
    payment_reference text,
    overdue boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_payment_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_payment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    total_debt numeric(12,2) NOT NULL,
    installment_amount numeric(12,2) NOT NULL,
    frequency text NOT NULL,
    number_of_installments integer NOT NULL,
    status public.bema_plan_status DEFAULT 'active'::public.bema_plan_status,
    start_date date NOT NULL,
    next_due_date date,
    agreement_document_url text,
    agreement_signed boolean DEFAULT false,
    signature_data text,
    signed_at timestamp with time zone,
    terms text,
    conditions jsonb,
    installments_paid integer DEFAULT 0,
    total_paid numeric(12,2) DEFAULT 0,
    broken_date timestamp with time zone,
    broken_reason text,
    escalated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_type public.bema_registration_type NOT NULL,
    status public.bema_registration_status DEFAULT 'pending'::public.bema_registration_status,
    employer_name text,
    business_type text,
    registration_number text,
    tax_id text,
    person_name text,
    ssn text,
    date_of_birth date,
    email text,
    phone text,
    address text,
    zone_id uuid,
    assigned_inspector_id uuid,
    assigned_at timestamp with time zone,
    documents jsonb DEFAULT '[]'::jsonb,
    notes text,
    education_completed boolean DEFAULT false,
    education_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    approved_at timestamp with time zone,
    approved_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_remittance_calendar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_remittance_calendar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contributor_id uuid,
    frequency text NOT NULL,
    next_due_date date NOT NULL,
    auto_generate_voucher boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    voucher_number text,
    contributor_id uuid,
    period_start date NOT NULL,
    period_end date NOT NULL,
    contribution_category public.bema_category NOT NULL,
    amount_due numeric(10,2) NOT NULL,
    is_prorated boolean DEFAULT false,
    proration_details text,
    paid boolean DEFAULT false,
    payment_date timestamp with time zone,
    payment_reference text,
    payment_method text,
    overdue boolean DEFAULT false,
    reminder_sent boolean DEFAULT false,
    reminder_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    generated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_waivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_waivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    waiver_number text,
    employer_id uuid,
    case_reference text,
    amount_requested numeric(12,2) NOT NULL,
    penalties_to_waive numeric(12,2),
    interest_to_waive numeric(12,2),
    justification text NOT NULL,
    supporting_documents jsonb DEFAULT '[]'::jsonb,
    status public.bema_waiver_status DEFAULT 'pending'::public.bema_waiver_status,
    requested_by uuid,
    requested_at timestamp with time zone DEFAULT now(),
    manager_reviewed boolean DEFAULT false,
    manager_id uuid,
    manager_decision text,
    manager_comments text,
    manager_reviewed_at timestamp with time zone,
    legal_reviewed boolean DEFAULT false,
    legal_officer_id uuid,
    legal_decision text,
    legal_comments text,
    legal_reviewed_at timestamp with time zone,
    director_approved boolean DEFAULT false,
    director_id uuid,
    director_decision text,
    director_comments text,
    director_approved_at timestamp with time zone,
    approved_amount numeric(12,2),
    conditions text,
    agreement_signed boolean DEFAULT false,
    agreement_document_url text,
    signature_data text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_weekly_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_weekly_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspector_id uuid NOT NULL,
    week_start_date date NOT NULL,
    week_end_date date NOT NULL,
    planned_activities jsonb,
    submitted boolean DEFAULT false,
    submitted_at timestamp with time zone,
    approved boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bema_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bema_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_name text NOT NULL,
    zone_code text,
    description text,
    parishes text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: c3_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.c3_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    c3_id uuid,
    line_number integer,
    employee_ssn text,
    employee_name text,
    weeks_worked integer,
    wages_paid numeric(10,2),
    holidays numeric(10,2) DEFAULT 0,
    overtime numeric(10,2) DEFAULT 0,
    ss_contribution numeric(10,2),
    levy_contribution numeric(10,2),
    ei_contribution numeric(10,2),
    under_age boolean DEFAULT false,
    over_age boolean DEFAULT false,
    invalid_ssn boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: c3_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.c3_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    c3_number text,
    employer_id uuid NOT NULL,
    filing_period text NOT NULL,
    status public.c3_filing_status DEFAULT 'draft'::public.c3_filing_status,
    submission_method text,
    total_employees integer DEFAULT 0,
    total_wages numeric(12,2) DEFAULT 0,
    total_ss_contribution numeric(12,2) DEFAULT 0,
    total_levy_contribution numeric(12,2) DEFAULT 0,
    total_ei_contribution numeric(12,2) DEFAULT 0,
    payment_received boolean DEFAULT false,
    payment_date timestamp with time zone,
    payment_amount numeric(12,2),
    payment_reference text,
    validation_errors jsonb DEFAULT '[]'::jsonb,
    validation_warnings jsonb DEFAULT '[]'::jsonb,
    query_raised boolean DEFAULT false,
    query_text text,
    query_response text,
    query_resolved_at timestamp with time zone,
    scanned_document_url text,
    attachments jsonb DEFAULT '[]'::jsonb,
    submitted_at timestamp with time zone,
    submitted_by uuid,
    validated_at timestamp with time zone,
    validated_by uuid,
    posted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: compliance_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    description text,
    actor_id uuid,
    actor_name text,
    metadata jsonb,
    ip_address text,
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: compliance_arrears; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_arrears (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    period text NOT NULL,
    period_type text,
    ss_owed numeric(12,2) DEFAULT 0,
    levy_owed numeric(12,2) DEFAULT 0,
    ei_owed numeric(12,2) DEFAULT 0,
    penalties numeric(12,2) DEFAULT 0,
    interest numeric(12,2) DEFAULT 0,
    amount_paid numeric(12,2) DEFAULT 0,
    outstanding_balance numeric(12,2) DEFAULT 0,
    is_estimated boolean DEFAULT false,
    payment_plan_id uuid,
    escalated_to_legal boolean DEFAULT false,
    escalation_date timestamp with time zone,
    due_date timestamp with time zone,
    last_payment_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: compliance_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_audits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_number text,
    audit_type public.audit_type NOT NULL,
    status public.audit_status DEFAULT 'assigned'::public.audit_status,
    employer_id uuid NOT NULL,
    employer_name text,
    source_description text,
    complaint_details text,
    referral_source text,
    assigned_inspector_id uuid,
    assigned_at timestamp with time zone,
    due_date date,
    findings text,
    wage_books_reviewed boolean DEFAULT false,
    employees_interviewed integer DEFAULT 0,
    evidence_documents jsonb DEFAULT '[]'::jsonb,
    wage_book_images jsonb DEFAULT '[]'::jsonb,
    interview_notes jsonb DEFAULT '[]'::jsonb,
    outcome text,
    penalty_recommended numeric(12,2),
    penalty_approved numeric(12,2),
    escalated_to_legal boolean DEFAULT false,
    escalation_date timestamp with time zone,
    completed_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: compliance_payment_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_payment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    total_debt numeric(12,2) NOT NULL,
    installment_amount numeric(12,2) NOT NULL,
    frequency text NOT NULL,
    number_of_installments integer NOT NULL,
    status public.payment_plan_status DEFAULT 'active'::public.payment_plan_status,
    start_date date NOT NULL,
    next_due_date date,
    agreement_document_url text,
    agreement_signed boolean DEFAULT false,
    signature_data text,
    signed_at timestamp with time zone,
    terms text,
    conditions jsonb,
    installments_paid integer DEFAULT 0,
    total_paid numeric(12,2) DEFAULT 0,
    broken_date timestamp with time zone,
    broken_reason text,
    escalated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: compliance_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_type public.compliance_registration_type NOT NULL,
    status public.compliance_registration_status DEFAULT 'pending'::public.compliance_registration_status,
    employer_name text,
    business_type text,
    registration_number text,
    tax_id text,
    person_name text,
    ssn text,
    date_of_birth date,
    email text,
    phone text,
    address text,
    zone_id uuid,
    assigned_inspector_id uuid,
    assigned_at timestamp with time zone,
    documents jsonb DEFAULT '[]'::jsonb,
    notes text,
    education_completed boolean DEFAULT false,
    education_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    approved_at timestamp with time zone,
    approved_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: compliance_waivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_waivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    waiver_number text,
    employer_id uuid,
    case_reference text,
    amount_requested numeric(12,2) NOT NULL,
    penalties_to_waive numeric(12,2),
    interest_to_waive numeric(12,2),
    justification text NOT NULL,
    supporting_documents jsonb DEFAULT '[]'::jsonb,
    status public.waiver_status DEFAULT 'pending'::public.waiver_status,
    requested_by uuid,
    requested_at timestamp with time zone DEFAULT now(),
    manager_reviewed boolean DEFAULT false,
    manager_id uuid,
    manager_decision text,
    manager_comments text,
    manager_reviewed_at timestamp with time zone,
    legal_reviewed boolean DEFAULT false,
    legal_officer_id uuid,
    legal_decision text,
    legal_comments text,
    legal_reviewed_at timestamp with time zone,
    director_approved boolean DEFAULT false,
    director_id uuid,
    director_decision text,
    director_comments text,
    director_approved_at timestamp with time zone,
    approved_amount numeric(12,2),
    conditions text,
    agreement_signed boolean DEFAULT false,
    agreement_document_url text,
    signature_data text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: contribution_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contribution_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    voucher_number text,
    contributor_id uuid,
    period_start date NOT NULL,
    period_end date NOT NULL,
    contribution_category public.contribution_category NOT NULL,
    amount_due numeric(10,2) NOT NULL,
    is_prorated boolean DEFAULT false,
    proration_details text,
    paid boolean DEFAULT false,
    payment_date timestamp with time zone,
    payment_reference text,
    payment_method text,
    overdue boolean DEFAULT false,
    reminder_sent boolean DEFAULT false,
    reminder_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    generated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: contributor_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contributor_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_id uuid,
    contributor_type public.compliance_registration_type NOT NULL,
    ssn text,
    full_name text NOT NULL,
    date_of_birth date,
    contribution_category public.contribution_category NOT NULL,
    category_effective_date date,
    category_change_count integer DEFAULT 0,
    last_category_change date,
    active boolean DEFAULT true,
    enrollment_date date,
    cessation_date date,
    email text,
    phone text,
    address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: data_policy_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_policy_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    module_name text,
    target_table text,
    record_id text,
    rules_applied jsonb,
    access_granted boolean,
    denial_reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: data_scope_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_scope_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid,
    target_table text NOT NULL,
    role_id uuid,
    condition_type public.data_scope_condition_type NOT NULL,
    condition_value text,
    custom_sql text,
    can_view boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    office_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    department_head_user_id uuid
);


--
-- Name: designation_hierarchy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.designation_hierarchy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    designation_id uuid NOT NULL,
    parent_designation_id uuid,
    level integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: designations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.designations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: field_security_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_security_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid,
    target_table text NOT NULL,
    field_name text NOT NULL,
    role_id uuid,
    can_view boolean DEFAULT true NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    masking_type public.field_masking_type DEFAULT 'none'::public.field_masking_type NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);


--
-- Name: in_app_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.in_app_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    link text,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: inspector_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspector_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspector_id uuid NOT NULL,
    activity_type public.inspector_activity_type NOT NULL,
    activity_date date NOT NULL,
    employer_id uuid,
    employer_name text,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    purpose text,
    findings text,
    action_taken text,
    photos jsonb DEFAULT '[]'::jsonb,
    documents jsonb DEFAULT '[]'::jsonb,
    notice_type text,
    notice_served boolean DEFAULT false,
    employer_signature_data text,
    follow_up_required boolean DEFAULT false,
    follow_up_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: inspector_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspector_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspector_id uuid NOT NULL,
    zone_id uuid,
    is_primary boolean DEFAULT true,
    assigned_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: inspector_weekly_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspector_weekly_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspector_id uuid NOT NULL,
    week_start_date date NOT NULL,
    week_end_date date NOT NULL,
    planned_activities jsonb,
    submitted boolean DEFAULT false,
    submitted_at timestamp with time zone,
    approved boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: inspector_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspector_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_name text NOT NULL,
    zone_code text,
    description text,
    parishes text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: legal_admin_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_admin_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    action text NOT NULL,
    user_id uuid,
    user_name text NOT NULL,
    before_data jsonb,
    after_data jsonb,
    changes jsonb,
    "timestamp" timestamp with time zone DEFAULT now(),
    ip_address text
);


--
-- Name: legal_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL,
    user_name text NOT NULL,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text NOT NULL,
    before jsonb,
    after jsonb,
    ip_address text
);


--
-- Name: legal_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number text NOT NULL,
    title text NOT NULL,
    case_type public.case_type NOT NULL,
    status public.case_status DEFAULT 'Draft'::public.case_status NOT NULL,
    stage text DEFAULT 'Intake'::text,
    priority public.priority_level DEFAULT 'Medium'::public.priority_level,
    confidential boolean DEFAULT false,
    source public.case_source NOT NULL,
    summary text,
    relief_sought text,
    assignee_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    filed_at timestamp with time zone,
    next_event_at timestamp with time zone,
    flags public.case_flag[] DEFAULT '{}'::public.case_flag[],
    related_case_ids uuid[] DEFAULT '{}'::uuid[],
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: legal_code_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_code_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    usage_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: legal_complainant_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_complainant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text,
    contact_person text,
    email text NOT NULL,
    phone text,
    default_officer text,
    default_priority text DEFAULT 'Medium'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: legal_document_saved_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_document_saved_searches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    filters jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_default boolean DEFAULT false
);


--
-- Name: legal_document_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_document_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    access_token text NOT NULL,
    watermark_text text,
    access_count integer DEFAULT 0,
    max_access_count integer,
    is_active boolean DEFAULT true
);


--
-- Name: legal_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    type public.document_type NOT NULL,
    name text NOT NULL,
    version integer DEFAULT 1,
    size text,
    file_path text,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    linked_entities text[] DEFAULT '{}'::text[],
    confidential boolean DEFAULT false,
    checksum text,
    url text,
    tags text[] DEFAULT '{}'::text[],
    ocr_text text,
    template_id uuid,
    esign_status text DEFAULT 'Not Sent'::text,
    esign_provider text,
    esign_envelope_id text,
    marked_as_evidence boolean DEFAULT false,
    CONSTRAINT legal_documents_esign_status_check CHECK ((esign_status = ANY (ARRAY['Not Sent'::text, 'Sent'::text, 'Partially Signed'::text, 'Fully Signed'::text, 'Declined'::text])))
);


--
-- Name: legal_hearings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_hearings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    type text NOT NULL,
    venue text NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    panel text[] DEFAULT '{}'::text[],
    agenda text,
    attendance jsonb,
    outcome text,
    minutes_doc_id uuid,
    recording_link text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: legal_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    config jsonb NOT NULL,
    is_active boolean DEFAULT true,
    last_sync timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: legal_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    number text,
    draft_html text,
    published_pdf_id uuid,
    findings text,
    directives text,
    compliance_due timestamp with time zone,
    status public.order_status DEFAULT 'Draft'::public.order_status,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: legal_parties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_parties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    role public.party_role NOT NULL,
    registry_ref text,
    registry_type text,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    representative_id uuid,
    service_status public.service_status DEFAULT 'Not Served'::public.service_status,
    service_method text,
    service_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: legal_penalties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_penalties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    order_id uuid,
    type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'XCD'::text,
    due_on timestamp with time zone NOT NULL,
    status public.penalty_status DEFAULT 'Pending'::public.penalty_status,
    payments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: legal_saved_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_saved_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    filters jsonb NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: legal_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    terms text NOT NULL,
    status public.settlement_status DEFAULT 'Proposed'::public.settlement_status,
    payment_plan jsonb,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: legal_sla_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_sla_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    case_type text,
    stage text,
    sla_days integer NOT NULL,
    escalation_queue text,
    notification_email boolean DEFAULT true,
    notification_sms boolean DEFAULT false,
    auto_assign_rule text,
    status text DEFAULT 'Draft'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: legal_status_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_status_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    allowed_roles text[] NOT NULL,
    requires_approval boolean DEFAULT false,
    conditions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: legal_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    owner_id uuid,
    priority public.priority_level DEFAULT 'Medium'::public.priority_level,
    due_on timestamp with time zone,
    status public.task_status DEFAULT 'Open'::public.task_status,
    recurrence text,
    checklist jsonb,
    related_entity text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: legal_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    description text,
    content text NOT NULL,
    merge_fields jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'Draft'::text,
    version integer DEFAULT 1,
    parent_template_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    published_at timestamp with time zone,
    published_by uuid
);


--
-- Name: legal_timeline_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_timeline_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    type text NOT NULL,
    actor_id uuid,
    actor_name text NOT NULL,
    description text NOT NULL,
    metadata jsonb
);


--
-- Name: mfa_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mfa_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.app_role NOT NULL,
    is_required boolean DEFAULT false,
    allowed_methods text[] DEFAULT ARRAY['email'::text, 'authenticator'::text],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: module_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    action_name text NOT NULL,
    display_name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: module_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid,
    table_name text NOT NULL,
    display_name text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid,
    channel public.notification_channel NOT NULL,
    recipient_user_id uuid,
    recipient_address text NOT NULL,
    subject text,
    title text,
    body text NOT NULL,
    status public.notification_status DEFAULT 'queued'::public.notification_status,
    failure_reason text,
    sent_at timestamp with time zone,
    triggered_by uuid,
    trigger_source text,
    ip_address text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel public.notification_channel NOT NULL,
    provider_name text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    channel public.notification_channel NOT NULL,
    subject text,
    title text,
    body text NOT NULL,
    placeholders jsonb,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    module_id uuid
);


--
-- Name: office_departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.office_departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    office_id uuid NOT NULL,
    department_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: office_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.office_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_name text NOT NULL,
    address text,
    city text,
    state text,
    country text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);


--
-- Name: password_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: password_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    min_length integer DEFAULT 8,
    require_uppercase boolean DEFAULT true,
    require_lowercase boolean DEFAULT true,
    require_numbers boolean DEFAULT true,
    require_special_chars boolean DEFAULT true,
    max_age_days integer DEFAULT 90,
    prevent_reuse_count integer DEFAULT 5,
    lockout_threshold integer DEFAULT 5,
    lockout_duration_minutes integer DEFAULT 30,
    session_timeout_minutes integer DEFAULT 60,
    idle_timeout_minutes integer DEFAULT 15,
    max_concurrent_sessions integer DEFAULT 3,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: payment_plan_installments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_plan_installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_plan_id uuid,
    installment_number integer NOT NULL,
    due_date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    paid boolean DEFAULT false,
    paid_date timestamp with time zone,
    paid_amount numeric(12,2),
    payment_reference text,
    overdue boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    title text,
    middle_name text,
    phone text,
    gender text,
    date_of_birth date,
    employee_code text,
    office_id uuid,
    department_id uuid,
    is_active boolean DEFAULT true,
    force_password_change boolean DEFAULT true,
    last_password_change timestamp with time zone,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    mfa_enabled boolean DEFAULT false,
    mfa_method text,
    last_login timestamp with time zone,
    updated_by uuid,
    first_name text,
    last_name text,
    designation_id uuid
);


--
-- Name: remittance_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.remittance_schedule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contributor_id uuid,
    frequency text NOT NULL,
    next_due_date date NOT NULL,
    auto_generate_voucher boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: role_hierarchy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_hierarchy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    parent_role_id uuid,
    level integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    action_id uuid NOT NULL,
    is_granted boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    role_id uuid NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    is_system_role boolean DEFAULT false NOT NULL,
    mfa_required boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);


--
-- Name: sample_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sample_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    applicant_comments text,
    status text DEFAULT 'Draft'::text NOT NULL,
    applicant_id uuid,
    applicant_name text,
    applicant_email text,
    rejection_reason text,
    workflow_instance_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone
);


--
-- Name: system_audit_trail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_audit_trail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id uuid,
    user_id uuid,
    session_id text,
    api_name text,
    module text,
    entity_type text,
    entity_id text,
    severity text DEFAULT 'info'::text,
    ip_address text,
    device_info text,
    payload_json jsonb,
    action text,
    before_value jsonb,
    after_value jsonb,
    user_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_business_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_business_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id uuid,
    user_id uuid,
    session_id text,
    api_name text,
    module text,
    entity_type text,
    entity_id text,
    severity text DEFAULT 'info'::text,
    ip_address text,
    device_info text,
    payload_json jsonb,
    action text,
    performed_by text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id uuid,
    user_id uuid,
    session_id text,
    api_name text,
    module text,
    entity_type text,
    entity_id text,
    severity text DEFAULT 'error'::text,
    ip_address text,
    device_info text,
    payload_json jsonb,
    error_type text,
    error_message text,
    stack_trace text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_integration_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_integration_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id uuid,
    user_id uuid,
    session_id text,
    api_name text,
    module text,
    entity_type text,
    entity_id text,
    severity text DEFAULT 'info'::text,
    ip_address text,
    device_info text,
    payload_json jsonb,
    external_service text,
    request_data jsonb,
    response_data jsonb,
    status text,
    retry_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_performance_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id uuid,
    user_id uuid,
    session_id text,
    api_name text,
    module text,
    entity_type text,
    entity_id text,
    severity text DEFAULT 'info'::text,
    ip_address text,
    device_info text,
    payload_json jsonb,
    execution_time_ms integer,
    memory_usage_mb numeric,
    cpu_usage_percent numeric,
    status text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_security_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_security_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id uuid,
    user_id uuid,
    session_id text,
    api_name text,
    module text,
    entity_type text,
    entity_id text,
    severity text DEFAULT 'info'::text,
    ip_address text,
    device_info text,
    payload_json jsonb,
    event_type text,
    user_name text,
    success boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_technical_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_technical_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id uuid,
    user_id uuid,
    session_id text,
    api_name text,
    module text,
    entity_type text,
    entity_id text,
    severity text DEFAULT 'info'::text,
    ip_address text,
    device_info text,
    payload_json jsonb,
    execution_time_ms integer,
    status text DEFAULT 'success'::text,
    request_payload jsonb,
    response_payload jsonb,
    headers jsonb,
    stack_trace text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_data_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_data_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    module_id uuid,
    target_table text NOT NULL,
    override_type text NOT NULL,
    field_name text,
    condition_sql text,
    record_ids uuid[],
    is_active boolean DEFAULT true NOT NULL,
    reason text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT user_data_overrides_override_type_check CHECK ((override_type = ANY (ARRAY['row_allow'::text, 'row_block'::text, 'field_allow'::text, 'field_block'::text])))
);


--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    channel public.notification_channel NOT NULL,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    notification_type text,
    email_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT false,
    push_enabled boolean DEFAULT false,
    in_app_enabled boolean DEFAULT true,
    preferred_channel text DEFAULT 'email'::text
);


--
-- Name: user_permission_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permission_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    module_id uuid NOT NULL,
    action_id uuid NOT NULL,
    is_granted boolean NOT NULL,
    override_reason text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_token text NOT NULL,
    ip_address text,
    user_agent text,
    device_info jsonb,
    last_activity timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_action_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_action_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_id uuid NOT NULL,
    notification_type text NOT NULL,
    template_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    process_type text NOT NULL,
    default_sla_hours integer DEFAULT 24,
    is_active boolean DEFAULT false,
    version integer DEFAULT 1,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    secured_module_id uuid,
    secured_table text
);


--
-- Name: workflow_execution_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_execution_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id uuid,
    user_id uuid,
    session_id text,
    api_name text,
    module text,
    entity_type text,
    entity_id text,
    severity text DEFAULT 'info'::text,
    ip_address text,
    device_info text,
    payload_json jsonb,
    workflow_id text,
    application_id text,
    current_step text,
    step_number integer,
    status text,
    step_history jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    workflow_name text NOT NULL,
    source_module text,
    source_record_id text,
    source_record_name text,
    current_step_id uuid,
    status public.workflow_instance_status DEFAULT 'Pending'::public.workflow_instance_status,
    started_by uuid,
    started_by_name text,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    due_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: workflow_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    step_id uuid,
    step_name text,
    user_id uuid,
    user_name text,
    action text NOT NULL,
    old_status text,
    new_status text,
    comments text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_security_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_security_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_instance_id uuid,
    workflow_definition_id uuid,
    user_id uuid,
    user_name text,
    action text NOT NULL,
    record_id uuid,
    record_table text,
    fields_viewed text[],
    fields_edited text[],
    rules_applied jsonb,
    access_granted boolean DEFAULT false NOT NULL,
    denial_reason text,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_step_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_step_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    step_id uuid NOT NULL,
    action_name text NOT NULL,
    action_type public.workflow_step_action_type DEFAULT 'Custom'::public.workflow_step_action_type NOT NULL,
    next_step_id uuid,
    is_final_action boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    notification_type text,
    notification_module_id uuid,
    notification_template_id uuid,
    next_step_type public.next_step_type DEFAULT 'next_step'::public.next_step_type,
    end_state public.workflow_end_state
);


--
-- Name: workflow_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    step_number integer NOT NULL,
    step_name text NOT NULL,
    assigned_role text,
    assigned_designation text,
    action_type text DEFAULT 'Review'::text NOT NULL,
    sla_hours integer DEFAULT 24,
    is_final_step boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    description text,
    approver_type text DEFAULT 'role'::text,
    approver_role_ids uuid[],
    approver_designation_ids uuid[],
    approver_user_ids uuid[],
    parallel_approval boolean DEFAULT false,
    required_approvals integer DEFAULT 1,
    auto_approve_on_timeout boolean DEFAULT false,
    has_condition boolean DEFAULT false,
    condition_expression jsonb,
    escalation_enabled boolean DEFAULT false,
    escalation_notification_type text,
    escalation_module_id uuid,
    escalation_template_id uuid,
    CONSTRAINT workflow_steps_approver_type_check CHECK ((approver_type = ANY (ARRAY['role'::text, 'designation'::text, 'specific_users'::text, 'department_head'::text, 'designation_hierarchy'::text])))
);


--
-- Name: workflow_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    step_id uuid NOT NULL,
    step_name text NOT NULL,
    assigned_to uuid,
    assigned_to_name text,
    assigned_role text,
    assigned_designation text,
    status public.workflow_task_status DEFAULT 'Pending'::public.workflow_task_status,
    due_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    action_taken text,
    comments text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_triggers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_triggers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid,
    action_name text NOT NULL,
    workflow_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_modules app_modules_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_modules
    ADD CONSTRAINT app_modules_name_key UNIQUE (name);


--
-- Name: app_modules app_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_modules
    ADD CONSTRAINT app_modules_pkey PRIMARY KEY (id);


--
-- Name: audit_interviews audit_interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_interviews
    ADD CONSTRAINT audit_interviews_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bema_activity_log bema_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_activity_log
    ADD CONSTRAINT bema_activity_log_pkey PRIMARY KEY (id);


--
-- Name: bema_arrears_ledger bema_arrears_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_arrears_ledger
    ADD CONSTRAINT bema_arrears_ledger_pkey PRIMARY KEY (id);


--
-- Name: bema_audit_cases bema_audit_cases_case_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_audit_cases
    ADD CONSTRAINT bema_audit_cases_case_number_key UNIQUE (case_number);


--
-- Name: bema_audit_cases bema_audit_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_audit_cases
    ADD CONSTRAINT bema_audit_cases_pkey PRIMARY KEY (id);


--
-- Name: bema_c3_line_items bema_c3_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_c3_line_items
    ADD CONSTRAINT bema_c3_line_items_pkey PRIMARY KEY (id);


--
-- Name: bema_c3_submissions bema_c3_submissions_c3_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_c3_submissions
    ADD CONSTRAINT bema_c3_submissions_c3_number_key UNIQUE (c3_number);


--
-- Name: bema_c3_submissions bema_c3_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_c3_submissions
    ADD CONSTRAINT bema_c3_submissions_pkey PRIMARY KEY (id);


--
-- Name: bema_contributors bema_contributors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_contributors
    ADD CONSTRAINT bema_contributors_pkey PRIMARY KEY (id);


--
-- Name: bema_contributors bema_contributors_ssn_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_contributors
    ADD CONSTRAINT bema_contributors_ssn_key UNIQUE (ssn);


--
-- Name: bema_employee_interviews bema_employee_interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_employee_interviews
    ADD CONSTRAINT bema_employee_interviews_pkey PRIMARY KEY (id);


--
-- Name: bema_field_activities bema_field_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_field_activities
    ADD CONSTRAINT bema_field_activities_pkey PRIMARY KEY (id);


--
-- Name: bema_inspector_assignments bema_inspector_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_inspector_assignments
    ADD CONSTRAINT bema_inspector_assignments_pkey PRIMARY KEY (id);


--
-- Name: bema_installments bema_installments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_installments
    ADD CONSTRAINT bema_installments_pkey PRIMARY KEY (id);


--
-- Name: bema_payment_plans bema_payment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_payment_plans
    ADD CONSTRAINT bema_payment_plans_pkey PRIMARY KEY (id);


--
-- Name: bema_registrations bema_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_registrations
    ADD CONSTRAINT bema_registrations_pkey PRIMARY KEY (id);


--
-- Name: bema_remittance_calendar bema_remittance_calendar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_remittance_calendar
    ADD CONSTRAINT bema_remittance_calendar_pkey PRIMARY KEY (id);


--
-- Name: bema_vouchers bema_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_vouchers
    ADD CONSTRAINT bema_vouchers_pkey PRIMARY KEY (id);


--
-- Name: bema_vouchers bema_vouchers_voucher_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_vouchers
    ADD CONSTRAINT bema_vouchers_voucher_number_key UNIQUE (voucher_number);


--
-- Name: bema_waivers bema_waivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_waivers
    ADD CONSTRAINT bema_waivers_pkey PRIMARY KEY (id);


--
-- Name: bema_waivers bema_waivers_waiver_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_waivers
    ADD CONSTRAINT bema_waivers_waiver_number_key UNIQUE (waiver_number);


--
-- Name: bema_weekly_plans bema_weekly_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_weekly_plans
    ADD CONSTRAINT bema_weekly_plans_pkey PRIMARY KEY (id);


--
-- Name: bema_zones bema_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_zones
    ADD CONSTRAINT bema_zones_pkey PRIMARY KEY (id);


--
-- Name: bema_zones bema_zones_zone_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_zones
    ADD CONSTRAINT bema_zones_zone_code_key UNIQUE (zone_code);


--
-- Name: c3_line_items c3_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c3_line_items
    ADD CONSTRAINT c3_line_items_pkey PRIMARY KEY (id);


--
-- Name: c3_submissions c3_submissions_c3_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c3_submissions
    ADD CONSTRAINT c3_submissions_c3_number_key UNIQUE (c3_number);


--
-- Name: c3_submissions c3_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c3_submissions
    ADD CONSTRAINT c3_submissions_pkey PRIMARY KEY (id);


--
-- Name: compliance_activity_log compliance_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_activity_log
    ADD CONSTRAINT compliance_activity_log_pkey PRIMARY KEY (id);


--
-- Name: compliance_arrears compliance_arrears_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_arrears
    ADD CONSTRAINT compliance_arrears_pkey PRIMARY KEY (id);


--
-- Name: compliance_audits compliance_audits_case_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_audits
    ADD CONSTRAINT compliance_audits_case_number_key UNIQUE (case_number);


--
-- Name: compliance_audits compliance_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_audits
    ADD CONSTRAINT compliance_audits_pkey PRIMARY KEY (id);


--
-- Name: compliance_payment_plans compliance_payment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_payment_plans
    ADD CONSTRAINT compliance_payment_plans_pkey PRIMARY KEY (id);


--
-- Name: compliance_registrations compliance_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_registrations
    ADD CONSTRAINT compliance_registrations_pkey PRIMARY KEY (id);


--
-- Name: compliance_waivers compliance_waivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_waivers
    ADD CONSTRAINT compliance_waivers_pkey PRIMARY KEY (id);


--
-- Name: compliance_waivers compliance_waivers_waiver_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_waivers
    ADD CONSTRAINT compliance_waivers_waiver_number_key UNIQUE (waiver_number);


--
-- Name: contribution_vouchers contribution_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_vouchers
    ADD CONSTRAINT contribution_vouchers_pkey PRIMARY KEY (id);


--
-- Name: contribution_vouchers contribution_vouchers_voucher_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_vouchers
    ADD CONSTRAINT contribution_vouchers_voucher_number_key UNIQUE (voucher_number);


--
-- Name: contributor_profiles contributor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributor_profiles
    ADD CONSTRAINT contributor_profiles_pkey PRIMARY KEY (id);


--
-- Name: contributor_profiles contributor_profiles_ssn_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributor_profiles
    ADD CONSTRAINT contributor_profiles_ssn_key UNIQUE (ssn);


--
-- Name: data_policy_audit_log data_policy_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_policy_audit_log
    ADD CONSTRAINT data_policy_audit_log_pkey PRIMARY KEY (id);


--
-- Name: data_scope_rules data_scope_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_scope_rules
    ADD CONSTRAINT data_scope_rules_pkey PRIMARY KEY (id);


--
-- Name: departments departments_office_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_office_id_name_key UNIQUE (office_id, name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: designation_hierarchy designation_hierarchy_designation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designation_hierarchy
    ADD CONSTRAINT designation_hierarchy_designation_id_key UNIQUE (designation_id);


--
-- Name: designation_hierarchy designation_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designation_hierarchy
    ADD CONSTRAINT designation_hierarchy_pkey PRIMARY KEY (id);


--
-- Name: designations designations_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_name_key UNIQUE (name);


--
-- Name: designations designations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_pkey PRIMARY KEY (id);


--
-- Name: field_security_rules field_security_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_security_rules
    ADD CONSTRAINT field_security_rules_pkey PRIMARY KEY (id);


--
-- Name: in_app_notifications in_app_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_pkey PRIMARY KEY (id);


--
-- Name: inspector_activities inspector_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspector_activities
    ADD CONSTRAINT inspector_activities_pkey PRIMARY KEY (id);


--
-- Name: inspector_assignments inspector_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspector_assignments
    ADD CONSTRAINT inspector_assignments_pkey PRIMARY KEY (id);


--
-- Name: inspector_weekly_plans inspector_weekly_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspector_weekly_plans
    ADD CONSTRAINT inspector_weekly_plans_pkey PRIMARY KEY (id);


--
-- Name: inspector_zones inspector_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspector_zones
    ADD CONSTRAINT inspector_zones_pkey PRIMARY KEY (id);


--
-- Name: inspector_zones inspector_zones_zone_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspector_zones
    ADD CONSTRAINT inspector_zones_zone_code_key UNIQUE (zone_code);


--
-- Name: legal_admin_audit legal_admin_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_admin_audit
    ADD CONSTRAINT legal_admin_audit_pkey PRIMARY KEY (id);


--
-- Name: legal_audit_log legal_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_audit_log
    ADD CONSTRAINT legal_audit_log_pkey PRIMARY KEY (id);


--
-- Name: legal_cases legal_cases_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_cases
    ADD CONSTRAINT legal_cases_number_key UNIQUE (number);


--
-- Name: legal_cases legal_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_cases
    ADD CONSTRAINT legal_cases_pkey PRIMARY KEY (id);


--
-- Name: legal_code_sets legal_code_sets_category_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_code_sets
    ADD CONSTRAINT legal_code_sets_category_code_key UNIQUE (category, code);


--
-- Name: legal_code_sets legal_code_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_code_sets
    ADD CONSTRAINT legal_code_sets_pkey PRIMARY KEY (id);


--
-- Name: legal_complainant_settings legal_complainant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_complainant_settings
    ADD CONSTRAINT legal_complainant_settings_pkey PRIMARY KEY (id);


--
-- Name: legal_document_saved_searches legal_document_saved_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_document_saved_searches
    ADD CONSTRAINT legal_document_saved_searches_pkey PRIMARY KEY (id);


--
-- Name: legal_document_shares legal_document_shares_access_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_document_shares
    ADD CONSTRAINT legal_document_shares_access_token_key UNIQUE (access_token);


--
-- Name: legal_document_shares legal_document_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_document_shares
    ADD CONSTRAINT legal_document_shares_pkey PRIMARY KEY (id);


--
-- Name: legal_documents legal_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_documents
    ADD CONSTRAINT legal_documents_pkey PRIMARY KEY (id);


--
-- Name: legal_hearings legal_hearings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_hearings
    ADD CONSTRAINT legal_hearings_pkey PRIMARY KEY (id);


--
-- Name: legal_integrations legal_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_integrations
    ADD CONSTRAINT legal_integrations_pkey PRIMARY KEY (id);


--
-- Name: legal_orders legal_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_orders
    ADD CONSTRAINT legal_orders_pkey PRIMARY KEY (id);


--
-- Name: legal_parties legal_parties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_parties
    ADD CONSTRAINT legal_parties_pkey PRIMARY KEY (id);


--
-- Name: legal_penalties legal_penalties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_penalties
    ADD CONSTRAINT legal_penalties_pkey PRIMARY KEY (id);


--
-- Name: legal_saved_views legal_saved_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_saved_views
    ADD CONSTRAINT legal_saved_views_pkey PRIMARY KEY (id);


--
-- Name: legal_settlements legal_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_settlements
    ADD CONSTRAINT legal_settlements_pkey PRIMARY KEY (id);


--
-- Name: legal_sla_rules legal_sla_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_sla_rules
    ADD CONSTRAINT legal_sla_rules_pkey PRIMARY KEY (id);


--
-- Name: legal_status_transitions legal_status_transitions_from_status_to_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_status_transitions
    ADD CONSTRAINT legal_status_transitions_from_status_to_status_key UNIQUE (from_status, to_status);


--
-- Name: legal_status_transitions legal_status_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_status_transitions
    ADD CONSTRAINT legal_status_transitions_pkey PRIMARY KEY (id);


--
-- Name: legal_tasks legal_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_tasks
    ADD CONSTRAINT legal_tasks_pkey PRIMARY KEY (id);


--
-- Name: legal_templates legal_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_templates
    ADD CONSTRAINT legal_templates_pkey PRIMARY KEY (id);


--
-- Name: legal_timeline_events legal_timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_timeline_events
    ADD CONSTRAINT legal_timeline_events_pkey PRIMARY KEY (id);


--
-- Name: mfa_config mfa_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_config
    ADD CONSTRAINT mfa_config_pkey PRIMARY KEY (id);


--
-- Name: mfa_config mfa_config_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_config
    ADD CONSTRAINT mfa_config_role_key UNIQUE (role);


--
-- Name: module_actions module_actions_module_id_action_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_actions
    ADD CONSTRAINT module_actions_module_id_action_name_key UNIQUE (module_id, action_name);


--
-- Name: module_actions module_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_actions
    ADD CONSTRAINT module_actions_pkey PRIMARY KEY (id);


--
-- Name: module_tables module_tables_module_id_table_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_tables
    ADD CONSTRAINT module_tables_module_id_table_name_key UNIQUE (module_id, table_name);


--
-- Name: module_tables module_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_tables
    ADD CONSTRAINT module_tables_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: notification_providers notification_providers_channel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_providers
    ADD CONSTRAINT notification_providers_channel_key UNIQUE (channel);


--
-- Name: notification_providers notification_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_providers
    ADD CONSTRAINT notification_providers_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_name_key UNIQUE (name);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: office_departments office_departments_office_id_department_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office_departments
    ADD CONSTRAINT office_departments_office_id_department_id_key UNIQUE (office_id, department_id);


--
-- Name: office_departments office_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office_departments
    ADD CONSTRAINT office_departments_pkey PRIMARY KEY (id);


--
-- Name: office_locations office_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office_locations
    ADD CONSTRAINT office_locations_pkey PRIMARY KEY (id);


--
-- Name: password_history password_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);


--
-- Name: password_policies password_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_policies
    ADD CONSTRAINT password_policies_pkey PRIMARY KEY (id);


--
-- Name: payment_plan_installments payment_plan_installments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_plan_installments
    ADD CONSTRAINT payment_plan_installments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: remittance_schedule remittance_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remittance_schedule
    ADD CONSTRAINT remittance_schedule_pkey PRIMARY KEY (id);


--
-- Name: role_hierarchy role_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_pkey PRIMARY KEY (id);


--
-- Name: role_hierarchy role_hierarchy_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_role_id_key UNIQUE (role_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: roles roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);


--
-- Name: sample_applications sample_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_applications
    ADD CONSTRAINT sample_applications_pkey PRIMARY KEY (id);


--
-- Name: system_audit_trail system_audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_audit_trail
    ADD CONSTRAINT system_audit_trail_pkey PRIMARY KEY (id);


--
-- Name: system_business_events system_business_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_business_events
    ADD CONSTRAINT system_business_events_pkey PRIMARY KEY (id);


--
-- Name: system_error_logs system_error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_error_logs
    ADD CONSTRAINT system_error_logs_pkey PRIMARY KEY (id);


--
-- Name: system_integration_logs system_integration_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_integration_logs
    ADD CONSTRAINT system_integration_logs_pkey PRIMARY KEY (id);


--
-- Name: system_performance_metrics system_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_performance_metrics
    ADD CONSTRAINT system_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: system_security_logs system_security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_security_logs
    ADD CONSTRAINT system_security_logs_pkey PRIMARY KEY (id);


--
-- Name: system_technical_logs system_technical_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_technical_logs
    ADD CONSTRAINT system_technical_logs_pkey PRIMARY KEY (id);


--
-- Name: workflow_steps unique_step_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT unique_step_order UNIQUE (workflow_id, step_number);


--
-- Name: workflow_triggers unique_trigger; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_triggers
    ADD CONSTRAINT unique_trigger UNIQUE (module_id, action_name);


--
-- Name: workflow_definitions unique_workflow_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_definitions
    ADD CONSTRAINT unique_workflow_name UNIQUE (name);


--
-- Name: user_data_overrides user_data_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_data_overrides
    ADD CONSTRAINT user_data_overrides_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_user_id_channel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_channel_key UNIQUE (user_id, channel);


--
-- Name: user_notification_preferences user_notification_preferences_user_type_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_type_unique UNIQUE (user_id, notification_type);


--
-- Name: user_permission_overrides user_permission_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_pkey PRIMARY KEY (id);


--
-- Name: user_permission_overrides user_permission_overrides_user_id_module_id_action_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_user_id_module_id_action_id_key UNIQUE (user_id, module_id, action_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: workflow_action_notifications workflow_action_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_action_notifications
    ADD CONSTRAINT workflow_action_notifications_pkey PRIMARY KEY (id);


--
-- Name: workflow_definitions workflow_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_pkey PRIMARY KEY (id);


--
-- Name: workflow_execution_logs workflow_execution_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_execution_logs
    ADD CONSTRAINT workflow_execution_logs_pkey PRIMARY KEY (id);


--
-- Name: workflow_instances workflow_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_pkey PRIMARY KEY (id);


--
-- Name: workflow_logs workflow_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_logs
    ADD CONSTRAINT workflow_logs_pkey PRIMARY KEY (id);


--
-- Name: workflow_security_audit_log workflow_security_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_security_audit_log
    ADD CONSTRAINT workflow_security_audit_log_pkey PRIMARY KEY (id);


--
-- Name: workflow_step_actions workflow_step_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_step_actions
    ADD CONSTRAINT workflow_step_actions_pkey PRIMARY KEY (id);


--
-- Name: workflow_steps workflow_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_pkey PRIMARY KEY (id);


--
-- Name: workflow_tasks workflow_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_tasks
    ADD CONSTRAINT workflow_tasks_pkey PRIMARY KEY (id);


--
-- Name: workflow_triggers workflow_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_triggers
    ADD CONSTRAINT workflow_triggers_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_entity ON public.compliance_activity_log USING btree (entity_type, entity_id);


--
-- Name: idx_activity_log_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_timestamp ON public.compliance_activity_log USING btree ("timestamp" DESC);


--
-- Name: idx_audit_logs_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action_type ON public.audit_logs USING btree (action_type);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_trail_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_trail_timestamp ON public.system_audit_trail USING btree ("timestamp" DESC);


--
-- Name: idx_audit_trail_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_trail_user ON public.system_audit_trail USING btree (user_id);


--
-- Name: idx_bema_activities_inspector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bema_activities_inspector ON public.bema_field_activities USING btree (inspector_id);


--
-- Name: idx_bema_arrears_employer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bema_arrears_employer ON public.bema_arrears_ledger USING btree (employer_id);


--
-- Name: idx_bema_audits_employer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bema_audits_employer ON public.bema_audit_cases USING btree (employer_id);


--
-- Name: idx_bema_audits_inspector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bema_audits_inspector ON public.bema_audit_cases USING btree (assigned_inspector_id);


--
-- Name: idx_bema_c3_employer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bema_c3_employer ON public.bema_c3_submissions USING btree (employer_id);


--
-- Name: idx_bema_c3_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bema_c3_period ON public.bema_c3_submissions USING btree (filing_period);


--
-- Name: idx_bema_c3_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bema_c3_status ON public.bema_c3_submissions USING btree (status);


--
-- Name: idx_bema_contributors_ssn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bema_contributors_ssn ON public.bema_contributors USING btree (ssn);


--
-- Name: idx_bema_registrations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bema_registrations_status ON public.bema_registrations USING btree (status);


--
-- Name: idx_bema_registrations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bema_registrations_type ON public.bema_registrations USING btree (registration_type);


--
-- Name: idx_bema_vouchers_contributor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bema_vouchers_contributor ON public.bema_vouchers USING btree (contributor_id);


--
-- Name: idx_business_events_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_events_module ON public.system_business_events USING btree (module);


--
-- Name: idx_business_events_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_events_timestamp ON public.system_business_events USING btree ("timestamp" DESC);


--
-- Name: idx_c3_line_items_c3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c3_line_items_c3 ON public.c3_line_items USING btree (c3_id);


--
-- Name: idx_c3_line_items_ssn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c3_line_items_ssn ON public.c3_line_items USING btree (employee_ssn);


--
-- Name: idx_c3_submissions_employer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c3_submissions_employer ON public.c3_submissions USING btree (employer_id);


--
-- Name: idx_c3_submissions_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c3_submissions_period ON public.c3_submissions USING btree (filing_period);


--
-- Name: idx_c3_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c3_submissions_status ON public.c3_submissions USING btree (status);


--
-- Name: idx_compliance_arrears_employer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_arrears_employer ON public.compliance_arrears USING btree (employer_id);


--
-- Name: idx_compliance_arrears_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_arrears_period ON public.compliance_arrears USING btree (period);


--
-- Name: idx_compliance_audits_employer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_audits_employer ON public.compliance_audits USING btree (employer_id);


--
-- Name: idx_compliance_audits_inspector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_audits_inspector ON public.compliance_audits USING btree (assigned_inspector_id);


--
-- Name: idx_compliance_audits_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_audits_status ON public.compliance_audits USING btree (status);


--
-- Name: idx_compliance_audits_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_audits_type ON public.compliance_audits USING btree (audit_type);


--
-- Name: idx_compliance_registrations_inspector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_registrations_inspector ON public.compliance_registrations USING btree (assigned_inspector_id);


--
-- Name: idx_compliance_registrations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_registrations_status ON public.compliance_registrations USING btree (status);


--
-- Name: idx_compliance_registrations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_registrations_type ON public.compliance_registrations USING btree (registration_type);


--
-- Name: idx_contribution_vouchers_contributor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contribution_vouchers_contributor ON public.contribution_vouchers USING btree (contributor_id);


--
-- Name: idx_contribution_vouchers_paid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contribution_vouchers_paid ON public.contribution_vouchers USING btree (paid);


--
-- Name: idx_contributor_profiles_ssn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributor_profiles_ssn ON public.contributor_profiles USING btree (ssn);


--
-- Name: idx_contributor_profiles_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributor_profiles_type ON public.contributor_profiles USING btree (contributor_type);


--
-- Name: idx_departments_head; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_head ON public.departments USING btree (department_head_user_id);


--
-- Name: idx_error_logs_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_severity ON public.system_error_logs USING btree (severity);


--
-- Name: idx_error_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_timestamp ON public.system_error_logs USING btree ("timestamp" DESC);


--
-- Name: idx_in_app_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_in_app_notifications_user ON public.in_app_notifications USING btree (user_id);


--
-- Name: idx_inspector_activities_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspector_activities_date ON public.inspector_activities USING btree (activity_date);


--
-- Name: idx_inspector_activities_inspector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspector_activities_inspector ON public.inspector_activities USING btree (inspector_id);


--
-- Name: idx_inspector_weekly_plans_inspector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspector_weekly_plans_inspector ON public.inspector_weekly_plans USING btree (inspector_id);


--
-- Name: idx_integration_logs_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_logs_service ON public.system_integration_logs USING btree (external_service);


--
-- Name: idx_integration_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_logs_timestamp ON public.system_integration_logs USING btree ("timestamp" DESC);


--
-- Name: idx_legal_document_shares_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_document_shares_token ON public.legal_document_shares USING btree (access_token);


--
-- Name: idx_legal_documents_esign_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_documents_esign_status ON public.legal_documents USING btree (esign_status);


--
-- Name: idx_legal_documents_ocr_text; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_documents_ocr_text ON public.legal_documents USING gin (to_tsvector('english'::regconfig, ocr_text));


--
-- Name: idx_legal_documents_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_documents_tags ON public.legal_documents USING gin (tags);


--
-- Name: idx_notification_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_status ON public.notification_logs USING btree (status);


--
-- Name: idx_notification_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_user ON public.notification_logs USING btree (recipient_user_id);


--
-- Name: idx_notification_templates_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_templates_module ON public.notification_templates USING btree (module_id);


--
-- Name: idx_payment_plans_employer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_plans_employer ON public.compliance_payment_plans USING btree (employer_id);


--
-- Name: idx_payment_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_plans_status ON public.compliance_payment_plans USING btree (status);


--
-- Name: idx_performance_metrics_api; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_metrics_api ON public.system_performance_metrics USING btree (api_name);


--
-- Name: idx_performance_metrics_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_metrics_timestamp ON public.system_performance_metrics USING btree ("timestamp" DESC);


--
-- Name: idx_security_logs_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_event ON public.system_security_logs USING btree (event_type);


--
-- Name: idx_security_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_timestamp ON public.system_security_logs USING btree ("timestamp" DESC);


--
-- Name: idx_technical_logs_api; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_technical_logs_api ON public.system_technical_logs USING btree (api_name);


--
-- Name: idx_technical_logs_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_technical_logs_correlation ON public.system_technical_logs USING btree (correlation_id);


--
-- Name: idx_technical_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_technical_logs_timestamp ON public.system_technical_logs USING btree ("timestamp" DESC);


--
-- Name: idx_user_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user ON public.user_sessions USING btree (user_id);


--
-- Name: idx_workflow_definitions_security; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_definitions_security ON public.workflow_definitions USING btree (secured_module_id, secured_table);


--
-- Name: idx_workflow_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_logs_timestamp ON public.workflow_execution_logs USING btree ("timestamp" DESC);


--
-- Name: idx_workflow_logs_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_logs_workflow ON public.workflow_execution_logs USING btree (workflow_id);


--
-- Name: idx_workflow_steps_approver_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_steps_approver_type ON public.workflow_steps USING btree (approver_type);


--
-- Name: idx_workflow_steps_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_steps_workflow ON public.workflow_steps USING btree (workflow_id);


--
-- Name: role_permissions_role_id_module_id_action_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX role_permissions_role_id_module_id_action_id_uidx ON public.role_permissions USING btree (role_id, module_id, action_id);


--
-- Name: role_permissions admin_permissions_protection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER admin_permissions_protection BEFORE DELETE OR UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.protect_admin_permissions();


--
-- Name: module_actions auto_admin_action_permission; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_admin_action_permission AFTER INSERT ON public.module_actions FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin_permission();


--
-- Name: legal_documents document_timeline_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER document_timeline_trigger AFTER INSERT OR UPDATE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION public.log_document_action();


--
-- Name: audit_logs prevent_audit_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_audit_delete BEFORE DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();


--
-- Name: audit_logs prevent_audit_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_audit_update BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();


--
-- Name: notification_logs prevent_notification_log_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_notification_log_delete BEFORE DELETE ON public.notification_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();


--
-- Name: app_modules update_app_modules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_app_modules_updated_at BEFORE UPDATE ON public.app_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_arrears_ledger update_bema_arrears_ledger_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_arrears_ledger_updated_at BEFORE UPDATE ON public.bema_arrears_ledger FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_audit_cases update_bema_audit_cases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_audit_cases_updated_at BEFORE UPDATE ON public.bema_audit_cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_c3_submissions update_bema_c3_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_c3_submissions_updated_at BEFORE UPDATE ON public.bema_c3_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_contributors update_bema_contributors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_contributors_updated_at BEFORE UPDATE ON public.bema_contributors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_field_activities update_bema_field_activities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_field_activities_updated_at BEFORE UPDATE ON public.bema_field_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_payment_plans update_bema_payment_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_payment_plans_updated_at BEFORE UPDATE ON public.bema_payment_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_registrations update_bema_registrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_registrations_updated_at BEFORE UPDATE ON public.bema_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_remittance_calendar update_bema_remittance_calendar_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_remittance_calendar_updated_at BEFORE UPDATE ON public.bema_remittance_calendar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_vouchers update_bema_vouchers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_vouchers_updated_at BEFORE UPDATE ON public.bema_vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_waivers update_bema_waivers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_waivers_updated_at BEFORE UPDATE ON public.bema_waivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_weekly_plans update_bema_weekly_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_weekly_plans_updated_at BEFORE UPDATE ON public.bema_weekly_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bema_zones update_bema_zones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bema_zones_updated_at BEFORE UPDATE ON public.bema_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: c3_submissions update_c3_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_c3_submissions_updated_at BEFORE UPDATE ON public.c3_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: compliance_arrears update_compliance_arrears_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_compliance_arrears_updated_at BEFORE UPDATE ON public.compliance_arrears FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: compliance_audits update_compliance_audits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_compliance_audits_updated_at BEFORE UPDATE ON public.compliance_audits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: compliance_payment_plans update_compliance_payment_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_compliance_payment_plans_updated_at BEFORE UPDATE ON public.compliance_payment_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: compliance_registrations update_compliance_registrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_compliance_registrations_updated_at BEFORE UPDATE ON public.compliance_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: compliance_waivers update_compliance_waivers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_compliance_waivers_updated_at BEFORE UPDATE ON public.compliance_waivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contribution_vouchers update_contribution_vouchers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contribution_vouchers_updated_at BEFORE UPDATE ON public.contribution_vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contributor_profiles update_contributor_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contributor_profiles_updated_at BEFORE UPDATE ON public.contributor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: departments update_departments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: designation_hierarchy update_designation_hierarchy_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_designation_hierarchy_updated_at BEFORE UPDATE ON public.designation_hierarchy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: designations update_designations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_designations_updated_at BEFORE UPDATE ON public.designations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inspector_activities update_inspector_activities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inspector_activities_updated_at BEFORE UPDATE ON public.inspector_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inspector_weekly_plans update_inspector_weekly_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inspector_weekly_plans_updated_at BEFORE UPDATE ON public.inspector_weekly_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inspector_zones update_inspector_zones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inspector_zones_updated_at BEFORE UPDATE ON public.inspector_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: legal_cases update_legal_cases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_legal_cases_updated_at BEFORE UPDATE ON public.legal_cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: legal_code_sets update_legal_code_sets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_legal_code_sets_updated_at BEFORE UPDATE ON public.legal_code_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: legal_complainant_settings update_legal_complainant_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_legal_complainant_settings_updated_at BEFORE UPDATE ON public.legal_complainant_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: legal_integrations update_legal_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_legal_integrations_updated_at BEFORE UPDATE ON public.legal_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: legal_sla_rules update_legal_sla_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_legal_sla_rules_updated_at BEFORE UPDATE ON public.legal_sla_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: legal_templates update_legal_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_legal_templates_updated_at BEFORE UPDATE ON public.legal_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_providers update_notification_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_providers_updated_at BEFORE UPDATE ON public.notification_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: office_locations update_office_locations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_office_locations_updated_at BEFORE UPDATE ON public.office_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: remittance_schedule update_remittance_schedule_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_remittance_schedule_updated_at BEFORE UPDATE ON public.remittance_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: role_hierarchy update_role_hierarchy_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_role_hierarchy_updated_at BEFORE UPDATE ON public.role_hierarchy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles update_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sample_applications update_sample_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sample_applications_updated_at BEFORE UPDATE ON public.sample_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_notification_preferences update_user_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_definitions update_workflow_definitions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON public.workflow_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_steps update_workflow_steps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON public.workflow_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_triggers update_workflow_triggers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflow_triggers_updated_at BEFORE UPDATE ON public.workflow_triggers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: app_modules app_modules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_modules
    ADD CONSTRAINT app_modules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: app_modules app_modules_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_modules
    ADD CONSTRAINT app_modules_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.app_modules(id);


--
-- Name: app_modules app_modules_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_modules
    ADD CONSTRAINT app_modules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: audit_interviews audit_interviews_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_interviews
    ADD CONSTRAINT audit_interviews_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.compliance_audits(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: bema_c3_line_items bema_c3_line_items_c3_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_c3_line_items
    ADD CONSTRAINT bema_c3_line_items_c3_id_fkey FOREIGN KEY (c3_id) REFERENCES public.bema_c3_submissions(id) ON DELETE CASCADE;


--
-- Name: bema_contributors bema_contributors_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_contributors
    ADD CONSTRAINT bema_contributors_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.bema_registrations(id);


--
-- Name: bema_employee_interviews bema_employee_interviews_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_employee_interviews
    ADD CONSTRAINT bema_employee_interviews_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.bema_audit_cases(id) ON DELETE CASCADE;


--
-- Name: bema_inspector_assignments bema_inspector_assignments_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_inspector_assignments
    ADD CONSTRAINT bema_inspector_assignments_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.bema_zones(id);


--
-- Name: bema_installments bema_installments_payment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_installments
    ADD CONSTRAINT bema_installments_payment_plan_id_fkey FOREIGN KEY (payment_plan_id) REFERENCES public.bema_payment_plans(id) ON DELETE CASCADE;


--
-- Name: bema_remittance_calendar bema_remittance_calendar_contributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_remittance_calendar
    ADD CONSTRAINT bema_remittance_calendar_contributor_id_fkey FOREIGN KEY (contributor_id) REFERENCES public.bema_contributors(id);


--
-- Name: bema_vouchers bema_vouchers_contributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bema_vouchers
    ADD CONSTRAINT bema_vouchers_contributor_id_fkey FOREIGN KEY (contributor_id) REFERENCES public.bema_contributors(id);


--
-- Name: c3_line_items c3_line_items_c3_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c3_line_items
    ADD CONSTRAINT c3_line_items_c3_id_fkey FOREIGN KEY (c3_id) REFERENCES public.c3_submissions(id) ON DELETE CASCADE;


--
-- Name: contribution_vouchers contribution_vouchers_contributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_vouchers
    ADD CONSTRAINT contribution_vouchers_contributor_id_fkey FOREIGN KEY (contributor_id) REFERENCES public.contributor_profiles(id);


--
-- Name: contributor_profiles contributor_profiles_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributor_profiles
    ADD CONSTRAINT contributor_profiles_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.compliance_registrations(id);


--
-- Name: data_policy_audit_log data_policy_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_policy_audit_log
    ADD CONSTRAINT data_policy_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: data_scope_rules data_scope_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_scope_rules
    ADD CONSTRAINT data_scope_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: data_scope_rules data_scope_rules_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_scope_rules
    ADD CONSTRAINT data_scope_rules_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.app_modules(id) ON DELETE CASCADE;


--
-- Name: data_scope_rules data_scope_rules_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_scope_rules
    ADD CONSTRAINT data_scope_rules_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: data_scope_rules data_scope_rules_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_scope_rules
    ADD CONSTRAINT data_scope_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: departments departments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: departments departments_department_head_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_department_head_user_id_fkey FOREIGN KEY (department_head_user_id) REFERENCES public.profiles(id);


--
-- Name: departments departments_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.office_locations(id) ON DELETE CASCADE;


--
-- Name: departments departments_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: designation_hierarchy designation_hierarchy_designation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designation_hierarchy
    ADD CONSTRAINT designation_hierarchy_designation_id_fkey FOREIGN KEY (designation_id) REFERENCES public.designations(id) ON DELETE CASCADE;


--
-- Name: designation_hierarchy designation_hierarchy_parent_designation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designation_hierarchy
    ADD CONSTRAINT designation_hierarchy_parent_designation_id_fkey FOREIGN KEY (parent_designation_id) REFERENCES public.designations(id) ON DELETE SET NULL;


--
-- Name: field_security_rules field_security_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_security_rules
    ADD CONSTRAINT field_security_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: field_security_rules field_security_rules_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_security_rules
    ADD CONSTRAINT field_security_rules_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.app_modules(id) ON DELETE CASCADE;


--
-- Name: field_security_rules field_security_rules_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_security_rules
    ADD CONSTRAINT field_security_rules_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: field_security_rules field_security_rules_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_security_rules
    ADD CONSTRAINT field_security_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: in_app_notifications in_app_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: inspector_assignments inspector_assignments_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspector_assignments
    ADD CONSTRAINT inspector_assignments_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.inspector_zones(id);


--
-- Name: legal_admin_audit legal_admin_audit_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_admin_audit
    ADD CONSTRAINT legal_admin_audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: legal_audit_log legal_audit_log_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_audit_log
    ADD CONSTRAINT legal_audit_log_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;


--
-- Name: legal_audit_log legal_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_audit_log
    ADD CONSTRAINT legal_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: legal_cases legal_cases_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_cases
    ADD CONSTRAINT legal_cases_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES auth.users(id);


--
-- Name: legal_cases legal_cases_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_cases
    ADD CONSTRAINT legal_cases_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: legal_code_sets legal_code_sets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_code_sets
    ADD CONSTRAINT legal_code_sets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: legal_complainant_settings legal_complainant_settings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_complainant_settings
    ADD CONSTRAINT legal_complainant_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: legal_document_shares legal_document_shares_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_document_shares
    ADD CONSTRAINT legal_document_shares_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.legal_documents(id) ON DELETE CASCADE;


--
-- Name: legal_documents legal_documents_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_documents
    ADD CONSTRAINT legal_documents_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;


--
-- Name: legal_documents legal_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_documents
    ADD CONSTRAINT legal_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: legal_hearings legal_hearings_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_hearings
    ADD CONSTRAINT legal_hearings_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;


--
-- Name: legal_hearings legal_hearings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_hearings
    ADD CONSTRAINT legal_hearings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: legal_integrations legal_integrations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_integrations
    ADD CONSTRAINT legal_integrations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: legal_orders legal_orders_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_orders
    ADD CONSTRAINT legal_orders_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;


--
-- Name: legal_orders legal_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_orders
    ADD CONSTRAINT legal_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: legal_parties legal_parties_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_parties
    ADD CONSTRAINT legal_parties_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;


--
-- Name: legal_parties legal_parties_representative_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_parties
    ADD CONSTRAINT legal_parties_representative_id_fkey FOREIGN KEY (representative_id) REFERENCES public.legal_parties(id);


--
-- Name: legal_penalties legal_penalties_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_penalties
    ADD CONSTRAINT legal_penalties_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;


--
-- Name: legal_penalties legal_penalties_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_penalties
    ADD CONSTRAINT legal_penalties_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.legal_orders(id);


--
-- Name: legal_saved_views legal_saved_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_saved_views
    ADD CONSTRAINT legal_saved_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: legal_settlements legal_settlements_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_settlements
    ADD CONSTRAINT legal_settlements_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;


--
-- Name: legal_settlements legal_settlements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_settlements
    ADD CONSTRAINT legal_settlements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: legal_sla_rules legal_sla_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_sla_rules
    ADD CONSTRAINT legal_sla_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: legal_tasks legal_tasks_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_tasks
    ADD CONSTRAINT legal_tasks_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;


--
-- Name: legal_tasks legal_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_tasks
    ADD CONSTRAINT legal_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: legal_tasks legal_tasks_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_tasks
    ADD CONSTRAINT legal_tasks_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);


--
-- Name: legal_templates legal_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_templates
    ADD CONSTRAINT legal_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: legal_templates legal_templates_parent_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_templates
    ADD CONSTRAINT legal_templates_parent_template_id_fkey FOREIGN KEY (parent_template_id) REFERENCES public.legal_templates(id);


--
-- Name: legal_templates legal_templates_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_templates
    ADD CONSTRAINT legal_templates_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id);


--
-- Name: legal_timeline_events legal_timeline_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_timeline_events
    ADD CONSTRAINT legal_timeline_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id);


--
-- Name: legal_timeline_events legal_timeline_events_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_timeline_events
    ADD CONSTRAINT legal_timeline_events_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;


--
-- Name: mfa_config mfa_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_config
    ADD CONSTRAINT mfa_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: module_actions module_actions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_actions
    ADD CONSTRAINT module_actions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.app_modules(id) ON DELETE CASCADE;


--
-- Name: module_tables module_tables_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_tables
    ADD CONSTRAINT module_tables_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.app_modules(id) ON DELETE CASCADE;


--
-- Name: notification_logs notification_logs_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id);


--
-- Name: notification_logs notification_logs_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.notification_templates(id);


--
-- Name: notification_logs notification_logs_triggered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES auth.users(id);


--
-- Name: notification_providers notification_providers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_providers
    ADD CONSTRAINT notification_providers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: notification_templates notification_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: notification_templates notification_templates_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.app_modules(id);


--
-- Name: notification_templates notification_templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: office_departments office_departments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office_departments
    ADD CONSTRAINT office_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: office_departments office_departments_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office_departments
    ADD CONSTRAINT office_departments_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.office_locations(id) ON DELETE CASCADE;


--
-- Name: office_locations office_locations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office_locations
    ADD CONSTRAINT office_locations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: office_locations office_locations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office_locations
    ADD CONSTRAINT office_locations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: password_history password_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: password_policies password_policies_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_policies
    ADD CONSTRAINT password_policies_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: payment_plan_installments payment_plan_installments_payment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_plan_installments
    ADD CONSTRAINT payment_plan_installments_payment_plan_id_fkey FOREIGN KEY (payment_plan_id) REFERENCES public.compliance_payment_plans(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: profiles profiles_designation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_designation_id_fkey FOREIGN KEY (designation_id) REFERENCES public.designations(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.office_locations(id);


--
-- Name: profiles profiles_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: remittance_schedule remittance_schedule_contributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remittance_schedule
    ADD CONSTRAINT remittance_schedule_contributor_id_fkey FOREIGN KEY (contributor_id) REFERENCES public.contributor_profiles(id);


--
-- Name: role_hierarchy role_hierarchy_parent_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_parent_role_id_fkey FOREIGN KEY (parent_role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- Name: role_hierarchy role_hierarchy_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.module_actions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: role_permissions role_permissions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.app_modules(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: sample_applications sample_applications_applicant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_applications
    ADD CONSTRAINT sample_applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES auth.users(id);


--
-- Name: user_data_overrides user_data_overrides_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_data_overrides
    ADD CONSTRAINT user_data_overrides_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: user_data_overrides user_data_overrides_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_data_overrides
    ADD CONSTRAINT user_data_overrides_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.app_modules(id) ON DELETE CASCADE;


--
-- Name: user_data_overrides user_data_overrides_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_data_overrides
    ADD CONSTRAINT user_data_overrides_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: user_data_overrides user_data_overrides_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_data_overrides
    ADD CONSTRAINT user_data_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_notification_preferences user_notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_permission_overrides user_permission_overrides_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.module_actions(id) ON DELETE CASCADE;


--
-- Name: user_permission_overrides user_permission_overrides_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: user_permission_overrides user_permission_overrides_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.app_modules(id) ON DELETE CASCADE;


--
-- Name: user_permission_overrides user_permission_overrides_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workflow_action_notifications workflow_action_notifications_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_action_notifications
    ADD CONSTRAINT workflow_action_notifications_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.workflow_step_actions(id) ON DELETE CASCADE;


--
-- Name: workflow_definitions workflow_definitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: workflow_definitions workflow_definitions_secured_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_secured_module_id_fkey FOREIGN KEY (secured_module_id) REFERENCES public.app_modules(id);


--
-- Name: workflow_instances workflow_instances_current_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_current_step_id_fkey FOREIGN KEY (current_step_id) REFERENCES public.workflow_steps(id);


--
-- Name: workflow_instances workflow_instances_started_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_started_by_fkey FOREIGN KEY (started_by) REFERENCES public.profiles(id);


--
-- Name: workflow_instances workflow_instances_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflow_definitions(id);


--
-- Name: workflow_logs workflow_logs_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_logs
    ADD CONSTRAINT workflow_logs_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.workflow_instances(id) ON DELETE CASCADE;


--
-- Name: workflow_logs workflow_logs_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_logs
    ADD CONSTRAINT workflow_logs_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.workflow_steps(id);


--
-- Name: workflow_logs workflow_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_logs
    ADD CONSTRAINT workflow_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: workflow_security_audit_log workflow_security_audit_log_workflow_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_security_audit_log
    ADD CONSTRAINT workflow_security_audit_log_workflow_definition_id_fkey FOREIGN KEY (workflow_definition_id) REFERENCES public.workflow_definitions(id);


--
-- Name: workflow_security_audit_log workflow_security_audit_log_workflow_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_security_audit_log
    ADD CONSTRAINT workflow_security_audit_log_workflow_instance_id_fkey FOREIGN KEY (workflow_instance_id) REFERENCES public.workflow_instances(id);


--
-- Name: workflow_step_actions workflow_step_actions_next_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_step_actions
    ADD CONSTRAINT workflow_step_actions_next_step_id_fkey FOREIGN KEY (next_step_id) REFERENCES public.workflow_steps(id) ON DELETE SET NULL;


--
-- Name: workflow_step_actions workflow_step_actions_notification_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_step_actions
    ADD CONSTRAINT workflow_step_actions_notification_module_id_fkey FOREIGN KEY (notification_module_id) REFERENCES public.app_modules(id);


--
-- Name: workflow_step_actions workflow_step_actions_notification_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_step_actions
    ADD CONSTRAINT workflow_step_actions_notification_template_id_fkey FOREIGN KEY (notification_template_id) REFERENCES public.notification_templates(id);


--
-- Name: workflow_step_actions workflow_step_actions_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_step_actions
    ADD CONSTRAINT workflow_step_actions_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.workflow_steps(id) ON DELETE CASCADE;


--
-- Name: workflow_steps workflow_steps_escalation_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_escalation_module_id_fkey FOREIGN KEY (escalation_module_id) REFERENCES public.app_modules(id);


--
-- Name: workflow_steps workflow_steps_escalation_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_escalation_template_id_fkey FOREIGN KEY (escalation_template_id) REFERENCES public.notification_templates(id);


--
-- Name: workflow_steps workflow_steps_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflow_definitions(id) ON DELETE CASCADE;


--
-- Name: workflow_tasks workflow_tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_tasks
    ADD CONSTRAINT workflow_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);


--
-- Name: workflow_tasks workflow_tasks_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_tasks
    ADD CONSTRAINT workflow_tasks_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.workflow_instances(id) ON DELETE CASCADE;


--
-- Name: workflow_tasks workflow_tasks_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_tasks
    ADD CONSTRAINT workflow_tasks_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.workflow_steps(id);


--
-- Name: workflow_triggers workflow_triggers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_triggers
    ADD CONSTRAINT workflow_triggers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: workflow_triggers workflow_triggers_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_triggers
    ADD CONSTRAINT workflow_triggers_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.app_modules(id);


--
-- Name: workflow_triggers workflow_triggers_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_triggers
    ADD CONSTRAINT workflow_triggers_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflow_definitions(id) ON DELETE CASCADE;


--
-- Name: app_modules Admins can delete app_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete app_modules" ON public.app_modules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: module_actions Admins can delete module_actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete module_actions" ON public.module_actions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: roles Admins can delete non-system roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete non-system roles" ON public.roles FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'Admin'::public.app_role) AND (NOT is_system_role)));


--
-- Name: role_permissions Admins can delete role_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete role_permissions" ON public.role_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: user_roles Admins can delete user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: app_modules Admins can insert app_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert app_modules" ON public.app_modules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: departments Admins can insert departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert departments" ON public.departments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: module_actions Admins can insert module_actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert module_actions" ON public.module_actions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: office_locations Admins can insert office_locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert office_locations" ON public.office_locations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: role_permissions Admins can insert role_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert role_permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: user_roles Admins can insert user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: legal_sla_rules Admins can manage SLA rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage SLA rules" ON public.legal_sla_rules USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: workflow_action_notifications Admins can manage action notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage action notifications" ON public.workflow_action_notifications TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: module_actions Admins can manage actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage actions" ON public.module_actions TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: legal_code_sets Admins can manage code sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage code sets" ON public.legal_code_sets USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: legal_complainant_settings Admins can manage complainant settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage complainant settings" ON public.legal_complainant_settings TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: data_scope_rules Admins can manage data scope rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage data scope rules" ON public.data_scope_rules TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: field_security_rules Admins can manage field security rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage field security rules" ON public.field_security_rules TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: legal_integrations Admins can manage integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage integrations" ON public.legal_integrations USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: module_tables Admins can manage module tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage module tables" ON public.module_tables TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: office_locations Admins can manage office locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage office locations" ON public.office_locations TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: notification_providers Admins can manage providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage providers" ON public.notification_providers TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: workflow_step_actions Admins can manage step actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage step actions" ON public.workflow_step_actions TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: legal_templates Admins can manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage templates" ON public.legal_templates USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: legal_status_transitions Admins can manage transitions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage transitions" ON public.legal_status_transitions USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: workflow_triggers Admins can manage triggers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage triggers" ON public.workflow_triggers TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: user_data_overrides Admins can manage user data overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage user data overrides" ON public.user_data_overrides TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: workflow_definitions Admins can manage workflow definitions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage workflow definitions" ON public.workflow_definitions TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: workflow_steps Admins can manage workflow steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage workflow steps" ON public.workflow_steps TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: app_modules Admins can update app_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update app_modules" ON public.app_modules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: departments Admins can update departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update departments" ON public.departments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: module_actions Admins can update module_actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update module_actions" ON public.module_actions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: office_locations Admins can update office_locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update office_locations" ON public.office_locations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: system_audit_trail Admins can view audit trail; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit trail" ON public.system_audit_trail FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: system_business_events Admins can view business events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view business events" ON public.system_business_events FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: system_error_logs Admins can view error logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view error logs" ON public.system_error_logs FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: system_integration_logs Admins can view integration logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view integration logs" ON public.system_integration_logs FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: system_performance_metrics Admins can view performance metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view performance metrics" ON public.system_performance_metrics FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: data_policy_audit_log Admins can view policy audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view policy audit log" ON public.data_policy_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: system_security_logs Admins can view security logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view security logs" ON public.system_security_logs FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: system_technical_logs Admins can view technical logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view technical logs" ON public.system_technical_logs FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: workflow_execution_logs Admins can view workflow logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view workflow logs" ON public.workflow_execution_logs FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: workflow_security_audit_log Admins can view workflow security audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view workflow security audit logs" ON public.workflow_security_audit_log FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: module_actions Anyone can view enabled actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view enabled actions" ON public.module_actions FOR SELECT TO authenticated USING (((is_enabled = true) OR public.has_role(auth.uid(), 'Admin'::public.app_role)));


--
-- Name: app_modules Anyone can view enabled modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view enabled modules" ON public.app_modules FOR SELECT TO authenticated USING (((is_enabled = true) OR public.has_role(auth.uid(), 'Admin'::public.app_role)));


--
-- Name: roles Anyone can view roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view roles" ON public.roles FOR SELECT TO authenticated USING (true);


--
-- Name: sample_applications Applicants can update draft applications or resubmit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Applicants can update draft applications or resubmit" ON public.sample_applications FOR UPDATE USING ((((auth.uid() = applicant_id) AND ((status = 'Draft'::text) OR (status = 'More Info Requested'::text))) OR public.has_permission(auth.uid(), 'sample_application'::text, 'edit'::text)));


--
-- Name: system_audit_trail Authenticated can insert audit trail; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert audit trail" ON public.system_audit_trail FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: system_business_events Authenticated can insert business events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert business events" ON public.system_business_events FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: system_error_logs Authenticated can insert error logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert error logs" ON public.system_error_logs FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: system_integration_logs Authenticated can insert integration logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert integration logs" ON public.system_integration_logs FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: system_performance_metrics Authenticated can insert performance metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert performance metrics" ON public.system_performance_metrics FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: system_security_logs Authenticated can insert security logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert security logs" ON public.system_security_logs FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: system_technical_logs Authenticated can insert technical logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert technical logs" ON public.system_technical_logs FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: workflow_execution_logs Authenticated can insert workflow logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert workflow logs" ON public.workflow_execution_logs FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: app_modules Authenticated can view app_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view app_modules" ON public.app_modules FOR SELECT TO authenticated USING (true);


--
-- Name: module_actions Authenticated can view module_actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view module_actions" ON public.module_actions FOR SELECT TO authenticated USING (true);


--
-- Name: role_permissions Authenticated can view role_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: workflow_instances Authenticated users can create workflow instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create workflow instances" ON public.workflow_instances FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: profiles Authenticated users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Authenticated users can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (((auth.uid() = id) OR public.has_role(auth.uid(), 'Admin'::public.app_role)));


--
-- Name: workflow_instances Authenticated users can update their workflow instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update their workflow instances" ON public.workflow_instances FOR UPDATE TO authenticated USING (true);


--
-- Name: workflow_action_notifications Authenticated users can view action notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view action notifications" ON public.workflow_action_notifications FOR SELECT TO authenticated USING (true);


--
-- Name: departments Authenticated users can view departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);


--
-- Name: workflow_logs Authenticated users can view logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view logs" ON public.workflow_logs FOR SELECT TO authenticated USING (true);


--
-- Name: office_locations Authenticated users can view office_locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view office_locations" ON public.office_locations FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Authenticated users can view profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: notification_providers Authenticated users can view providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view providers" ON public.notification_providers FOR SELECT TO authenticated USING (true);


--
-- Name: user_roles Authenticated users can view roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);


--
-- Name: workflow_step_actions Authenticated users can view step actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view step actions" ON public.workflow_step_actions FOR SELECT TO authenticated USING (true);


--
-- Name: workflow_triggers Authenticated users can view triggers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view triggers" ON public.workflow_triggers FOR SELECT TO authenticated USING (true);


--
-- Name: workflow_definitions Authenticated users can view workflow definitions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view workflow definitions" ON public.workflow_definitions FOR SELECT TO authenticated USING (true);


--
-- Name: workflow_instances Authenticated users can view workflow instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view workflow instances" ON public.workflow_instances FOR SELECT TO authenticated USING (true);


--
-- Name: workflow_steps Authenticated users can view workflow steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view workflow steps" ON public.workflow_steps FOR SELECT TO authenticated USING (true);


--
-- Name: legal_cases Authorized users can create cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can create cases" ON public.legal_cases FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['Clerk'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]));


--
-- Name: legal_document_shares Authorized users can create shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can create shares" ON public.legal_document_shares FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]));


--
-- Name: legal_orders Authorized users can create/update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can create/update orders" ON public.legal_orders FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]));


--
-- Name: legal_documents Authorized users can manage documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can manage documents" ON public.legal_documents TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['Clerk'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]));


--
-- Name: legal_hearings Authorized users can manage hearings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can manage hearings" ON public.legal_hearings TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]));


--
-- Name: legal_parties Authorized users can manage parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can manage parties" ON public.legal_parties TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['Clerk'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]));


--
-- Name: legal_tasks Authorized users can manage tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can manage tasks" ON public.legal_tasks TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['Clerk'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]));


--
-- Name: legal_cases Authorized users can update cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can update cases" ON public.legal_cases FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['Clerk'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]));


--
-- Name: legal_orders Authorized users can update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can update orders" ON public.legal_orders FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]));


--
-- Name: legal_document_shares Authorized users can update shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can update shares" ON public.legal_document_shares FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]));


--
-- Name: legal_document_shares Authorized users can view shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can view shares" ON public.legal_document_shares FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['Clerk'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]));


--
-- Name: compliance_activity_log Compliance staff can view activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff can view activity log" ON public.compliance_activity_log FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: audit_interviews Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.audit_interviews USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: c3_line_items Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.c3_line_items USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: c3_submissions Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.c3_submissions USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: compliance_arrears Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.compliance_arrears USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: compliance_audits Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.compliance_audits USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: compliance_payment_plans Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.compliance_payment_plans USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: compliance_registrations Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.compliance_registrations USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: compliance_waivers Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.compliance_waivers USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: contribution_vouchers Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.contribution_vouchers USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: contributor_profiles Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.contributor_profiles USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: inspector_activities Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.inspector_activities USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: inspector_assignments Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.inspector_assignments USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: inspector_weekly_plans Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.inspector_weekly_plans USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: inspector_zones Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.inspector_zones USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: payment_plan_installments Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.payment_plan_installments USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: remittance_schedule Compliance staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Compliance staff full access" ON public.remittance_schedule USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: designation_hierarchy Designation hierarchy manageable by admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Designation hierarchy manageable by admins" ON public.designation_hierarchy TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: designation_hierarchy Designation hierarchy viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Designation hierarchy viewable by authenticated users" ON public.designation_hierarchy FOR SELECT TO authenticated USING (true);


--
-- Name: designations Designations manageable by admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Designations manageable by admins" ON public.designations TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: designations Designations viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Designations viewable by authenticated users" ON public.designations FOR SELECT TO authenticated USING (true);


--
-- Name: office_departments Office departments manageable by admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Office departments manageable by admins" ON public.office_departments TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: office_departments Office departments viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Office departments viewable by authenticated users" ON public.office_departments FOR SELECT TO authenticated USING (true);


--
-- Name: role_hierarchy Role hierarchy manageable by admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Role hierarchy manageable by admins" ON public.role_hierarchy TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: role_hierarchy Role hierarchy viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Role hierarchy viewable by authenticated users" ON public.role_hierarchy FOR SELECT TO authenticated USING (true);


--
-- Name: bema_activity_log Staff can view activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view activity log" ON public.bema_activity_log FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_arrears_ledger Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_arrears_ledger USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_audit_cases Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_audit_cases USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_c3_line_items Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_c3_line_items USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_c3_submissions Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_c3_submissions USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_contributors Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_contributors USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_employee_interviews Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_employee_interviews USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_field_activities Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_field_activities USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_inspector_assignments Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_inspector_assignments USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_installments Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_installments USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_payment_plans Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_payment_plans USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_registrations Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_registrations USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_remittance_calendar Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_remittance_calendar USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_vouchers Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_vouchers USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_waivers Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_waivers USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_weekly_plans Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_weekly_plans USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: bema_zones Staff full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff full access" ON public.bema_zones USING (public.has_any_role(auth.uid(), ARRAY['Admin'::public.app_role, 'LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Clerk'::public.app_role]));


--
-- Name: workflow_logs System can create logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create logs" ON public.workflow_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: workflow_security_audit_log System can insert workflow security audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert workflow security audit logs" ON public.workflow_security_audit_log FOR INSERT WITH CHECK (true);


--
-- Name: workflow_tasks System can manage tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage tasks" ON public.workflow_tasks TO authenticated USING (true) WITH CHECK (true);


--
-- Name: sample_applications Users can create their own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own applications" ON public.sample_applications FOR INSERT WITH CHECK ((auth.uid() = applicant_id));


--
-- Name: user_sessions Users can create their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own sessions" ON public.user_sessions FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: sample_applications Users can delete applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete applications" ON public.sample_applications FOR DELETE USING ((((auth.uid() = applicant_id) AND (status = 'Draft'::text)) OR public.has_permission(auth.uid(), 'sample_application'::text, 'delete'::text)));


--
-- Name: user_sessions Users can delete their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own sessions" ON public.user_sessions FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: legal_document_saved_searches Users can manage own saved searches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own saved searches" ON public.legal_document_saved_searches USING ((auth.uid() = user_id));


--
-- Name: legal_saved_views Users can manage own saved views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own saved views" ON public.legal_saved_views TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_notification_preferences Users can manage their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own preferences" ON public.user_notification_preferences TO authenticated USING ((user_id = auth.uid()));


--
-- Name: in_app_notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.in_app_notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: workflow_tasks Users can view assigned tasks by role or user; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view assigned tasks by role or user" ON public.workflow_tasks FOR SELECT USING (((assigned_to = auth.uid()) OR (assigned_role IN ( SELECT (ur.role)::text AS role
   FROM public.user_roles ur
  WHERE (ur.user_id = auth.uid()))) OR (assigned_designation IN ( SELECT d.name
   FROM (public.designations d
     JOIN public.profiles p ON ((p.designation_id = d.id)))
  WHERE (p.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'Admin'::public.app_role))))));


--
-- Name: legal_admin_audit Users can view audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view audit log" ON public.legal_admin_audit FOR SELECT USING (true);


--
-- Name: legal_audit_log Users can view audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view audit log" ON public.legal_audit_log FOR SELECT TO authenticated USING (true);


--
-- Name: legal_complainant_settings Users can view complainant settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view complainant settings" ON public.legal_complainant_settings FOR SELECT TO authenticated USING (true);


--
-- Name: legal_documents Users can view documents for accessible cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view documents for accessible cases" ON public.legal_documents FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.legal_cases
  WHERE ((legal_cases.id = legal_documents.case_id) AND ((NOT legal_documents.confidential) OR public.has_any_role(auth.uid(), ARRAY['LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]))))));


--
-- Name: legal_hearings Users can view hearings for accessible cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view hearings for accessible cases" ON public.legal_hearings FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.legal_cases
  WHERE ((legal_cases.id = legal_hearings.case_id) AND ((NOT legal_cases.confidential) OR public.has_any_role(auth.uid(), ARRAY['LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]))))));


--
-- Name: legal_cases Users can view non-confidential cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view non-confidential cases" ON public.legal_cases FOR SELECT TO authenticated USING (((NOT confidential) OR public.has_any_role(auth.uid(), ARRAY['LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role])));


--
-- Name: legal_orders Users can view orders for accessible cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view orders for accessible cases" ON public.legal_orders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.legal_cases
  WHERE ((legal_cases.id = legal_orders.case_id) AND ((NOT legal_cases.confidential) OR public.has_any_role(auth.uid(), ARRAY['LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]))))));


--
-- Name: legal_parties Users can view parties for accessible cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view parties for accessible cases" ON public.legal_parties FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.legal_cases
  WHERE ((legal_cases.id = legal_parties.case_id) AND ((NOT legal_cases.confidential) OR public.has_any_role(auth.uid(), ARRAY['LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]))))));


--
-- Name: legal_penalties Users can view penalties, settlements, timeline, audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view penalties, settlements, timeline, audit" ON public.legal_penalties FOR SELECT TO authenticated USING (true);


--
-- Name: legal_settlements Users can view settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view settlements" ON public.legal_settlements FOR SELECT TO authenticated USING (true);


--
-- Name: legal_tasks Users can view tasks for accessible cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tasks for accessible cases" ON public.legal_tasks FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.legal_cases
  WHERE ((legal_cases.id = legal_tasks.case_id) AND ((NOT legal_cases.confidential) OR public.has_any_role(auth.uid(), ARRAY['LegalOfficer'::public.app_role, 'Supervisor'::public.app_role, 'Admin'::public.app_role]))))));


--
-- Name: sample_applications Users can view their own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own applications" ON public.sample_applications FOR SELECT USING (((auth.uid() = applicant_id) OR public.has_permission(auth.uid(), 'sample_application'::text, 'view'::text)));


--
-- Name: in_app_notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.in_app_notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_notification_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.user_notification_preferences FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_sessions Users can view their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: legal_timeline_events Users can view timeline events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view timeline events" ON public.legal_timeline_events FOR SELECT TO authenticated USING (true);


--
-- Name: audit_logs al_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY al_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: audit_logs al_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY al_select ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: app_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_interviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_interviews ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_arrears_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_arrears_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_audit_cases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_audit_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_c3_line_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_c3_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_c3_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_c3_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_contributors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_contributors ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_employee_interviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_employee_interviews ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_field_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_field_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_inspector_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_inspector_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_installments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_installments ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_payment_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_payment_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_remittance_calendar; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_remittance_calendar ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_waivers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_waivers ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_weekly_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_weekly_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: bema_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bema_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: c3_line_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.c3_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: c3_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.c3_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_arrears; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_arrears ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_audits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_audits ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_payment_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_payment_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_waivers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_waivers ENABLE ROW LEVEL SECURITY;

--
-- Name: contribution_vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contribution_vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: contributor_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contributor_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: data_policy_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_policy_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: data_scope_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_scope_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: designation_hierarchy; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.designation_hierarchy ENABLE ROW LEVEL SECURITY;

--
-- Name: designations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

--
-- Name: field_security_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.field_security_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: in_app_notifications ian_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ian_insert ON public.in_app_notifications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: in_app_notifications ian_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ian_select ON public.in_app_notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: in_app_notifications ian_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ian_update ON public.in_app_notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: in_app_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: inspector_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inspector_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: inspector_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inspector_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: inspector_weekly_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inspector_weekly_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: inspector_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inspector_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_admin_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_admin_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_cases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_code_sets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_code_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_complainant_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_complainant_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_document_saved_searches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_document_saved_searches ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_document_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_document_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_hearings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_hearings ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_parties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_parties ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_penalties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_penalties ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_saved_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_saved_views ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_sla_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_sla_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_status_transitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_status_transitions ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_timeline_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_timeline_events ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_config mfa_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mfa_admin ON public.mfa_config TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: mfa_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mfa_config ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_config mfa_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mfa_select ON public.mfa_config FOR SELECT TO authenticated USING (true);


--
-- Name: module_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.module_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: module_tables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.module_tables ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_logs nl_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nl_insert ON public.notification_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: notification_logs nl_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nl_select ON public.notification_logs FOR SELECT TO authenticated USING (((recipient_user_id = auth.uid()) OR public.has_role(auth.uid(), 'Admin'::public.app_role)));


--
-- Name: notification_logs nl_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nl_update ON public.notification_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_providers np_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY np_admin ON public.notification_providers TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: notification_templates nt_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nt_admin ON public.notification_templates TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: notification_templates nt_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nt_select ON public.notification_templates FOR SELECT TO authenticated USING (((is_enabled = true) OR public.has_role(auth.uid(), 'Admin'::public.app_role)));


--
-- Name: office_departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.office_departments ENABLE ROW LEVEL SECURITY;

--
-- Name: office_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: password_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

--
-- Name: password_policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_plan_installments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_plan_installments ENABLE ROW LEVEL SECURITY;

--
-- Name: password_history ph_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ph_insert ON public.password_history FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: password_history ph_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ph_own ON public.password_history FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: password_policies pp_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pp_admin ON public.password_policies TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: password_policies pp_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pp_select ON public.password_policies FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: remittance_schedule; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.remittance_schedule ENABLE ROW LEVEL SECURITY;

--
-- Name: role_hierarchy; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_hierarchy ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions rp_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rp_admin ON public.role_permissions TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: role_permissions rp_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rp_select ON public.role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: sample_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sample_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: system_audit_trail; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_audit_trail ENABLE ROW LEVEL SECURITY;

--
-- Name: system_business_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_business_events ENABLE ROW LEVEL SECURITY;

--
-- Name: system_error_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_integration_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_integration_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_performance_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_performance_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: system_security_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_security_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_technical_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_technical_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_preferences unp_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY unp_admin ON public.user_notification_preferences FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: user_notification_preferences unp_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY unp_own ON public.user_notification_preferences TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_permission_overrides upo_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upo_admin ON public.user_permission_overrides TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: user_permission_overrides upo_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upo_select ON public.user_permission_overrides FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'Admin'::public.app_role)));


--
-- Name: user_sessions us_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY us_admin ON public.user_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: user_sessions us_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY us_own ON public.user_sessions TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_data_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_data_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permission_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_action_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_action_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_definitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_execution_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_execution_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_instances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_security_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_security_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_step_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_step_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_triggers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_triggers ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;