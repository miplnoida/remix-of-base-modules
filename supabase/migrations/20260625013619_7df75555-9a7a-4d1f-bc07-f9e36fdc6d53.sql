
-- =====================================================================
-- Unified Legal Referral Cross-Module Workflow
-- =====================================================================

-- 1. Unified header
CREATE TABLE IF NOT EXISTS public.legal_referral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_no TEXT NOT NULL UNIQUE,
  source_module TEXT NOT NULL CHECK (source_module IN ('BENEFITS','COMPLIANCE')),
  source_record_type TEXT,
  source_record_id TEXT,
  source_reference_no TEXT,
  primary_entity_type TEXT,
  primary_entity_id TEXT,
  submitted_by TEXT,
  submitted_workbasket_code TEXT,
  submitted_team_code TEXT,
  legal_workbasket_code TEXT,
  legal_team_code TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED_TO_LEGAL'
    CHECK (status IN ('DRAFT','SUBMITTED_TO_LEGAL','RECEIVED_BY_LEGAL','INFO_REQUESTED','INFO_RESPONDED','UNDER_LEGAL_REVIEW','ACCEPTED','LEGAL_CASE_CREATED','REJECTED','CLOSED')),
  legal_case_id UUID,
  source_bn_referral_id UUID REFERENCES public.bn_legal_referral(id) ON DELETE CASCADE,
  source_ce_referral_id UUID REFERENCES public.ce_legal_referrals(id) ON DELETE CASCADE,
  lg_intake_id UUID,
  summary TEXT,
  priority_code TEXT DEFAULT 'MEDIUM',
  exposure_amount NUMERIC(18,2),
  pending_info_request_count INTEGER NOT NULL DEFAULT 0,
  last_status_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_referral TO authenticated;
GRANT ALL ON public.legal_referral TO service_role;
CREATE INDEX IF NOT EXISTS idx_legal_referral_source ON public.legal_referral(source_module, status);
CREATE INDEX IF NOT EXISTS idx_legal_referral_team ON public.legal_referral(legal_team_code, legal_workbasket_code);
CREATE INDEX IF NOT EXISTS idx_legal_referral_submitter ON public.legal_referral(submitted_by);
CREATE INDEX IF NOT EXISTS idx_legal_referral_bn ON public.legal_referral(source_bn_referral_id);
CREATE INDEX IF NOT EXISTS idx_legal_referral_ce ON public.legal_referral(source_ce_referral_id);

-- 2. Info requests
CREATE TABLE IF NOT EXISTS public.legal_referral_info_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_referral_id UUID NOT NULL REFERENCES public.legal_referral(id) ON DELETE CASCADE,
  request_no TEXT NOT NULL UNIQUE,
  requested_by TEXT NOT NULL,
  requested_to_module TEXT NOT NULL CHECK (requested_to_module IN ('BENEFITS','COMPLIANCE')),
  requested_to_workbasket_code TEXT,
  requested_to_team_code TEXT,
  requested_to_user TEXT,
  request_reason TEXT NOT NULL,
  requested_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'PENDING_SOURCE_RESPONSE'
    CHECK (status IN ('PENDING_SOURCE_RESPONSE','RESPONDED','CANCELLED')),
  responded_by TEXT,
  responded_at TIMESTAMPTZ,
  response_notes TEXT,
  completion_items JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_referral_info_request TO authenticated;
GRANT ALL ON public.legal_referral_info_request TO service_role;
CREATE INDEX IF NOT EXISTS idx_lrir_referral ON public.legal_referral_info_request(legal_referral_id, status);
CREATE INDEX IF NOT EXISTS idx_lrir_target ON public.legal_referral_info_request(requested_to_module, requested_to_workbasket_code, status);

-- 3. Document link
CREATE TABLE IF NOT EXISTS public.legal_referral_document_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_referral_id UUID NOT NULL REFERENCES public.legal_referral(id) ON DELETE CASCADE,
  info_request_id UUID REFERENCES public.legal_referral_info_request(id) ON DELETE SET NULL,
  dms_document_id UUID,
  dms_file_id TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  source_module TEXT,
  document_source TEXT NOT NULL DEFAULT 'NEW_UPLOAD',
  linked_by TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_referral_document_link TO authenticated;
GRANT ALL ON public.legal_referral_document_link TO service_role;
CREATE INDEX IF NOT EXISTS idx_lrdl_referral ON public.legal_referral_document_link(legal_referral_id);
CREATE INDEX IF NOT EXISTS idx_lrdl_request ON public.legal_referral_document_link(info_request_id);

