# Communication Hub Template Platform — Inventory (Phase 1)

Scope: read-only enumeration of every template storage model, every rendering
implementation, and every module-level bypass path present in the deployed
database and the repository. No schema, code, or seed changes were made in this
phase. All findings are evidence for Phase 2 (canonical renderer + wrappers)
and later phases.

Data source: live database via `psql`, plus repository `rg` sweeps.
Companion artifact: `PLATFORM_EVENT_MATRIX.md` (per-event rendering readiness).

---

## 1. Executive summary of platform defects

Findings that apply to every module — not just Appeals:

| # | Defect | Evidence | Impact |
|---|--------|----------|--------|
| D1 | **Multiple parallel rendering algorithms** exist in DB and frontend. There is no single canonical renderer. | `comm_hub_render_template`, `render_comm_hub_template_preview`, `render_email_template`, plus 4 in-code `.replace(/\{\{...\}\}/g, ...)` sites. | Any bug (missing column, wrong signature, wrong escaping) must be patched N times. Root cause of the `subject_template` and `render_comm_hub_template(text,jsonb)` incidents. |
| D2 | **`core_template_version.status` uses three case-variant values** (`ACTIVE`, `PUBLISHED`, `published`). | `SELECT status, COUNT(*) FROM core_template_version` → 27 ACTIVE, 137 PUBLISHED, 1 published. Zero rows use lowercase `active`. | Any check like `status = 'active'` silently returns nothing. No enum enforcement. |
| D3 | **`communication_hub_template_variable_contract` is unbound.** All 20 rows have NULL `template_id`, `template_version_id`, and `template_code`. | `SELECT template_id, template_version_id, template_code FROM …` → all NULL. | Templates cannot resolve their variable contract by join; every renderer must guess. |
| D4 | **Only 2 of 41 events have a payload schema; only 3 have a test scenario; 5 have review policies; 2 have send policies.** | See `PLATFORM_EVENT_MATRIX.md`. | 38 events cannot be certified for Preview even though 40 have a template mapping. |
| D5 | **Two template naming conventions coexist** for the same modules. | `BENEFITS_CLAIM_APPROVAL_EMAIL` (used by registry) vs. `BENEFITS-EMAIL-CLAIM-RECEIVED` / `BENEFITS-LETTER-REJECTION` (older). | Silent duplication; mapping picks one and the other rots. |
| D6 | **Sender profile bound at mapping time, not resolved deterministically per event.** | `communication_hub_event_template_map.sender_profile_id` NOT NULL on 40/41 rows, but no per-event fallback rule is enforced. | Was root cause of `controlled_live_sender_profile_missing` when the snapshot lost the sender. |
| D7 | **All registered events use channel `email`.** No SMS / letter / notice / PDF / push events are registered even though `core_template` supports 10 template types (EMAIL, SMS, LETTER, NOTICE, DOCUMENT, CERTIFICATE, FORM, IN_APP, RECEIPT, STATEMENT). | `SELECT DISTINCT channel FROM communication_hub_module_event_registry` → `email` only. | Every claim of "platform ready" is currently email-only. Type-specific rendering rules do not exist yet. |
| D8 | **Legacy notification stack is still live and writable** alongside the Hub. | `notification_templates` = 132 rows, `notification_template_versions` = 18, `notification_queue` and `notification_logs` still active. Modules such as `legalAssignmentWorkflow.ts` write to it. | Any module can bypass the Hub by writing to `notification_queue` directly. |
| D9 | **In-code renderers duplicate `{{token}}` substitution.** | `src/lib/enterprise/NotificationResolver.ts`, `src/lib/enterprise/resolvers/emailBrandingResolver.ts`, `src/hooks/useWorkflowFieldUpdates.ts`, `src/data/legalTemplates.ts`, `src/lib/legal/departmentMergeContext.ts`. | Each uses its own escaping (or none). Not certifiable. |
| D10 | **Validation at configuration time is absent.** Templates can be saved with unknown tokens, unmapped variables, missing sender, missing schema; the operator first sees this at Preview or Controlled Stub. | No `validate_comm_hub_template_contract` invocation on write; only on demand. | Every defect surfaces late in Go Live. |

