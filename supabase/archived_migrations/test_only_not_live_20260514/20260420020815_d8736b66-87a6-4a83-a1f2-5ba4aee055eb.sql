ALTER TABLE public.ce_audit_finding_response_submissions
  ADD COLUMN IF NOT EXISTS linked_response_id uuid;

CREATE INDEX IF NOT EXISTS idx_ce_audit_finding_response_submissions_linked
  ON public.ce_audit_finding_response_submissions(linked_response_id);

CREATE INDEX IF NOT EXISTS idx_ce_audit_finding_dispute_submissions_linked
  ON public.ce_audit_finding_dispute_submissions(linked_dispute_id);

INSERT INTO public.notification_templates (name, trigger_event, subject, body, placeholders, is_enabled, channel)
SELECT 'Audit Public Submission Received', 'audit_public_submission_received',
  'New employer {{kind}} on inspection {{inspection_ref}}',
  'A new {{kind}} was submitted online by {{submitter_name}} for finding {{finding_ref}} on inspection {{inspection_ref}}.',
  '["kind","submitter_name","finding_ref","inspection_ref"]'::jsonb,
  true, 'in_app'::notification_channel
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE trigger_event = 'audit_public_submission_received'
);

INSERT INTO public.notification_templates (name, trigger_event, subject, body, placeholders, is_enabled, channel)
SELECT 'Audit Public Submission Linked', 'audit_public_submission_linked',
  'Employer {{kind}} accepted on inspection {{inspection_ref}}',
  'An employer {{kind}} (by {{submitter_name}}) was accepted and linked to the formal record on inspection {{inspection_ref}}.',
  '["kind","submitter_name","inspection_ref"]'::jsonb,
  true, 'in_app'::notification_channel
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE trigger_event = 'audit_public_submission_linked'
);