-- 4. Source-side tasks (so we don't touch each module's task tables)
CREATE TABLE IF NOT EXISTS public.legal_referral_source_task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_referral_id UUID NOT NULL REFERENCES public.legal_referral(id) ON DELETE CASCADE,
  info_request_id UUID NOT NULL REFERENCES public.legal_referral_info_request(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL DEFAULT 'LEGAL_INFO_REQUEST',
  source_module TEXT NOT NULL CHECK (source_module IN ('BENEFITS','COMPLIANCE')),
  assigned_workbasket_code TEXT,
  assigned_team_code TEXT,
  assigned_user TEXT,
  priority TEXT DEFAULT 'MEDIUM',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','IN_PROGRESS','COMPLETED','CANCELLED')),
  claim_id UUID,
  insured_person_id TEXT,
  employer_id TEXT,
  compliance_case_id UUID,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_referral_source_task TO authenticated;
GRANT ALL ON public.legal_referral_source_task TO service_role;
CREATE INDEX IF NOT EXISTS idx_lrst_target ON public.legal_referral_source_task(source_module, assigned_workbasket_code, status);
CREATE INDEX IF NOT EXISTS idx_lrst_user ON public.legal_referral_source_task(assigned_user, status);
CREATE INDEX IF NOT EXISTS idx_lrst_request ON public.legal_referral_source_task(info_request_id);

-- 5. Audit trail
CREATE TABLE IF NOT EXISTS public.legal_referral_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_referral_id UUID NOT NULL REFERENCES public.legal_referral(id) ON DELETE CASCADE,
  info_request_id UUID REFERENCES public.legal_referral_info_request(id) ON DELETE SET NULL,
  event_code TEXT NOT NULL,
  event_module TEXT,
  actor TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.legal_referral_audit TO authenticated;
GRANT ALL ON public.legal_referral_audit TO service_role;
CREATE INDEX IF NOT EXISTS idx_lra_referral ON public.legal_referral_audit(legal_referral_id, created_at DESC);

-- 6. updated_at trigger function (shared if exists)
CREATE OR REPLACE FUNCTION public.legal_referral_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER trg_legal_referral_touch BEFORE UPDATE ON public.legal_referral
  FOR EACH ROW EXECUTE FUNCTION public.legal_referral_touch_updated_at();
CREATE TRIGGER trg_lrir_touch BEFORE UPDATE ON public.legal_referral_info_request
  FOR EACH ROW EXECUTE FUNCTION public.legal_referral_touch_updated_at();
CREATE TRIGGER trg_lrst_touch BEFORE UPDATE ON public.legal_referral_source_task
  FOR EACH ROW EXECUTE FUNCTION public.legal_referral_touch_updated_at();

-- 7. Pending count maintenance
CREATE OR REPLACE FUNCTION public.legal_referral_sync_pending_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE rid UUID;
BEGIN
  rid := COALESCE(NEW.legal_referral_id, OLD.legal_referral_id);
  UPDATE public.legal_referral SET
    pending_info_request_count = (
      SELECT COUNT(*) FROM public.legal_referral_info_request
      WHERE legal_referral_id = rid AND status = 'PENDING_SOURCE_RESPONSE'
    ),
    last_status_at = now()
  WHERE id = rid;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_lrir_sync_count AFTER INSERT OR UPDATE OR DELETE ON public.legal_referral_info_request
  FOR EACH ROW EXECUTE FUNCTION public.legal_referral_sync_pending_count();

-- 8. Backfill from existing referrals
INSERT INTO public.legal_referral (
  referral_no, source_module, source_record_type, source_record_id, source_reference_no,
  primary_entity_type, primary_entity_id, submitted_by, status, legal_case_id,
  source_bn_referral_id, lg_intake_id, summary, priority_code, exposure_amount,
  created_at, updated_at, last_status_at
)
SELECT
  r.referral_number,
  'BENEFITS',
  CASE WHEN r.source_claim_id IS NOT NULL THEN 'CLAIM' WHEN r.source_award_id IS NOT NULL THEN 'AWARD' ELSE 'OTHER' END,
  COALESCE(r.source_record_id, r.source_claim_id::text, r.source_award_id::text),
  COALESCE(r.source_reference_no, r.referral_number),
  CASE WHEN r.insured_person_id IS NOT NULL THEN 'INSURED_PERSON' WHEN r.employer_id IS NOT NULL THEN 'EMPLOYER' ELSE NULL END,
  COALESCE(r.insured_person_id, r.employer_id),
  COALESCE(r.submitted_by, r.referred_by, r.created_by),
  CASE r.status
    WHEN 'ACCEPTED_BY_LEGAL' THEN 'ACCEPTED'
    WHEN 'IN_LEGAL_PROCEEDINGS' THEN 'LEGAL_CASE_CREATED'
    ELSE r.status END,
  r.lg_case_id, r.id, r.lg_intake_id, r.referral_reason, r.priority_code,
  r.exposure_amount, r.created_at, r.updated_at, r.updated_at
FROM public.bn_legal_referral r
LEFT JOIN public.legal_referral lr ON lr.source_bn_referral_id = r.id
WHERE lr.id IS NULL;

INSERT INTO public.legal_referral (
  referral_no, source_module, source_record_type, source_record_id, source_reference_no,
  primary_entity_type, primary_entity_id, submitted_by, status, legal_case_id,
  source_ce_referral_id, lg_intake_id, summary, priority_code, exposure_amount,
  created_at, updated_at, last_status_at
)
SELECT
  r.referral_number, 'COMPLIANCE', 'CASE',
  COALESCE(r.source_record_id, r.source_case_id::text),
  COALESCE(r.source_reference_no, r.referral_number),
  'EMPLOYER', r.employer_id,
  COALESCE(r.referred_by, r.created_by),
  CASE r.status
    WHEN 'ACCEPTED_BY_LEGAL' THEN 'ACCEPTED'
    WHEN 'IN_LEGAL_PROCEEDINGS' THEN 'LEGAL_CASE_CREATED'
    ELSE r.status END,
  r.legal_case_id, r.id, r.lg_intake_id, r.referral_reason_text, 'MEDIUM',
  r.grand_total, r.created_at, r.updated_at, r.updated_at
FROM public.ce_legal_referrals r
LEFT JOIN public.legal_referral lr ON lr.source_ce_referral_id = r.id
WHERE lr.id IS NULL;

-- 9. Sync trigger: keep status mirrored bn -> unified
CREATE OR REPLACE FUNCTION public.legal_referral_sync_from_bn()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE new_status TEXT;
BEGIN
  new_status := CASE NEW.status
    WHEN 'ACCEPTED_BY_LEGAL' THEN 'ACCEPTED'
    WHEN 'IN_LEGAL_PROCEEDINGS' THEN 'LEGAL_CASE_CREATED'
    ELSE NEW.status END;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.legal_referral (
      referral_no, source_module, source_record_type, source_record_id, source_reference_no,
      primary_entity_type, primary_entity_id, submitted_by, status, legal_case_id,
      source_bn_referral_id, lg_intake_id, summary, priority_code, exposure_amount
    ) VALUES (
      NEW.referral_number, 'BENEFITS',
      CASE WHEN NEW.source_claim_id IS NOT NULL THEN 'CLAIM' WHEN NEW.source_award_id IS NOT NULL THEN 'AWARD' ELSE 'OTHER' END,
      COALESCE(NEW.source_record_id, NEW.source_claim_id::text, NEW.source_award_id::text),
      COALESCE(NEW.source_reference_no, NEW.referral_number),
      CASE WHEN NEW.insured_person_id IS NOT NULL THEN 'INSURED_PERSON' WHEN NEW.employer_id IS NOT NULL THEN 'EMPLOYER' ELSE NULL END,
      COALESCE(NEW.insured_person_id, NEW.employer_id),
      COALESCE(NEW.submitted_by, NEW.referred_by, NEW.created_by),
      new_status, NEW.lg_case_id, NEW.id, NEW.lg_intake_id, NEW.referral_reason,
      NEW.priority_code, NEW.exposure_amount
    ) ON CONFLICT (referral_no) DO NOTHING;
  ELSE
    UPDATE public.legal_referral SET
      status = new_status, legal_case_id = NEW.lg_case_id, lg_intake_id = NEW.lg_intake_id,
      last_status_at = now()
    WHERE source_bn_referral_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_bn_legal_referral_sync
  AFTER INSERT OR UPDATE ON public.bn_legal_referral
  FOR EACH ROW EXECUTE FUNCTION public.legal_referral_sync_from_bn();

CREATE OR REPLACE FUNCTION public.legal_referral_sync_from_ce()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE new_status TEXT;
BEGIN
  new_status := CASE NEW.status
    WHEN 'ACCEPTED_BY_LEGAL' THEN 'ACCEPTED'
    WHEN 'IN_LEGAL_PROCEEDINGS' THEN 'LEGAL_CASE_CREATED'
    ELSE NEW.status END;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.legal_referral (
      referral_no, source_module, source_record_type, source_record_id, source_reference_no,
      primary_entity_type, primary_entity_id, submitted_by, status, legal_case_id,
      source_ce_referral_id, lg_intake_id, summary, exposure_amount
    ) VALUES (
      NEW.referral_number, 'COMPLIANCE', 'CASE',
      COALESCE(NEW.source_record_id, NEW.source_case_id::text),
      COALESCE(NEW.source_reference_no, NEW.referral_number),
      'EMPLOYER', NEW.employer_id,
      COALESCE(NEW.referred_by, NEW.created_by),
      new_status, NEW.legal_case_id, NEW.id, NEW.lg_intake_id,
      NEW.referral_reason_text, NEW.grand_total
    ) ON CONFLICT (referral_no) DO NOTHING;
  ELSE
    UPDATE public.legal_referral SET
      status = new_status, legal_case_id = NEW.legal_case_id, lg_intake_id = NEW.lg_intake_id,
      last_status_at = now()
    WHERE source_ce_referral_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ce_legal_referrals_sync
  AFTER INSERT OR UPDATE ON public.ce_legal_referrals
  FOR EACH ROW EXECUTE FUNCTION public.legal_referral_sync_from_ce();

-- 10. Number sequence helpers
CREATE OR REPLACE FUNCTION public.next_info_request_no() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE n BIGINT;
BEGIN
  SELECT COUNT(*) + 1 INTO n FROM public.legal_referral_info_request
    WHERE created_at >= date_trunc('year', now());
  RETURN 'LIR-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
END $$;

-- 11. Initial pending count refresh
UPDATE public.legal_referral lr SET pending_info_request_count = (
  SELECT COUNT(*) FROM public.legal_referral_info_request ir
  WHERE ir.legal_referral_id = lr.id AND ir.status = 'PENDING_SOURCE_RESPONSE'
);

-- 12. Seed notification templates
INSERT INTO public.notification_templates (name, channel, template_code, trigger_event, subject, title, body, category, is_enabled, placeholders)
VALUES
  ('Legal Info Request - Source', 'email'::notification_channel, 'LEGAL_INFO_REQUEST_TO_SOURCE', 'legal.info_request.created',
   'Legal: Information requested on referral {{referral_no}}',
   'Information requested on Legal Referral {{referral_no}}',
   'Legal has requested additional information on referral {{referral_no}} (source reference {{source_reference_no}}).\n\nReason: {{request_reason}}\nRequested items: {{requested_items}}\nDue: {{due_date}}\n\nOpen the response screen: {{response_link}}',
   'action_required', true,
   '["referral_no","source_reference_no","request_reason","requested_items","due_date","response_link"]'::jsonb),
  ('Legal Info Request - In App', 'in_app'::notification_channel, 'LEGAL_INFO_REQUEST_TO_SOURCE_INAPP', 'legal.info_request.created',
   NULL, 'Legal info request: {{referral_no}}',
   '{{request_reason}} (due {{due_date}})', 'action_required', true,
   '["referral_no","request_reason","due_date"]'::jsonb),
  ('Legal Info Response - Legal', 'email'::notification_channel, 'LEGAL_INFO_RESPONSE_TO_LEGAL', 'legal.info_request.responded',
   'Source response received on referral {{referral_no}}',
   'Response received on referral {{referral_no}}',
   '{{source_module}} responded on referral {{referral_no}}.\n\nResponse: {{response_notes}}\n\nReview: {{review_link}}',
   'informational', true,
   '["referral_no","source_module","response_notes","review_link"]'::jsonb),
  ('Legal Info Response - Legal In App', 'in_app'::notification_channel, 'LEGAL_INFO_RESPONSE_TO_LEGAL_INAPP', 'legal.info_request.responded',
   NULL, 'Response on {{referral_no}}', '{{source_module}} submitted requested information.', 'informational', true,
   '["referral_no","source_module"]'::jsonb)
ON CONFLICT DO NOTHING;
