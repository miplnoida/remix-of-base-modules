
CREATE TABLE IF NOT EXISTS public.communication_hub_gate_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_code TEXT NOT NULL UNIQUE,
  gate_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('system','event','sender','template','recipient','review','duplicate','automation','trigger','volume','emergency')),
  plain_language_description TEXT NOT NULL,
  blocker_code TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  normal_state TEXT,
  live_state TEXT,
  recommended_fix TEXT,
  fixing_screen_url TEXT,
  requires_reason BOOLEAN NOT NULL DEFAULT true,
  requires_typed_confirmation_when_enabling BOOLEAN NOT NULL DEFAULT false,
  requires_typed_confirmation_when_disabling BOOLEAN NOT NULL DEFAULT false,
  go_live_blocking BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.communication_hub_gate_catalog TO authenticated;
GRANT ALL ON public.communication_hub_gate_catalog TO service_role;

ALTER TABLE public.communication_hub_gate_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gate_catalog_read_all_auth" ON public.communication_hub_gate_catalog;
CREATE POLICY "gate_catalog_read_all_auth" ON public.communication_hub_gate_catalog
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "gate_catalog_service_role_all" ON public.communication_hub_gate_catalog;
CREATE POLICY "gate_catalog_service_role_all" ON public.communication_hub_gate_catalog
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.communication_hub_gate_catalog (
  gate_code, gate_name, category, plain_language_description, blocker_code, severity,
  normal_state, live_state, recommended_fix, fixing_screen_url,
  requires_reason, requires_typed_confirmation_when_enabling, requires_typed_confirmation_when_disabling,
  go_live_blocking, display_order
) VALUES
  ('dispatch_enabled','Dispatcher','system','Master switch that lets the Communication Hub dispatcher process any request.','dispatch_disabled','critical','Enabled','Enabled','Turn dispatcher on in Control Center.','/admin/communication-hub/control-center',true,true,false,true,10),
  ('dry_run_only','Dry Run Only','system','When on, everything is simulated — no live emails leave the system.','global_dry_run_only','critical','On for safety','Off in production','Turn Dry Run Only off in Safety Switchboard.','/admin/communication-hub/safety',true,true,false,true,20),
  ('email_live_enabled','Live Email','system','Turns on real email delivery via the provider.','email_live_disabled','critical','Off','On','Enable Live Email in Safety Switchboard.','/admin/communication-hub/safety',true,true,false,true,30),
  ('cron_desired_enabled','Scheduler / Cron','system','Allows the scheduled dispatcher to auto-drain the queue.','cron_disabled','high','Off','On (only in production)','Enable Scheduler in Safety Switchboard.','/admin/communication-hub/safety',true,true,false,false,40),
  ('allowed_email_domains','Recipient Domain Allowlist','recipient','Only recipients on approved domains can receive live email.','recipient_domain_not_allowlisted','high','Internal domains only','Internal domains + approved externals','Add the required domain in Control Center.','/admin/communication-hub/control-center',true,true,false,true,50),
  ('allowed_email_addresses','Recipient Email Allowlist','recipient','Optional list of exact addresses allowed to receive live email.','recipient_not_allowlisted','medium','Empty','Empty or specific pilot addresses','Manage allowlisted addresses in Control Center.','/admin/communication-hub/control-center',true,false,false,false,55),
  ('send_policy','Event Send Policy','event','Controls what the event will do: prepare only, manual review, manual live, or auto live.','send_policy_not_live','high','prepare_only','manual_live or auto_live_internal','Promote the event''s send policy.','/admin/communication-hub/governance/send-policies',true,true,false,true,60),
  ('review_policy','Event Review Policy','review','Controls whether a preview or approval is required before a live send.','review_required','medium','preview_required','none or preview_required','Adjust the review policy for this event.','/admin/communication-hub/governance/send-policies',true,false,false,false,70),
  ('template_approved','Template Approved','template','The template and version must be approved before live sends.','template_not_approved','high','Draft','Approved','Approve the template version.','/admin/communication-hub/design',true,false,false,true,80),
  ('sender_verified','Sender Verified','sender','The sender profile must be verified with the provider (SPF/DKIM/DMARC).','sender_not_verified','high','Unverified','Verified','Verify the sender in Sender Verification.','/admin/communication-hub/design/sender-verification',true,false,false,true,90),
  ('duplicate_prevention','Duplicate Prevention','duplicate','Prevents the same notice going out twice within the duplicate window.','duplicate_send_blocked','high','Enabled','Enabled','Adjust duplicate scope on the event send policy.','/admin/communication-hub/governance/send-policies',true,false,true,true,100),
  ('module_automation','Module Automation','automation','Whether the module (e.g. Legal) will automatically dispatch on the trigger event.','automation_prepare_only','medium','prepare_only','auto_live_internal (approved events only)','Change automation in Automation Settings.','/admin/communication-hub/governance/automation-settings',true,true,false,false,110),
  ('trigger_wired','Trigger Wired','trigger','The business trigger (e.g. case assignment) must call the Communication Hub.','trigger_not_wired','high','Wired','Wired','Ensure the module adapter calls sendCommunication.','/admin/communication-hub/onboarding/module-adapter-tests',true,false,false,true,120),
  ('bulk_sending','Bulk Sending','volume','Whether bulk / batch sends are allowed. Off by default.','bulk_disabled','high','Off','Off unless approved','Enable bulk in Safety Switchboard (requires typed confirmation).','/admin/communication-hub/safety',true,true,false,false,130),
  ('max_recipients_per_send','Max Recipients per Send','volume','Hard cap on recipients in a single send.','max_recipients_exceeded','medium','Small (e.g. 5)','Approved higher cap','Increase the cap in Safety Switchboard (requires typed confirmation).','/admin/communication-hub/safety',true,true,false,false,140),
  ('emergency_stop','Emergency Stop','emergency','Kill switch: turns off dispatcher, live email, and scheduler at once.','emergency_stop_engaged','critical','Not engaged','Not engaged','Engage Emergency Stop from Safety Switchboard.','/admin/communication-hub/safety',true,false,false,false,999)
ON CONFLICT (gate_code) DO UPDATE SET
  gate_name = EXCLUDED.gate_name,
  category = EXCLUDED.category,
  plain_language_description = EXCLUDED.plain_language_description,
  blocker_code = EXCLUDED.blocker_code,
  severity = EXCLUDED.severity,
  normal_state = EXCLUDED.normal_state,
  live_state = EXCLUDED.live_state,
  recommended_fix = EXCLUDED.recommended_fix,
  fixing_screen_url = EXCLUDED.fixing_screen_url,
  requires_reason = EXCLUDED.requires_reason,
  requires_typed_confirmation_when_enabling = EXCLUDED.requires_typed_confirmation_when_enabling,
  requires_typed_confirmation_when_disabling = EXCLUDED.requires_typed_confirmation_when_disabling,
  go_live_blocking = EXCLUDED.go_live_blocking,
  display_order = EXCLUDED.display_order,
  updated_at = now();