---

## 2. Template storage models

Every table found in the deployed database that stores a template or template-like
artifact, classified per §2 of the task.

### 2.1 Canonical (must survive; single source of truth)

| Table | Rows | Role |
|-------|------|------|
| `core_template` | 349 | Canonical template master (code, type, module, category). |
| `core_template_version` | 165 | Canonical version bodies (`subject`, `body_html`, `body_text`, `layout_id`, `template_structure`, `body_metadata`). |
| `core_template_layout` | — | Layout shell (referenced by version). |
| `core_template_section` | — | Section composition for LETTER/NOTICE/DOCUMENT types. |
| `core_template_token` | — | Token dictionary. |
| `core_template_variable_binding` | — | Static binding map (currently unused by resolver). |
| `core_template_channel` / `core_template_channel_variant` | — | Channel-specific variants. |
| `core_template_localization` | — | i18n variants. |
| `core_template_approval` | — | Approval workflow rows. |
| `core_template_category` | — | Categorisation. |
| `core_template_legal_reference` | — | Legal citations. |
| `core_template_schedule_policy` | — | Scheduling metadata. |
| `core_template_usage` | — | Usage log. |
| `communication_hub_event_template_map` | 40 | Event→template binding (per module/event/channel). |
| `communication_hub_template_variable_contract` | 20 | Declared variable contract (currently unbound — D3). |
| `communication_hub_event_payload_schema` / `_field` | 2 / 5 | Business-event payload contract. |
| `communication_hub_event_test_scenario` | 3 | Pre-live business-event fixtures. |
| `communication_hub_sender_profile` | 15 | Sender identities (12 module senders + 3 utility). |
| `communication_hub_event_review_policy` / `_send_policy` | 5 / 5 | Governance policies. |
| `communication_hub_module_event_registry` | 41 | Registered events (§3). |
| `communication_hub_variable_source_registry` | — | Variable source registry. |

### 2.2 Compatibility (Hub-adjacent; keep during migration)

| Table | Rows | Role |
|-------|------|------|
| `communication_preview_snapshot` | — | Immutable rendered snapshot per Preview. |
| `communication_preview_approval` | — | Operator approval tying a snapshot to a Go Live stage. |
| `communication_dry_run_execution` / `_certification` | — | Dry-run evidence. |
| `communication_controlled_live_execution` / `_grant` / `_certification` | — | Controlled Stub / Real Email evidence. |
| `communication_message`, `communication_request`, `communication_recipient`, `communication_attachment`, `communication_delivery_attempt`, `communication_retry_policy`, `communication_event_log` | — | Sending spine. |
| `comm_letterhead`, `comm_layout_block`, `comm_email_signature`, `comm_print_footer`, `comm_disclaimer` | — | Branding assets composed at render time. |
| `comm_media_asset`, `comm_media_asset_version`, `comm_asset_*` | — | Media/asset library. |

### 2.3 Legacy (still writable — must be gated in Phase 5)

| Table | Rows | Notes |
|-------|------|-------|
| `notification_templates` | 132 | Second template store. Written by legacy modules; read by `render_email_template`. |
| `notification_template_versions` | 18 | Versioning of the legacy store. |
| `notification_template_audit_logs` | — | Audit for the legacy store. |
| `notification_types` / `notification_providers` / `notification_queue` / `notification_logs` | — | Direct-send queue (bypass path). |
| `email_layout_components` | — | Header/footer used by `render_email_template`. |

### 2.4 Module-specific (letters / notices / correspondence)

Classified **legacy** unless a Hub migration exists.

