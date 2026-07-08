
# EPIC 2 — Communication Schema Reconciliation Audit

**Mode:** Plan-only. Zero code, zero migrations, zero schema changes made.
**Scope:** Reconcile every `comm_*`, `communication_*`, `notification_*`, `core_template*`, `generated_documents`, `bn_communication_log`, `ce_notice_delivery_log` table into one canonical model before `sendCommunication()` is built.

---

## 1. Existing Table Family Map

### A. Branding & Assets — `comm_*` (canonical, keep)
`comm_letterhead`, `comm_email_signature`, `comm_disclaimer`, `comm_print_footer`, `comm_layout_block`, `comm_media_asset`, `comm_media_asset_version`, `comm_asset_assignment`, `comm_asset_mapping`, `comm_asset_category_master`, `comm_asset_audit_log`.

### B. Template Master — `core_template*` (canonical, keep)
`core_template`, `core_template_version`, `core_template_layout`, `core_template_section`, `core_template_token`, `core_template_channel`, `core_template_channel_variant`, `core_template_localization`, `core_template_approval`, `core_template_category`, `core_template_legal_reference`, `core_template_schedule_policy`, `core_template_usage`, `core_template_variable_binding`.

### C. Legacy Template/Notification — `notification_*` (compatibility layer, keep read-only)
`notification_templates`, `notification_template_versions`, `notification_template_audit_logs`, `notification_types`, `notification_providers` (still canonical provider config), `notification_queue`, `notification_logs`.

### D. Canonical Sending Spine — `communication_*` (Phase 1A, shipped)
`communication_request`, `communication_recipient`, `communication_message`, `communication_delivery_attempt`, `communication_attachment`, `communication_approval`, `communication_event_log`, `communication_retry_policy`. All 8 tables have RLS on, indexes in place, and read-via-request / write-admin policies.

### E. Domain Reference (Epic 2.7) — `ssp_*` (canonical reference, keep)
`ssp_communication_channel`, `ssp_correspondence_type`, `ssp_recipient_preference`, `ssp_correspondence_template_binding`, `ssp_correspondence_legal_ref`, `ssp_delivery_status_ref`, `ssp_external_provider_code`.

### F. Generated Document Archive (canonical, keep)
`core_generated_document`, `core_generated_document_legal_reference`. No `generated_documents` singular table exists in the DB.

### G. Legacy Module Logs (compatibility, do not touch)
`bn_communication_log`, `bn_comm_event`, `bn_comm_mapping`, `bn_letter`, `ce_notice_delivery_log`, `ce_notices`, `ce_case_correspondence`, `ce_audit_communications` (+ its sub-tables), `ia_communications`, `ia_notification_queue`, `ia_notification_logs`, `ia_notification_triggers`, `ia_auto_notification_log`, `email_send_log`, `email_send_state`, `email_campaigns`, `in_app_notifications`.

---

## 2. Canonical Ownership Recommendation

| Concern | Canonical Owner | Notes |
|---|---|---|
| Branding / letterhead / signature / footer / disclaimer / media | `comm_*` | Do not duplicate. |
| Template master / version / layout / tokens / channel variants / approvals | `core_template*` | Do not duplicate. |
| Reference data (channels, correspondence types, delivery statuses, provider codes, recipient prefs) | `ssp_*` | Do not duplicate. |
| Provider configuration & secrets | `notification_providers` | Do not duplicate. |
| Sending spine (request → recipients → messages → attempts → events → approvals → attachments → retry policy) | `communication_*` (Phase 1A) | Canonical going forward. |
| Legacy template authoring UI | `notification_templates` | Compatibility read; new work goes to `core_template*`. |
| Async worker queue / historical logs | `notification_queue` / `notification_logs` | Keep as legacy dispatch layer under the façade. |
| Official generated PDF/letter archive | `core_generated_document` | Do not duplicate. |
| Module-specific historical logs (`bn_communication_log`, `ce_notice_delivery_log`, `ce_audit_communications`, `ia_communications`, etc.) | Their owning module | System of record for legacy events. Do not migrate. |

---

## 3. Answers to the 10 Questions

1. **Parent request table exists?** Yes — `communication_request` (Phase 1A).
2. **Promote `communication_deliveries`?** No such table exists. `communication_message` (per-channel record) + `communication_delivery_attempt` (per-attempt record) already cover it correctly.
3. **Delivery attempts present?** Yes — `communication_delivery_attempt`.
4. **Lifecycle event log present?** Yes — `communication_event_log` (19 event types wired).
5. **Retry policy config present?** Yes — `communication_retry_policy`.
6. **Duplicate tables from prior prompts?** No duplicates inside `communication_*`. The legacy families (`notification_*`, `ce_audit_communication*`, `ia_notification_*`, `bn_communication_log`, `ce_notice_delivery_log`, `email_send_log`) are parallel-but-owned — keep them as compatibility, do not merge.
7. **Singular/plural conflicts?** None. Prompt asked about `communication_requests` / `communication_messages` / `communication_delivery_attempts` / `communication_event_logs` / `communication_retry_policies` (plural); the shipped tables are all singular (`communication_request`, `communication_message`, `communication_delivery_attempt`, `communication_event_log`, `communication_retry_policy`). No plural twins exist. Standard is singular — keep it.
8. **Additive safe migrations already created?** Yes — Phase 1A: `20260708164250`, `20260708164403`, `20260708164519` (all additive, all RLS-enabled, all indexed).
9. **Risky/destructive migrations?** None in the communication family. No `DROP`/`TRUNCATE`/type-changes touching comm tables.
10. **Minimum schema change before `sendCommunication()` can be built?** **Zero.** The spine is complete. Phase 1B can proceed as pure application code.

