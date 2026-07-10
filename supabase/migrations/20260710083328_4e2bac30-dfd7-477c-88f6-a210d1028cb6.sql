
CREATE TABLE IF NOT EXISTS public.communication_hub_module_event_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  module_name text,
  event_code text NOT NULL,
  event_name text,
  description text,
  source_module_path text,
  trigger_description text,
  current_communication_method text,
  current_legacy_table_or_function text,
  channel text NOT NULL DEFAULT 'email',
  recipient_type text,
  recipient_source text,
  entity_type text,
  entity_reference_field text,
  template_code text,
  required_tokens jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_level text NOT NULL DEFAULT 'low',
  integration_status text NOT NULL DEFAULT 'identified',
  template_status text NOT NULL DEFAULT 'not_created',
  mapping_status text NOT NULL DEFAULT 'not_mapped',
  live_status text NOT NULL DEFAULT 'not_live',
  recommended_phase text,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chub_mer_risk_ck CHECK (risk_level IN ('low','medium','high')),
  CONSTRAINT chub_mer_integ_ck CHECK (integration_status IN (
    'identified','template_required','template_seeded','mapped','dry_run_ready',
    'module_integrated','manual_live_ready','retired_legacy','blocked'
  )),
  CONSTRAINT chub_mer_unique UNIQUE (module_code, event_code, channel)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_hub_module_event_registry TO authenticated;
GRANT ALL ON public.communication_hub_module_event_registry TO service_role;

ALTER TABLE public.communication_hub_module_event_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chub_mer_admin_read" ON public.communication_hub_module_event_registry
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'Admin'::app_role));
CREATE POLICY "chub_mer_admin_write" ON public.communication_hub_module_event_registry
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'Admin'::app_role));

CREATE OR REPLACE FUNCTION public.chub_mer_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_chub_mer_touch ON public.communication_hub_module_event_registry;
CREATE TRIGGER trg_chub_mer_touch BEFORE UPDATE ON public.communication_hub_module_event_registry
FOR EACH ROW EXECUTE FUNCTION public.chub_mer_touch_updated_at();

INSERT INTO public.communication_hub_module_event_registry
  (module_code, module_name, event_code, event_name, description, channel, recipient_type, risk_level,
   integration_status, template_status, mapping_status, live_status, recommended_phase, notes)