| Table | Domain |
|-------|--------|
| `c3_template`, `c3_email_templates` (14) | C3 filings. |
| `ce_notice_templates` (7), `ce_document_templates`, `ce_audit_communication_templates`, `ce_audit_communication_template_actions`, `ce_audit_communication_template_sections`, `ce_document_template_sections`, `ce_document_template_settings`, `ce_number_templates`, `ce_audit_field_stage_template_map` | Compliance/enforcement. |
| `ia_document_templates`, `ia_document_template_sections`, `ia_document_template_settings`, `ia_checklist_templates`, `ia_checklist_template_items`, `ia_distribution_templates`, `ia_mitigation_templates`, `ia_audit_plan_templates`, `ia_template_policy_matrix` | Internal Audit. |
| `legal_templates` (15), `lg_document_template_registry`, `lg_intake_checklist_template`, `lg_stage_template_mapping` | Legal. |
| `bn_workflow_template`, `bn_formula_template`, `bn_screen_template` | Benefits. |
| `security_template`, `ssp_correspondence_template_binding` | Cross-cutting. |

### 2.5 Duplicate / bypass risks

- `notification_templates` overlaps with `core_template` (D8).
- Naming duplication `BENEFITS_CLAIM_APPROVAL_EMAIL` vs `BENEFITS-EMAIL-CLAIM-RECEIVED` (D5).
- Any module still writing to `notification_queue` bypasses the Hub (D8).
- In-code Edge-Function-embedded templates: none discovered inside `supabase/functions` for send-time rendering, but branding-side `.replace` calls in `src/lib/enterprise/**` are effectively code-embedded templates.

---

## 3. Rendering implementations

Every implementation that touches `{{token}}` substitution, subject/body assembly,
or direct provider send. Classification per §3 of the task.

### 3.1 Database functions

| Function | Signature | Reads | Writes | Provider? | Classification | Callers |
|---|---|---|---|---|---|---|
| `comm_hub_render_template` | `(p_source text, p_context jsonb) → jsonb` | none | none | no | **Canonical seed** — pure token substitution, returns `{rendered, unresolved}`. Should become the base of Phase 2's `render_comm_hub_content`. | Not currently called by `prepare_comm_hub_preview` (D1). |
| `prepare_comm_hub_preview` | `(p_payload jsonb) → jsonb` | template + version + sender + scenario | inserts `communication_preview_snapshot` | no | **Duplicate renderer** — carries its own subject/HTML/text token replacement instead of delegating. Just patched for `subject`/`body_html`/`body_text` field-name defect. | `previewApprovalService.ts` (P3F Preview). |
| `render_comm_hub_template_preview` | `(p_payload jsonb) → jsonb` | template + version | none | no | **Legacy preview** — older resolver; superseded by `prepare_comm_hub_preview` but still deployed. | `commHubPreviewService.ts` still calls it. |
| `render_email_template` | `(p_template_id uuid, p_variables jsonb) → text` | `notification_templates` + `email_layout_components` | none | no | **Legacy** — reads the legacy store, composes header+body+footer, no unresolved-token reporting, no escaping. | Legacy email path. |
| `core_resolve_template` / `core_resolve_template_version` | `(p_code text, p_country text)` | `core_template` | none | no | Canonical resolvers (not renderers). | Referenced by Hub RPCs. |
| `execute_comm_hub_dry_run` | `(p_payload jsonb)` | snapshot | writes execution rows | no | Orchestrator — must consume approved snapshot only. | Dry-run flow. |
| `begin_comm_hub_controlled_live` / `finalize_comm_hub_controlled_live` / `revalidate_comm_hub_send_decision` | various | full stack | writes execution + delivery | provider indirectly | Orchestrator — recently corrected for MD5 recipient hash + sender fallback. | `comm-hub-controlled-live-test` edge function. |

Missing from DB but referenced historically: `render_comm_hub_template(text, jsonb)` (the exact signature that produced `function ... does not exist`). Only `comm_hub_render_template` exists — Phase 2 must reconcile the two names and force all callers to a single canonical.

