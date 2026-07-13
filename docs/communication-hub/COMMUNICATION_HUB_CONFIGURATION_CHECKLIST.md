# Communication Hub — Configuration Checklist

Follow the strict order below. Do not skip.

## 1. Organisation / tenant
- [ ] Organisation record exists and resolves in session
- [ ] Time zone + locale correct
- [ ] Audit rows tagged with organisation_id

## 2. Modules
- [ ] Row in `communication_hub_module_event_registry` per module (`module_code`, `owner`, `is_active=true`)

## 3. Providers
- [ ] Resend configured under `/admin/notifications/providers`
- [ ] `RESEND_API_KEY` present (verify via preflight)

## 4. Sender profiles
- [ ] Row in `communication_hub_sender_profile` per audience
- [ ] `enabled=true`, `verification_status='verified'`
- [ ] Domain verified in `communication_hub_sender_verification`

## 5. Branding assets
- [ ] Letterhead, header, footer, signature, disclaimer authored via Organisation Management → Library
- [ ] URLs resolve

## 6. Templates (`core_template_master` / `core_template_version`)
- [ ] Draft authored via `/admin/template-management`
- [ ] Required tokens declared
- [ ] Version approved and marked active
- [ ] Preview succeeds with sample tokens
- [ ] Approval + activation audited

## 7. Events
- [ ] Event row in registry with required tokens, recipient type, channel, risk, scheduling eligibility

## 8. Event ↔ Template mapping (`communication_hub_event_template_map`)
- [ ] Row references active template version + enabled sender profile
- [ ] `is_active=true`
- [ ] `scripts/comm-hub/assert_template_mapping.sql` clean

## 9. Recipient resolution
- [ ] Resolver declared per event
- [ ] Missing recipient produces blocker (test)

## 10. Recipient controls (`/admin/communication-hub/recipient-control`)
- [ ] Exact allowlist configured for pilot recipient
- [ ] Suppression list reviewed
- [ ] External release remains OFF

## 11. Send policy (`communication_hub_send_policy`)
- [ ] Row per event with allowed channel, max recipients, time window, duplicate rules

## 12. Review policy (`communication_hub_review_policy`)
- [ ] Reviewer + approver roles set
- [ ] Approval expiry set
- [ ] Reapproval-on-template-change enforced

## 13. Global safety controls (Control Center)
- [ ] Safe defaults confirmed (see Environment Checklist)
- [ ] Every dangerous change audited with reason + typed confirmation