VALUES
  ('COMM_HUB','Communication Hub','ADMIN_TEST_NOTICE','Admin Test Notice','Internal diagnostic notice for hub validation.','email','ADMIN_USER','low',
   'module_integrated','template_seeded','mapped','manual_live_ready','Phase 1','Proven; used in live pilot rehearsal.'),

  ('EMPLOYER_REGISTRATION','Employer Registration','INTERNAL_ACKNOWLEDGEMENT_NOTICE','Internal Registration Ack','Internal ack for employer registration pipeline.','email','ADMIN_USER','low',
   'mapped','template_seeded','mapped','not_live','Phase 1','Currently dry_run_only; used in EPIC 2E rehearsal.'),
  ('EMPLOYER_REGISTRATION','Employer Registration','INTERNAL_APPROVAL_REVIEW_NOTICE','Internal Approval Review','Internal notice when application requires approval review.','email','ADMIN_USER','low',
   'mapped','template_seeded','mapped','not_live','Phase 1','Currently dry_run_only.'),
  ('EMPLOYER_REGISTRATION','Employer Registration','APPLICATION_RECEIVED_NOTICE','Application Received','External employer ack that application was received.','email','EMPLOYER','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),
  ('EMPLOYER_REGISTRATION','Employer Registration','APPROVAL_NOTICE','Approval Notice','Employer registration approved.','email','EMPLOYER','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),
  ('EMPLOYER_REGISTRATION','Employer Registration','REJECTION_NOTICE','Rejection Notice','Employer registration rejected.','email','EMPLOYER','high',
   'identified','not_created','not_mapped','not_live','Phase 4',NULL),
  ('EMPLOYER_REGISTRATION','Employer Registration','DOCUMENT_REQUEST_NOTICE','Document Request','Document request to employer applicant.','email','EMPLOYER','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),

  ('COMPLIANCE','Compliance','INTERNAL_CASE_STATUS_NOTICE','Internal Case Status','Internal compliance case status.','email','ADMIN_USER','low',
   'manual_live_ready','template_seeded','mapped','not_live','Phase 1','First governed live pilot delivered.'),
  ('COMPLIANCE','Compliance','EMPLOYER_CASE_NOTICE','Employer Case Notice','External case notice to employer.','email','EMPLOYER','high',
   'identified','not_created','not_mapped','not_live','Phase 4',NULL),
  ('COMPLIANCE','Compliance','INSPECTION_SCHEDULE_NOTICE','Inspection Schedule','Inspection scheduling notice.','email','EMPLOYER','medium',
   'identified','not_created','not_mapped','not_live','Phase 3','Legacy: ce_audit_communications / ce-audit-communication-dispatch.'),
  ('COMPLIANCE','Compliance','NON_COMPLIANCE_NOTICE','Non-Compliance Notice','Statutory non-compliance notice.','email','EMPLOYER','high',
   'identified','not_created','not_mapped','not_live','Phase 4',NULL),
  ('COMPLIANCE','Compliance','PENALTY_NOTICE','Penalty Notice','Penalty notice to employer.','email','EMPLOYER','high',
   'identified','not_created','not_mapped','not_live','Phase 4',NULL),
  ('COMPLIANCE','Compliance','CASE_CLOSURE_NOTICE','Case Closure','Case closure notification.','email','EMPLOYER','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),

  ('LEGAL','Legal','INTERNAL_CASE_ASSIGNMENT_NOTICE','Internal Case Assignment','Internal legal case assignment notice.','email','ADMIN_USER','low',
   'template_required','not_created','not_mapped','not_live','Phase 1','Recommend seeding template LEGAL_INTERNAL_CASE_ASSIGNMENT_EMAIL.'),
  ('LEGAL','Legal','LEGAL_REVIEW_REQUIRED_NOTICE','Legal Review Required','Internal legal review required.','email','ADMIN_USER','low',
   'identified','not_created','not_mapped','not_live','Phase 1',NULL),
  ('LEGAL','Legal','HEARING_SCHEDULE_NOTICE','Hearing Schedule','External hearing schedule notice.','email','PARTY','high',
   'identified','not_created','not_mapped','not_live','Phase 4','Legacy: lg_hearing_communication.'),
  ('LEGAL','Legal','LEGAL_DECISION_NOTICE','Legal Decision','Legal decision/order issued.','email','PARTY','high',
   'identified','not_created','not_mapped','not_live','Phase 4','Legacy: lg_order, legal_orders, send-scheduled-legal-report.'),
  ('LEGAL','Legal','APPEAL_NOTICE','Appeal Notice','Appeal filed / appeal status.','email','PARTY','high',
   'identified','not_created','not_mapped','not_live','Phase 4','Legacy: lg_appeal.'),
  ('LEGAL','Legal','DOCUMENT_SUBMISSION_NOTICE','Document Submission','Document submission request.','email','PARTY','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),

  ('INSURED_PERSON','Insured Person','INTERNAL_PROFILE_REVIEW_NOTICE','Internal Profile Review','Internal profile review notice.','email','ADMIN_USER','low',
   'template_required','not_created','not_mapped','not_live','Phase 1','Recommend seeding template INSURED_PERSON_INTERNAL_PROFILE_REVIEW_EMAIL.'),
  ('INSURED_PERSON','Insured Person','REGISTRATION_ACKNOWLEDGEMENT_NOTICE','Registration Ack','External registration acknowledgement.','email','INSURED_PERSON','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),
  ('INSURED_PERSON','Insured Person','PROFILE_UPDATE_NOTICE','Profile Update','Profile update confirmation.','email','INSURED_PERSON','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),
  ('INSURED_PERSON','Insured Person','CONTRIBUTION_HISTORY_NOTICE','Contribution History','Contribution history statement.','email','INSURED_PERSON','medium',
   'identified','not_created','not_mapped','not_live','Phase 3','Legacy: ip_contrib_stmt.'),
  ('INSURED_PERSON','Insured Person','BENEFIT_APPLICATION_RECEIVED_NOTICE','Benefit Application Received','Ack that benefit application was received.','email','INSURED_PERSON','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),
  ('INSURED_PERSON','Insured Person','BENEFIT_STATUS_NOTICE','Benefit Status','Benefit status update.','email','INSURED_PERSON','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),
  ('INSURED_PERSON','Insured Person','DOCUMENT_REQUEST_NOTICE','Document Request','Document request to insured person.','email','INSURED_PERSON','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),

  ('BENEFITS','Benefits','INTERNAL_CLAIM_REVIEW_NOTICE','Internal Claim Review','Internal notice for claim under review.','email','ADMIN_USER','low',
   'template_required','not_created','not_mapped','not_live','Phase 1','Recommend seeding template BENEFITS_INTERNAL_CLAIM_REVIEW_EMAIL.'),
  ('BENEFITS','Benefits','CLAIM_RECEIVED_NOTICE','Claim Received','Ack that claim was received.','email','CLAIMANT','medium',
   'identified','not_created','not_mapped','not_live','Phase 3','Legacy: bn_communication_log / bnCommunicationAdapter.'),
  ('BENEFITS','Benefits','CLAIM_APPROVAL_NOTICE','Claim Approval','Claim approved.','email','CLAIMANT','high',
   'identified','not_created','not_mapped','not_live','Phase 4',NULL),
  ('BENEFITS','Benefits','CLAIM_REJECTION_NOTICE','Claim Rejection','Claim rejected.','email','CLAIMANT','high',
   'identified','not_created','not_mapped','not_live','Phase 4',NULL),
  ('BENEFITS','Benefits','PAYMENT_PROCESSED_NOTICE','Payment Processed','Benefit payment processed.','email','CLAIMANT','high',
   'identified','not_created','not_mapped','not_live','Phase 4','Legacy: bn_payment_instruction.'),
  ('BENEFITS','Benefits','DOCUMENT_REQUEST_NOTICE','Document Request','Document request for claim.','email','CLAIMANT','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),

  ('APPEALS','Appeals / Reviews','INTERNAL_REVIEW_ASSIGNMENT_NOTICE','Internal Review Assignment','Internal appeals review assignment.','email','ADMIN_USER','low',
   'identified','not_created','not_mapped','not_live','Phase 1',NULL),
  ('APPEALS','Appeals / Reviews','APPEAL_RECEIVED_NOTICE','Appeal Received','Ack that appeal was received.','email','APPELLANT','medium',
   'identified','not_created','not_mapped','not_live','Phase 3',NULL),
  ('APPEALS','Appeals / Reviews','HEARING_SCHEDULE_NOTICE','Hearing Schedule','Appeal hearing schedule notice.','email','APPELLANT','high',
   'identified','not_created','not_mapped','not_live','Phase 4',NULL),
  ('APPEALS','Appeals / Reviews','REVIEW_DECISION_NOTICE','Review Decision','Appeal/review decision.','email','APPELLANT','high',
   'identified','not_created','not_mapped','not_live','Phase 4',NULL)
ON CONFLICT (module_code, event_code, channel) DO NOTHING;
