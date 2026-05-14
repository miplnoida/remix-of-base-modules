-- ===========================================================
-- Phase 1 — Employer Online Response: schema + resolver
-- ===========================================================

-- 1. Response mode enum
DO $$ BEGIN
  CREATE TYPE public.ce_online_response_mode AS ENUM (
    'NONE','VIEW_ONLY','ACKNOWLEDGMENT_ONLY','LIMITED_RESPONSE','FULL_RESPONSE'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Global settings (singleton)
CREATE TABLE IF NOT EXISTS public.ce_online_response_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_singleton boolean NOT NULL DEFAULT true UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  require_secure_token boolean NOT NULL DEFAULT true,
  default_link_ttl_hours integer NOT NULL DEFAULT 168,
  allowed_delivery_channels text[] NOT NULL DEFAULT ARRAY['EMAIL']::text[],
  view_only_when_disabled boolean NOT NULL DEFAULT false,
  default_portal_branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

INSERT INTO public.ce_online_response_settings (is_singleton)
SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.ce_online_response_settings);

-- 3. Policy matrix
CREATE TABLE IF NOT EXISTS public.ce_online_response_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name text NOT NULL,
  description text,
  case_type text,
  communication_type text,
  report_type text,
  enforcement_stage text,
  response_mode public.ce_online_response_mode NOT NULL DEFAULT 'NONE',
  portal_enabled boolean NOT NULL DEFAULT false,
  allow_acknowledgment boolean NOT NULL DEFAULT false,
  allow_document_upload boolean NOT NULL DEFAULT false,
  allow_clarification boolean NOT NULL DEFAULT false,
  allow_narrative_response boolean NOT NULL DEFAULT false,
  allow_dispute boolean NOT NULL DEFAULT false,
  allow_corrective_action_response boolean NOT NULL DEFAULT false,
  allow_payment_response boolean NOT NULL DEFAULT false,
  default_response_due_days integer,
  default_portal_ttl_hours integer,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  requires_inspector_review boolean NOT NULL DEFAULT true,
  requires_lead_review boolean NOT NULL DEFAULT false,
  requires_legal_review boolean NOT NULL DEFAULT false,
  reopens_case boolean NOT NULL DEFAULT false,
  triggers_notifications boolean NOT NULL DEFAULT true,
  workflow_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

CREATE INDEX IF NOT EXISTS idx_corp_policies_match
  ON public.ce_online_response_policies(case_type, communication_type, report_type, enforcement_stage)
  WHERE is_active;

-- 4. Template-level defaults (extend ce_audit_communication_templates)
ALTER TABLE public.ce_audit_communication_templates
  ADD COLUMN IF NOT EXISTS default_response_mode public.ce_online_response_mode NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS default_permissions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS allow_admin_override boolean NOT NULL DEFAULT true;

-- 5. Per-instance override + send-time snapshot (communications)
ALTER TABLE public.ce_audit_communications
  ADD COLUMN IF NOT EXISTS response_mode public.ce_online_response_mode,
  ADD COLUMN IF NOT EXISTS permissions_override_json jsonb,
  ADD COLUMN IF NOT EXISTS response_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_resolved_enabled boolean,
  ADD COLUMN IF NOT EXISTS portal_resolved_permissions_json jsonb,
  ADD COLUMN IF NOT EXISTS portal_resolved_mode public.ce_online_response_mode;

-- 6. Per-instance snapshot on acknowledgments (so portal reads from one place)
ALTER TABLE public.ce_audit_report_acknowledgments
  ADD COLUMN IF NOT EXISTS portal_resolved_enabled boolean,
  ADD COLUMN IF NOT EXISTS portal_resolved_mode public.ce_online_response_mode,
  ADD COLUMN IF NOT EXISTS portal_resolved_permissions_json jsonb,
  ADD COLUMN IF NOT EXISTS response_due_at timestamptz;

