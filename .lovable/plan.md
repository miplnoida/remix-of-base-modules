Let me check the CSV more carefully and inspect existing send-email infra before planning.
<lov-tool-use id="toolu_vrtx_01FEM7CsXRHz6UzfSRWtMur2" name="code--exec" integration-id="code" data="{command: lov-copy user-uploads://email_templates-export-2026-04-17_13-18-48-2.csv /tmp/templates.csv && python3 -c nimport csvnwith open('/tmp/templates.csv') as f:n    rows = list(csv.DictReader(f, delimiter=';'))nprint('Total rows:', len(rows))nfrom collections import Counternprint('from_module counts:', Counter(r['from_module'] for r in rows))nprint()nprint('key -> module mapping:')nfor r in rows:n    print(f  {r['template_key']:35s} -> {r['from_module']})n, user_facing_description: Reading the uploaded CSV to extract module mapping}">
&nbsp;

<lov-tool-use id="toolu_vrtx_01MxyG4F2HTwXrh2VtP71X88" name="code--search_files" integration-id="code" data="{query: send-notification|resend|RESEND_API_KEY, include_patterns: supabase/functions/**/*.ts}">
&nbsp;

<lov-tool-use id="toolu_vrtx_01TarqwqcbdWPzv2Ao8cXZkY" name="code--exec" integration-id="code" data="{command: lov-copy user-uploads://email_templates-export-2026-04-17_13-18-48-2.csv /tmp/templates.csv && python3 -c nimport csvnwith open('/tmp/templates.csv') as f:n    rows = list(csv.DictReader(f, delimiter=';'))nprint('Total rows:', len(rows))nfrom collections import Counternprint('from_module counts:', Counter(r['from_module'] for r in rows))nprint()nfor r in rows:n    print(f  {r['template_key']:35s} -> {r['from_module']})n, user_facing_description: Inspecting uploaded CSV for module mapping}">
&nbsp;

<lov-tool-use id="toolu_vrtx_01VoxSeN3gdB16uNmowjTfyk" name="code--search_files" integration-id="code" data="{query: RESEND_API_KEY|send-notification, include_patterns: supabase/functions/**/*.ts}">
&nbsp;

<lov-tool-use id="toolu_vrtx_01ScTUwTN3CWAtCRdUbaW2mS" name="code--view" integration-id="code" data="{file_path: user-uploads://email_templates-export-2026-04-17_13-18-48-2.csv, lines: 1-352}">
&nbsp;
I have what I need. Modules in CSV: `registration`, `authentication`, `payments`, `contributions` (and `complaint_received` template at the end — let me check).
<lov-tool-use id="toolu_vrtx_01U3eDDfmA8MkxsrWfwgkNBF" name="code--view" integration-id="code" data="{file_path: user-uploads://email_templates-export-2026-04-17_13-18-48-2.csv, lines: 340-352}">
&nbsp;
Confirmed: 5 canonical modules — `registration`, `authentication`, `payments`, `contributions`, `administration`. Plan ready.

## Plan: Normalize `from_module`, mark templates synced, add Sandbox test-send

### Discovery

- **Canonical modules from CSV** (the new source of truth): `registration`, `authentication`, `payments`, `contributions`, `administration` — 5 values across 13 templates.
- Local DB rows have drift (`identity`, `finance`, `internal`, `admin`, `contact`, `AUTH`) and `is_synced=false`. Both must be corrected.
- `send-notification` edge function already wraps Resend with retry + audit logging — we'll reuse its logic for the sandbox test-send.
- Templates UI currently shows a "Pending" badge whenever `is_synced=false` and contributes to the global pending pill — this must be hidden for templates only (settings + email config keep their existing sync workflow).  Note:- dont hide it just do the is_synced = true and pending pill to icon - it should be same as in the c3_site_setting and email config

### Changes

**1. DB migration — normalize modules + mark synced**

Per-template module fix (mirror CSV exactly):


