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
    'Admin'
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
  );
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
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
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
    updated_at timestamp with time zone DEFAULT now()
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
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_interviews audit_interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_interviews
    ADD CONSTRAINT audit_interviews_pkey PRIMARY KEY (id);


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
-- Name: idx_activity_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_entity ON public.compliance_activity_log USING btree (entity_type, entity_id);


--
-- Name: idx_activity_log_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_timestamp ON public.compliance_activity_log USING btree ("timestamp" DESC);


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
-- Name: idx_payment_plans_employer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_plans_employer ON public.compliance_payment_plans USING btree (employer_id);


--
-- Name: idx_payment_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_plans_status ON public.compliance_payment_plans USING btree (status);


--
-- Name: legal_documents document_timeline_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER document_timeline_trigger AFTER INSERT OR UPDATE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION public.log_document_action();


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
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: remittance_schedule update_remittance_schedule_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_remittance_schedule_updated_at BEFORE UPDATE ON public.remittance_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_interviews audit_interviews_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_interviews
    ADD CONSTRAINT audit_interviews_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.compliance_audits(id) ON DELETE CASCADE;


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
-- Name: payment_plan_installments payment_plan_installments_payment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_plan_installments
    ADD CONSTRAINT payment_plan_installments_payment_plan_id_fkey FOREIGN KEY (payment_plan_id) REFERENCES public.compliance_payment_plans(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: remittance_schedule remittance_schedule_contributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remittance_schedule
    ADD CONSTRAINT remittance_schedule_contributor_id_fkey FOREIGN KEY (contributor_id) REFERENCES public.contributor_profiles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: legal_sla_rules Admins can manage SLA rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage SLA rules" ON public.legal_sla_rules USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


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
-- Name: legal_integrations Admins can manage integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage integrations" ON public.legal_integrations USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: legal_templates Admins can manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage templates" ON public.legal_templates USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


--
-- Name: legal_status_transitions Admins can manage transitions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage transitions" ON public.legal_status_transitions USING (public.has_role(auth.uid(), 'Admin'::public.app_role));


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
-- Name: legal_document_saved_searches Users can manage own saved searches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own saved searches" ON public.legal_document_saved_searches USING ((auth.uid() = user_id));


--
-- Name: legal_saved_views Users can manage own saved views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own saved views" ON public.legal_saved_views TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


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
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: legal_timeline_events Users can view timeline events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view timeline events" ON public.legal_timeline_events FOR SELECT TO authenticated USING (true);


--
-- Name: audit_interviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_interviews ENABLE ROW LEVEL SECURITY;

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
-- Name: payment_plan_installments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_plan_installments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: remittance_schedule; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.remittance_schedule ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;