**Explicit answer to your bullet 9:** Do NOT create `communication_request`, `communication_delivery_attempts`, `communication_event_log`, or `communication_retry_policies` — they already exist (singular form). Do NOT extend `communication_deliveries` — it doesn't exist and shouldn't; `communication_message` + `communication_delivery_attempt` is the correct two-level split and is already in place.

---

## 4. Tables to Reuse (no change)
- `comm_*` (all 11) — branding/asset canonical
- `core_template*` (all 14) — template canonical
- `ssp_*` (all 7) — reference canonical
- `notification_providers` — provider config canonical
- `communication_*` (all 8, Phase 1A) — sending spine canonical
- `core_generated_document(+_legal_reference)` — archive canonical

## 5. Tables to Extend
**None required for Phase 1B.** Optional future extensions (NEEDS_REVIEW, not now):
- `communication_message.template_version_id` FK → `core_template_version` if we want a hard FK instead of the current soft ref.
- `communication_request.correspondence_code` FK → `ssp_correspondence_type` (currently soft).
Both deferred — soft references are fine until the façade is proven.

## 6. New Tables Truly Needed
**None.** The canonical spine is complete.

---

## 7. Duplicate-Risk Findings (classified)

| Finding | Class | Action |
|---|---|---|
| `notification_templates` vs `core_template` — two template masters | NEEDS_REVIEW | Keep both; `core_template*` is target, `notification_templates` is compat until template migration epic. Do not merge now. |
| `notification_queue`/`notification_logs` vs `communication_message`/`communication_delivery_attempt` | NEEDS_REVIEW | Route new sends via `communication_*`; keep `notification_*` as the worker/dispatch layer written by the edge dispatcher. Do not dual-write from modules. |
| `bn_communication_log`, `ce_notice_delivery_log`, `ce_audit_communications`, `ia_communications`, `email_send_log`, `in_app_notifications` — 6+ module-specific log surfaces | BLOCKED_DO_NOT_TOUCH | Live production paths. Keep as system-of-record for their domain. Façade will additionally write to `communication_event_log`; adapters land in Phase 1C. |
| Prompt-suggested plurals (`communication_messages` / `communication_event_logs` / etc.) | SAFE_TO_FIX_NOW (documentation only) | Do not create. Singular is the shipped standard. Recorded here so the next prompt doesn't create twins. |
| `communication_deliveries` (never existed) | SAFE_TO_FIX_NOW (documentation only) | Do not create. Covered by `communication_message` + `communication_delivery_attempt`. |

## 8. RLS / Index Gaps

**Phase 1A tables:** RLS enabled on all 8; policies are `read via request` / `write admin`; indexes cover module/event, entity, status/scheduled, created_at DESC, request_id, recipient_id, provider_message_id, message_id+occurred_at, request_id+occurred_at, event_type+occurred_at, approval sequence. **No gaps blocking Phase 1B.**

**Legacy tables:** Almost every `notification_*`, `bn_*`, `ce_*`, `ia_*`, `comm_*`, `core_template*` table has RLS OFF at the DB level. This is a **BLOCKED_DO_NOT_TOUCH** platform-wide policy issue — not scoped to this epic. Report only; do not flip RLS here (would break live modules).

## 9. Recommended Migration Plan
**No migrations required for Phase 1B.** Sequence when future extensions land:
1. (Optional, later) Add soft-then-hard FKs on `communication_message.template_version_id` and `communication_request.correspondence_code`.
2. (Later, separate epic) Template consolidation `notification_templates` → `core_template*` behind a view.
3. (Later, Phase 1C) Adapters that mirror module-specific logs into `communication_event_log` — additive, no legacy schema change.

## 10. Compatibility Strategy Recap
- `notification_queue` / `notification_logs`: written by the edge dispatcher on behalf of the façade — modules stop writing directly (Phase 1C cutover, not now).
- `bn_communication_log`, `ce_notice_delivery_log`, `ce_audit_communications`, `ia_communications`: untouched; adapters add mirrored events into `communication_event_log`.
- `notification_templates`: read-through until template consolidation epic.

---

## Summary

- **Changed files:** none (audit-only).
- **Assumptions:** Phase 1A migrations `20260708164250 / 164403 / 164519` are applied and current. Singular naming is intentional and final. `notification_providers` remains provider secret owner (edge-function only).
- **Risk areas:** template dual-authoring (`notification_templates` vs `core_template*`) and module-direct writes to `notification_queue`/`notification_logs` — both deferred and gated behind Phase 1C adapter work; touching either now is BLOCKED_DO_NOT_TOUCH.
- **Recommended next step:** **Proceed directly to Phase 1B (`sendCommunication()` façade + async edge dispatcher + unit/integration tests).** No schema work required before it. Ship behind a feature flag; Benefits/Legal/Compliance stay on current paths until Phase 1C adapters wrap them.
