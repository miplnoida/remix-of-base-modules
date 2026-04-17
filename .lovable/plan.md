## Final Plan: Email Templates — Module Normalization + Sandbox Test-Send

### Approved scope (with the user's clarifications baked in)

**Sync behavior — keep identical to Site Settings & Email Config:**

- Keep the existing sync icon/badge column on the Email Templates page (same component as Site Settings & Email Config — NOT a pending pill).
- Keep "Publish All", per-row Retry, `is_synced=false` flip on save/create/toggle/delete.
- The ONLY one-time change is: mark the 13 existing seed rows as `is_synced=true` so they don't show as pending right after seeding.
- `usePendingCount` continues to include templates (no change there).

**Module normalization (one-time DB fix):**


| from_module (canonical) | template_keys                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------- |
| registration            | account_activation, account_deactivation, welcome_customer, welcome_admin_notification |
| authentication          | password_reset, otp_verification, otp_login, password_changed                          |
| payments                | payment_receipt, payment_admin_notification                                            |
| contributions           | c3_submission_confirmation                                                             |
| administration          | company_mapping_notification, complaint_received                                       |


Add CHECK constraint restricting `from_module` to those 5 values.

**Sandbox test-send (new):**

- Top-toolbar **"Test Email"** button on Email Templates page → opens sandbox dialog with template picker (any active template).
- Per-row **paper-airplane** action → opens sandbox dialog pre-selected to that template.
- Sandbox dialog contents:
  - Template picker (SearchableSelect of active templates).
  - Recipient email (pre-filled with logged-in user's email).
  - Auto-generated variable form (parses `{{var}}` from `subject + html_body`, smart defaults: `name=John Doe`, `code=123456`, `amount=100.00`, `date=today`, `loginUrl=https://c3.ssbeservices.net`).
  - Live preview iframe (sandboxed) with substituted values.
  - **Send Test** button.
- New edge function `c3-template-test-send`:
  - JWT-verified, role-gated (admin/c3).
  - Zod-validated input `{ template_id, recipient_email, variables }`.
  - Server-side `{{var}}` substitution.
  - Prepends yellow **"⚠ TEST EMAIL — Sandbox"** banner to subject + body.
  - Sends via Resend (gateway) using existing `RESEND_API_KEY` + `LOVABLE_API_KEY`.
  - Logs to `system_technical_logs` (api_name=`c3-template-test-send`, includes user_code).
  - In-function rate limit: 5 sends / minute / user.
- Toast confirms success/failure.

### Files to create / modify

- **Create**:
  - SQL migration — normalize 13 rows' `from_module`, set `is_synced=true / last_synced_at=now() / sync_error=null` for active rows, add CHECK constraint on the 5 canonical values.
  - `supabase/functions/c3-template-test-send/index.ts`.
  - `src/components/c3Management/email-templates/SandboxDialog.tsx` (template picker + variable form + preview + send).
- **Modify**:
  - `src/pages/c3Management/EmailTemplates.tsx` — add "Test Email" toolbar button + per-row paper-airplane action; wire up SandboxDialog. (Sync UI untouched.)
  - `src/services/wizSettingsService.ts` — add `sendTestEmail()` helper that invokes the new edge function. (No change to existing save/create/toggle/delete behavior.)
  - `mem://features/c3-management/email-templates.md` — record canonical 5 modules, seed-rows-marked-synced rule, sandbox test-send flow + audit logging.

### Verification

1. All 13 rows show one of the 5 canonical `from_module` values; all `is_synced=true` initially (no pending icon after seed).
2. Editing a template flips it back to "pending" sync icon (same as Site Settings/Email Config).
3. "Publish All" + per-row Retry still work for templates.
4. Top-bar "Test Email" button + per-row paper-airplane both open the Sandbox dialog; template picker works in toolbar mode.
5. Send Test → email arrives with ⚠ TEST EMAIL banner; failures show toast; audit log entry created; rate limit enforced after 5/min.  
  
  
Important Note:- Make sure dont chnage any existing functionality.