-- 7. Resolver function — instance > matched policy > template > global
CREATE OR REPLACE FUNCTION public.resolve_online_response(
  p_case_type text,
  p_communication_type text,
  p_report_type text,
  p_enforcement_stage text,
  p_template_id uuid DEFAULT NULL,
  p_instance_mode public.ce_online_response_mode DEFAULT NULL,
  p_instance_overrides jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_settings record;
  v_policy record;
  v_template record;
  v_perm jsonb := '{}'::jsonb;
  v_mode public.ce_online_response_mode := 'NONE';
  v_enabled boolean := false;
  v_review jsonb := '{}'::jsonb;
  v_ttl integer;
  v_due_days integer;
BEGIN
  SELECT * INTO v_settings FROM public.ce_online_response_settings LIMIT 1;
  IF v_settings IS NULL OR v_settings.enabled = false THEN
    RETURN jsonb_build_object(
      'enabled', false,
      'mode', CASE WHEN COALESCE(v_settings.view_only_when_disabled, false) THEN 'VIEW_ONLY' ELSE 'NONE' END,
      'permissions', '{}'::jsonb,
      'review', '{}'::jsonb,
      'reason', 'global_disabled'
    );
  END IF;

  -- Best-matching active policy: more non-null match keys = higher specificity, then priority desc.
  SELECT * INTO v_policy FROM public.ce_online_response_policies
  WHERE is_active = true
    AND (case_type IS NULL OR case_type = p_case_type)
    AND (communication_type IS NULL OR communication_type = p_communication_type)
    AND (report_type IS NULL OR report_type = p_report_type)
    AND (enforcement_stage IS NULL OR enforcement_stage = p_enforcement_stage)
  ORDER BY
    ((case_type IS NOT NULL)::int + (communication_type IS NOT NULL)::int
     + (report_type IS NOT NULL)::int + (enforcement_stage IS NOT NULL)::int) DESC,
    priority DESC, updated_at DESC
  LIMIT 1;

  IF p_template_id IS NOT NULL THEN
    SELECT default_response_mode, default_permissions_json, allow_admin_override
    INTO v_template
    FROM public.ce_audit_communication_templates
    WHERE id = p_template_id;
  END IF;

  -- Base from template, then policy overlays (if template allows override or no template)
  IF v_template IS NOT NULL THEN
    v_mode := COALESCE(v_template.default_response_mode, 'NONE');
    v_perm := COALESCE(v_template.default_permissions_json, '{}'::jsonb);
  END IF;

  IF v_policy IS NOT NULL AND (v_template IS NULL OR COALESCE(v_template.allow_admin_override, true)) THEN
    v_mode := v_policy.response_mode;
    v_perm := jsonb_build_object(
      'portal_enabled', v_policy.portal_enabled,
      'allow_acknowledgment', v_policy.allow_acknowledgment,
      'allow_document_upload', v_policy.allow_document_upload,
      'allow_clarification', v_policy.allow_clarification,
      'allow_narrative_response', v_policy.allow_narrative_response,
      'allow_dispute', v_policy.allow_dispute,
      'allow_corrective_action_response', v_policy.allow_corrective_action_response,
      'allow_payment_response', v_policy.allow_payment_response
    );
    v_review := jsonb_build_object(
      'requires_inspector_review', v_policy.requires_inspector_review,
      'requires_lead_review', v_policy.requires_lead_review,
      'requires_legal_review', v_policy.requires_legal_review,
      'reopens_case', v_policy.reopens_case,
      'triggers_notifications', v_policy.triggers_notifications,
      'workflow_id', v_policy.workflow_id
    );
    v_ttl := v_policy.default_portal_ttl_hours;
    v_due_days := v_policy.default_response_due_days;
  END IF;

  -- Instance overrides win
  IF p_instance_mode IS NOT NULL THEN v_mode := p_instance_mode; END IF;
  IF p_instance_overrides IS NOT NULL THEN
    v_perm := v_perm || p_instance_overrides;
  END IF;

  v_enabled := v_mode <> 'NONE' AND COALESCE((v_perm->>'portal_enabled')::boolean, v_mode IN ('VIEW_ONLY','ACKNOWLEDGMENT_ONLY','LIMITED_RESPONSE','FULL_RESPONSE'));

  RETURN jsonb_build_object(
    'enabled', v_enabled,
    'mode', v_mode,
    'permissions', v_perm,
    'review', v_review,
    'ttl_hours', COALESCE(v_ttl, v_settings.default_link_ttl_hours),
    'due_days', v_due_days,
    'matched_policy_id', v_policy.id
  );
END $$;

-- 8. Backfill: existing acknowledgments → ACKNOWLEDGMENT_ONLY snapshot
UPDATE public.ce_audit_report_acknowledgments
SET portal_resolved_enabled = true,
    portal_resolved_mode = 'ACKNOWLEDGMENT_ONLY',
    portal_resolved_permissions_json = '{"portal_enabled":true,"allow_acknowledgment":true,"allow_document_upload":false,"allow_clarification":false,"allow_narrative_response":false,"allow_dispute":false,"allow_corrective_action_response":false,"allow_payment_response":false}'::jsonb
WHERE portal_resolved_enabled IS NULL;