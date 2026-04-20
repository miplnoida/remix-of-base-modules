# Audit Communication & Employer Interaction System — Plan

**Module ownership:** Compliance (CE) only — separate from generic Audit Reports.
**Prefix:** `ce_audit_communication_*` for all new tables.
**Reuses (does NOT replace):** `notification_templates`, `notification_logs`, `notification_providers`,
`send-notification` edge function, `app_modules`.

## Architecture (3 layers)

1. **Operational** (existing): inspections, findings, evidence, violations, report versions.
2. **Communication** (NEW): templates → communications → recipients → approvals → deliveries → events.
3. **Output**: PDF/HTML rendered through existing audit-report layouts; secure tokens issued for portal.

## Schema (Phase 1) — 12 tables, all `ce_audit_communication*`

- `_templates` (type, channel, subject, body, approval_rule_json, attachment_rule_json, branding_json, version_no)
- `_template_sections` (composable header/body/footer per template)
- `ce_audit_communications` (instance: inspection_id, employer_id, template_id, type, channel, status, subject_snapshot, body_snapshot, report_version_id?, scheduled_at)
- `_recipients` (snapshotted name/email/mobile/source: visit_contact|compliance_contact|er_master)
- `_approvals` (chain: role, approver_user_id, status, decided_at, comments)
- `_deliveries` (per channel-recipient; notification_log_id FK; status mirror)
- `_events` (audit trail: created/submitted/approved/rejected/sent/opened/clicked/responded/uploaded)
- `_attachments` (file_url, kind: report_pdf|evidence_zip|adhoc|annexure)
- `ce_audit_communication_secure_tokens` (token, expires_at, used_at, scope_json)
- `ce_audit_employer_responses` (response_kind, body, submitted_at)
- `ce_audit_employer_uploaded_documents` (file_url, document_kind, requested_via_communication_id)
- `ce_audit_disputes` (finding_id?/violation_id?, status, raised_at, resolution)

**Enums:** `ce_comm_type`, `ce_comm_channel`, `ce_comm_status`, `ce_comm_approval_role`, `ce_comm_delivery_status`.

**14 seeded templates** covering pre-audit / during / post-approval per spec.

**Default approval matrix** (configurable per template):
- reminders/acknowledgments → none
- interim/draft/evidence/info-request → lead_inspector
- final report / violation / corrective / escalation → lead_inspector + supervisor
- dispute_instructions → legal

## Service layer (Phase 2)

- `auditCommunicationTemplateService` — CRUD + clone + sections.
- `auditCommunicationService` — draft, submit, list per visit/employer.
- `auditCommunicationApprovalService` — approve/reject; advance chain.
- `auditCommunicationDeliveryService` — calls existing `send-notification`; logs deliveries.
- `secureTokenService` — issue/validate signed token; stored in DB.
- `recipientResolutionService` — priority: visit-contact → compliance-contact → `er_master`.

## UI integration (Phase 3)

- Visit workspace: new **Communications** tab (list + new-comm wizard + approval queue).
- Admin: `/compliance/admin/communication-templates` (full CRUD + section editor + approval rules).

## Edge function (Phase 4 — next loop)

- `ce-audit-communication-dispatch` — fan-out send when status=approved.
- Re-run via existing `audit-due-date-reminders` cron pattern.

## Backward compatibility
- No changes to existing tables; communication layer references report versions read-only.
- `notification_templates` untouched — audit lives in its own domain table.

## Risks
- SMS path requires `notification_providers` row with `channel=sms` configured. Send-notification will gracefully fall back / log if missing.
- Employer portal route is out-of-scope; tokens stored ready for consumption.

## Phased rollout
1. Schema + seed (this loop)
2. Services + types (this loop)
3. UI: comm tab + admin page (this loop)
4. Dispatch edge function (next loop)
5. Portal handover (separate)