| template_key                                                                           | → from_module    |
| -------------------------------------------------------------------------------------- | ---------------- |
| account_activation, account_deactivation, welcome_customer, welcome_admin_notification | `registration`   |
| password_reset, otp_verification, otp_login, password_changed                          | `authentication` |
| payment_receipt, payment_admin_notification                                            | `payments`       |
| c3_submission_confirmation                                                             | `contributions`  |
| company_mapping_notification, complaint_received                                       | `administration` |


Plus: `UPDATE c3_email_templates SET is_synced = true, last_synced_at = now(), sync_error = null WHERE is_deleted = false`.

Add a CHECK constraint restricting `from_module` to those 5 values so future inserts can't drift.

**2. Service / hook updates**

- `wizSettingsService.ts → saveEmailTemplate / createEmailTemplate / toggleEmailTemplateActive / softDeleteEmailTemplate`: stop forcing `is_synced=false` (templates are considered always-synced from the UI's perspective).   - its incorrect  
Important Note:- it should be synced false in db it should be work same as the site setting and email config working
  &nbsp;
  Important note:- you dont need to remove the sync features from the email_templates i just asked to do the is_synced true dont show any pending chnages to sync to the c3-wizard but you misunderstood everything.  
  sync functionality should be work same as the site settings and the email config settings,.  
  Please create a plan again- this plan is totally incorrect.  
  dont implement this plan in the code.  
  you are required to create a revised plan 

**4. Sandbox test-send feature**

UI:

- New **"Sandbox"** tab inside the existing template editor dialog (alongside Content / Preview).
- New per-row **Test** action (paper-airplane icon) for quick access without opening the editor.
- Sandbox panel contains:
  - Recipient email (pre-filled with logged-in user's email; editable).
  - Auto-generated variable form: parses `{{var}}` tokens from `subject + html_body`, renders one labeled input per variable with smart defaults (e.g., `name="John Doe"`, `code="123456"`, `amount="100.00"`, `date=today`, `loginUrl="https://c3.ssbeservices.net"`).
  - Live preview (sandboxed iframe) showing rendered subject/body with substituted values.
  - **Send Test** button.      
  important point:- it should be choose any templates to test.

New edge function `c3-template-test-send`:

- JWT-verified; caller must have an admin/c3 role.
- Input: `{ template_id, recipient_email, variables }` (Zod-validated).
- Loads template by id, performs `{{var}}` substitution server-side (never trust client-rendered HTML).
- Prepends a yellow **"⚠ TEST EMAIL — Sandbox"** banner to the subject and body so test sends are unmistakable.
- Sends via Resend using existing `RESEND_API_KEY`, mirroring the retry/error flow from `send-notification`.
- Logs each attempt to `system_technical_logs` (`api_name='c3-template-test-send'`, includes `user_code`).
- Simple in-function rate limit: max 5 sends per minute per user.
- Returns `{ success, resend_id?, error? }`.

Toast confirms success/failure.

**5. Knowledge / memory**

- Update `mem://features/c3-management/email-templates` with: 5 canonical modules, "templates do not show sync state" rule, sandbox test-send flow + audit logging.

### Files to create / modify

- **Create**: SQL migration (normalize modules, mark synced, CHECK constraint); `supabase/functions/c3-template-test-send/index.ts`; `src/components/c3Management/email-templates/SandboxTab.tsx`.
- **Modify**: `src/pages/c3Management/EmailTemplates.tsx` (hide sync UI, add Test action + Sandbox tab, locked module dropdown); `src/hooks/useSettingsConfiguration.ts` (`usePendingCount` excludes templates); `src/services/wizSettingsService.ts` (drop `is_synced=false` from save/create/toggle/delete); `mem://features/c3-management/email-templates.md`.

### Verification

1. All 13 rows have one of the 5 canonical `from_module` values; all `is_synced=true`.
2. Email Templates page shows no Pending/Failed badges, no pending pill, no Publish/Retry buttons.
3. Global pending count (sidebar/settings) ignores templates.
4. Sandbox: open any template → Sandbox tab → recipient prefilled → variable inputs auto-rendered → Send Test → email arrives with ⚠ TEST EMAIL banner; failures show toast with reason; audit log entry created.  
  
  
Important note:- i have addedd the important notes in this plan, analyse it properly and make a clear plan again. Dont implement this plan at any cost as this plan is not correct.