### 3.2 Repository (TypeScript) renderers and `{{token}}` sites

| File | Behaviour | Writes | Provider? | Classification |
|---|---|---|---|---|
| `src/lib/enterprise/NotificationResolver.ts` L95–L110 | Two regex passes: `asset.*` substitution + generic `{{key}}` resolution against tokens map. | none | no | **Duplicate** — should call the canonical content renderer. |
| `src/lib/enterprise/resolvers/emailBrandingResolver.ts` L375–L429 | Nine `.replace` calls composing branding blocks (BODY, SIGNATURE_BLOCK, FOOTER_BLOCK, DISCLAIMER_BLOCK). | none | no | **Legacy branding composer** — must be split: branding assembly is legitimate; token substitution inside branding is duplicate. |
| `src/hooks/useWorkflowFieldUpdates.ts` L209–L215 | Substitutes workflow-context tokens directly. | none | no | **Bypass** — workflow content should go through the Hub. |
| `src/data/legalTemplates.ts` L332 | Legal-templates test data substituting `{{total}}`. | none | no | **Legacy test fixture**. |
| `src/lib/legal/departmentMergeContext.ts` L101 | Merges `{{dept.*}}` tokens. | none | no | **Duplicate** — should reuse content renderer. |
| `src/pages/admin/communicationHub/preview/commHubPreviewService.ts` | Wraps `render_comm_hub_template_preview`. | none | no | **Compatibility** — keep signature, delegate to Phase 2 renderer. |
| `src/platform/communication-hub/previewApprovalService.ts` | Calls `prepare_comm_hub_preview`. | none (RPC does) | no | **Compatibility**. |

### 3.3 Direct provider / send-bypass paths

| File | Behaviour | Risk |
|---|---|---|
| `src/modules/legal/communication/legalAssignmentWorkflow.ts` | Writes to `notification_queue` directly. | **Bypass** (D8) — must migrate to `sendCommunication({...})`. |
| Various `src/pages/admin/**` (NotificationTemplates, NotificationManagement, NotificationLogs, EmailLogs, DependencyScan) | Admin surfaces for the legacy store. | Read-only admin — acceptable during migration; must be marked "compatibility". |
| `src/pages/admin/communicationHub/**` (safety/recipientControl/controlCenter/productionReadiness) | Read/write `notification_*` for legacy-parity views. | Compatibility — will be replaced by Hub-only views in Phase 4. |

No `Resend`, `SendGrid`, `sgMail`, or `nodemailer` imports were found in `src/`
outside test fixtures — provider calls only happen inside edge functions
(`comm-hub-dispatch`, `comm-hub-controlled-live-test`), which is correct.

---

## 4. Sender profile inventory

15 active, verified sender profiles exist. One is `is_default = true`
(`SENDER_NOTIFICATIONS @ notifications@secureserve.biz`). All others are
module-specific (Benefits, Compliance, Legal, Workflow, Registration, etc.)
and `provider_identity_status = 'verified'`, `domain_verified = true`.

Implication for Phase 2/3:
- Deterministic sender resolution rule already implementable:
  event-mapping sender → module-scoped sender → default.
- The prior `controlled_live_sender_profile_missing` was purely a snapshot-binding
  defect, not an inventory defect.

---

## 5. What Phase 1 leaves for Phase 2

- One canonical `render_comm_hub_content(content, tokens, output_context)` built
  atop the existing pure `comm_hub_render_template` body.
- One canonical `render_comm_hub_template_version(template_version_id, …)` that
  loads the version, validates channel/type/fields, calls the content renderer
  per field, and returns structured blockers + content hash.
- Convert `prepare_comm_hub_preview`, `render_comm_hub_template_preview`, and
  `render_email_template` into thin wrappers.
- Reconcile `core_template_version.status` casing (Phase 3 lifecycle).
- Bind `communication_hub_template_variable_contract` rows to their template
  version (Phase 3 variable contract).

No changes were made this turn.
