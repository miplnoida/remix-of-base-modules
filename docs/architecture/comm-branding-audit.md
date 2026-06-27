# Phase 1 — Communication & Branding Table Audit

> Deliverable for the Enterprise Communication & Branding Framework refactor.
> Status = **Existing** unless flagged **New**. No new tables are proposed until each "Reuse Decision" below is confirmed by the user.
> Owner Screen = the single screen authoritatively responsible for maintaining the row. Consumer Screens = read-only or scoped-override users.

Legend for Reuse Decision:
- **REUSE** — keep as-is, becomes canonical source for its concern.
- **REUSE+EXTEND** — keep table, add columns/JSONB in later phase migration.
- **CONSOLIDATE → X** — merge into table X; deprecate after data move.
- **RETIRE** — table is dead/duplicate; data migrates then table is dropped.
- **CONFIRM** — table is ambiguous; need user confirmation of intent before deciding.

---

## 1. Organization & Structural Identity

| Table | Status | Purpose | Owner Screen | Consumer Screens | Duplicate Of | Reuse Decision |
|---|---|---|---|---|---|---|
| `core_organization` | Existing | Organization identity, defaults, branding defaults, default policies | Organization Profile | All resolvers, Portal Branding, Receipt, Templates | — | **REUSE+EXTEND** (add `default_letterhead_id`, `default_signature_asset_id`, `default_stamp_asset_id`, `default_seal_asset_id`, `default_email_signature_id`, `default_disclaimer_id`, `default_print_footer_id`, `default_theme_key`, `default_logo_master_asset_id`) |
| `core_department` | Existing | Department list (codes, names, hierarchy) | Departments & Units | All resolvers | — | **REUSE** |
| `core_department_profile` | Existing | Department behaviour, contacts, comm overrides, manager, DMS defaults | Department Communication | Templates, Notifications, Document Generation | — | **REUSE+EXTEND** (add explicit override flags + override asset/text-block ids) |
| `core_department_location` | Existing | Department ↔ location mapping | Locations / Branches | Org Profile, Departments | partially `office_locations` | **REUSE**; cross-check with `office_locations` (see below) |
| `core_team` | Existing | Team membership | Departments | Workbasket, Notifications | — | **REUSE** (out of comm scope, listed for completeness) |
| `core_workbasket` | Existing | Workbasket definitions | Departments | Notifications, Routing | — | **REUSE** |
| `office_locations` | Existing | Physical office addresses, IP ranges, opening hours | Locations / Branches / Service Centers | Org Profile, Department Profile, Receipt | overlaps `core_department_location` (mapping table) | **REUSE** as the canonical location record; `core_department_location` becomes pure many-to-many mapping |
| `office_ip_addresses` | Existing | Office IP whitelist | Locations | Cashier office detection | — | **REUSE** (security concern, not comm) |
| `core_module_department_map` | Existing | Module ↔ owning department | Departments | All modules | — | **REUSE** |
| `app_modules` | Existing | Module registry | Sidebar / Admin | DepartmentResolver | — | **REUSE** |

**Conflict to resolve before Phase 2:** `core_department_location` vs `office_locations` — must clarify "location-as-mapping" vs "location-as-record". Proposal: `office_locations` = the place; `core_department_location` = which departments operate there.

---

## 2. Communication Assets

| Table | Status | Purpose | Owner Screen | Consumer Screens | Duplicate Of | Reuse Decision |
|---|---|---|---|---|---|---|
| `comm_media_asset` | Existing | Master record for every logo/seal/stamp/signature/QR/watermark/icon/image | Communication Assets Library | Templates, Letterheads, Portal Branding, Receipts, Notifications, Document Generation | — | **REUSE+EXTEND** (add `master_asset_id` parent link, `derivation_role` enum: favicon/sidebar/login/email/document/watermark/qr/mobile_icon) |
| `comm_media_asset_version` | Existing | Asset version history | Communication Assets Library | All consumers via resolver | — | **REUSE** as the home of derived renditions (favicon, mobile icon, watermark, etc.) from one master logo |
| `comm_asset_mapping` | Existing | Scope an asset to org/department/module/location/communication-type with effective dates and priority | Communication Assets Library | CommunicationAssetResolver | — | **REUSE** as the central inheritance/override table for assets |
| `comm_asset_audit_log` | Existing | Asset change audit | — (system) | Audit screens | — | **REUSE** |

---

## 3. Text Blocks & Reusable Wording

| Table | Status | Purpose | Owner Screen | Consumer Screens | Duplicate Of | Reuse Decision |
|---|---|---|---|---|---|---|
| `core_text_block` | Existing | Reusable paragraphs (disclaimer, appeal rights, employer instructions, office hours, confidentiality, payment instructions, footer notes) | Text Blocks | Templates, Notifications, Letterheads, Receipts, Portal | — | **REUSE+EXTEND** (add `code` unique key, `scope` enum: GLOBAL/ORGANIZATION/DEPARTMENT/MODULE, `parent_text_block_id` for inheritance, `body_html` + `body_text` + `body_md` parity) |
| `comm_disclaimer` | Existing | Legacy disclaimers table | Text Blocks (after merge) | Templates, Letterheads | duplicates `core_text_block` purpose | **CONSOLIDATE → `core_text_block`** (migrate rows with `code='DISCLAIMER_*'`; drop table in later phase) |
| `comm_print_footer` | Existing | Legacy print footer text | Text Blocks (after merge) | Letterheads, Receipts | duplicates `core_text_block` purpose | **CONSOLIDATE → `core_text_block`** (migrate as `code='PRINT_FOOTER_*'`) |
| `comm_email_signature` | Existing | Email signature blocks (per user / per department) | Text Blocks (or Department Communication — see conflict) | Notification Templates (email channel) | partially `core_text_block` | **CONFIRM**: keep as specialised table because it links to user/department, OR fold into `core_text_block` with scope tags. Recommend **REUSE** as-is and let `TextBlockResolver` expose them under a virtual prefix `EMAIL_SIG/*`. |

---

## 4. Letterheads & Print Surfaces

| Table | Status | Purpose | Owner Screen | Consumer Screens | Duplicate Of | Reuse Decision |
|---|---|---|---|---|---|---|
| `comm_letterhead` | Existing | Letterhead design (header, footer, margins, signature/stamp placement, JSONB `design_config`) | Official Communication Templates | Document Generation, Receipts, Letters | — | **REUSE+EXTEND** (already extended in prior phases — keep) |

---

## 5. Official Communication Templates

| Table | Status | Purpose | Owner Screen | Consumer Screens | Duplicate Of | Reuse Decision |
|---|---|---|---|---|---|---|
| `core_template` | Existing | Template master | Official Communication Templates | Document Generation, Notifications (where shared) | — | **REUSE+EXTEND** (add `parent_template_id` for inheritance, `owner_scope` enum ORG/DEPT/MODULE) |
| `core_template_version` | Existing | Versioning | Official Communication Templates | Document Generation | — | **REUSE** |
| `core_template_channel` | Existing | Channel definitions per template | Official Communication Templates | Notification, Document Generation | — | **REUSE** |
| `core_template_channel_variant` | Existing | Variant body per channel (PRINT/EMAIL/SMS/PORTAL) | Official Communication Templates | Notification, Document Generation | — | **REUSE** |
| `core_template_section` | Existing | Named sections within a template | Official Communication Templates | Designer | — | **REUSE** |
| `core_template_layout` | Existing | Page layouts | Official Communication Templates | Document Generation | — | **REUSE** |
| `core_template_token` | Existing | Token catalogue ({{...}} variables) | Official Communication Templates | Designer, Document Generation | — | **REUSE+EXTEND** (add token types `text_block`, `asset`, `org_field`, `department_field`) |
| `core_template_variable_binding` | Existing | Bind tokens to data sources | Official Communication Templates | Document Generation | — | **REUSE** |
| `core_template_localization` | Existing | Locale variants | Official Communication Templates | Document Generation | — | **REUSE** |
| `core_template_category` | Existing | Template categorisation | Official Communication Templates | Designer filters | — | **REUSE** |
| `core_template_approval` | Existing | Approval workflow for template publish | Official Communication Templates | — | — | **REUSE** |
| `core_template_usage` | Existing | Where/when a template was used | — (system) | Reference Integrity, Health Dashboard | — | **REUSE** — also used by safe-delete |
| `core_template_schedule_policy` | Existing | When templates may fire | Notification Templates | Notification engine | — | **REUSE** |
| `core_template_legal_reference` | Existing | Legal citations attached to a template | Official Communication Templates | Document Generation | — | **REUSE** |

---

## 6. Notification Templates & Delivery

| Table | Status | Purpose | Owner Screen | Consumer Screens | Duplicate Of | Reuse Decision |
|---|---|---|---|---|---|---|
| `notification_templates` | Existing | Per-event message wording (email/SMS/in-app/push) | Email / SMS / Notification Templates | Notification engine, modules | overlaps `core_template_channel_variant` for transactional sends | **CONFIRM**: keep as the operational table; `core_template_*` remains the design-time template authoring stack; `notification_templates` rows must FK to a `core_template_version` once consolidated. Decision: **REUSE+EXTEND** with optional `core_template_version_id` link. |
| `notification_template_versions` | Existing | Version history | Notification Templates | — | partially `core_template_version` | **REUSE** until consolidation later |
| `notification_template_audit_logs` | Existing | Audit | — (system) | Audit | — | **REUSE** |
| `notification_types` | Existing | Event/type catalogue | Notification Templates | Modules emitting events | — | **REUSE** |
| `notification_providers` | Existing | Email/SMS/push provider config | Settings | Notification engine | — | **REUSE** |
| `notification_queue` | Existing | Outbound queue | — (runtime) | Engine | — | **REUSE** |
| `notification_logs` | Existing | Send history | — (system) | Reporting | — | **REUSE** |
| `email_layout_components` | Existing | Reusable email layout chunks | Email Templates | Notification engine | partially `core_template_section`/`core_text_block` | **REUSE** for now; flag for consolidation when email layouts move to text-block tokens (Phase 8) |
| `email_campaigns` | Existing | Marketing/campaign sends | (out of scope) | — | — | **OUT-OF-SCOPE** for this framework, no change |
| `in_app_notifications` | Existing | In-app inbox | — (runtime) | UI | — | **REUSE** (out of comm scope) |
| `user_notification_preferences` | Existing | Per-user channel prefs | User Settings | Notification engine | — | **REUSE** |

---

## 7. Document Generation & DMS

| Table | Status | Purpose | Owner Screen | Consumer Screens | Duplicate Of | Reuse Decision |
|---|---|---|---|---|---|---|
| `core_generated_document` | Existing | Every document ever rendered: template/version/org/dept/assets/text-blocks/PDF/history/DMS id | — (system, written by DocumentGenerationResolver) | All modules, audit, health dashboard | — | **REUSE+EXTEND** (add `asset_ids_used uuid[]`, `text_block_ids_used uuid[]`, `letterhead_id`, `print_history jsonb`, `email_history jsonb`, `portal_history jsonb`) |
| `core_generated_document_legal_reference` | Existing | Legal cites embedded in a generated doc | — (system) | Audit | — | **REUSE** |
| `core_document_signature_usage` | Existing (recent) | Audit of signature/stamp/seal/approval stamp use per generated doc | — (system) | Audit | — | **REUSE** |
| `core_document_test_print_log` | Existing (recent) | Test-print history | Template Designer | Audit | — | **REUSE** |
| `core_document_sequence` | Existing | Per-doc-type numbering | Number Sequences | Document Generation | — | **REUSE** |
| `core_document_storage_config` | Existing | Storage destination config | Settings | Document Generation | — | **REUSE** |
| `core_dms_api_config` | Existing | DMS endpoint config | Settings | Document Generation | — | **REUSE** |
| `core_dms_document_type` | Existing | DMS doc-type registry | Settings | Document Generation, Modules | — | **REUSE** |
| `core_dms_module_mapping` | Existing | Module ↔ DMS folder | Settings | Document Generation | — | **REUSE** |
| `core_dms_provider` | Existing | DMS providers | Settings | DMS config | — | **REUSE** |
| `core_dms_storage_policy` | Existing | Retention/encryption policy | Settings | Document Generation, DMS | — | **REUSE** |
| `dms_transfer_queue` | Existing | Async DMS upload queue | — (runtime) | Workers | — | **REUSE** |

---

## 8. Portal Branding & Theming

| Table | Status | Purpose | Owner Screen | Consumer Screens | Duplicate Of | Reuse Decision |
|---|---|---|---|---|---|---|
| `app_themes` | Existing | CSS variable themes (light/dark) | Public Portal Branding | App shell, Portal | — | **REUSE+EXTEND** (link `logo_asset_id`, `favicon_asset_id`, `login_banner_asset_id` instead of duplicating URLs) |
| `user_theme_preferences` | Existing | Per-user theme override | User Settings | App shell | — | **REUSE** |

**No new branding table.** Portal Branding screen reads `core_organization` + `comm_media_asset` (via mapping) + `app_themes`.

---

## 9. Receipts / Statements / Certificates

| Table | Status | Purpose | Owner Screen | Consumer Screens | Duplicate Of | Reuse Decision |
|---|---|---|---|---|---|---|
| `cn_receipt`, `cn_receipt_prints` | Existing | Receipt records & print log (financial) | Payments | Document Generation | — | **REUSE** as transactional records; do NOT store branding here |
| (no `receipt_template` table found) | — | Receipt visual layout | Official Communication Templates | Document Generation | — | **Receipt becomes a `core_template` with category=`RECEIPT`.** No new branding table for receipts. |

**Decision:** receipts/statements/certificates are template categories inside `core_template`, not their own branding silos. Any current hardcoded receipt HTML moves into `core_template_version`.

---

## 10. New Tables Proposed (Phase 3+)

| Proposed Table | Justification | Alternative Reuse Considered |
|---|---|---|
| `enterprise_health_finding` (Phase 13) | Persist health-check results for dashboard + history | Could be a view; persistence gives history/trend |
| (none for resolvers — services are code only) | — | — |
| (none for inheritance — handled by existing scope columns on `comm_asset_mapping`, new `parent_template_id`, new `parent_text_block_id`) | — | — |

**Net: at most 1 new table for the entire framework.** Everything else is column extensions and JSONB additions on tables that already exist.

---

## 11. Hardcoded-Content Hotspots (for Phase 8 remediation)

To be enumerated by `rg` scan during Phase 8. Initial candidates surfaced from prior work:
- `src/lib/htmlToPdf.ts` watermark text
- `src/lib/comm/buildSignatureBlockHtml.ts` placeholders ("SIGNATURE PENDING", "DRAFT", "TEST PRINT")
- Letter footers in any `*Letter.tsx` or `*Notice.tsx`
- Receipt HTML inside payments module
- Email body strings inside edge functions under `supabase/functions/*/index.ts`

A `scripts/audit-hardcoded-comm.mjs` script will be added in Phase 8 to grep and report.

---

## 12. Open Questions for User Before Phase 2

1. **`comm_disclaimer` + `comm_print_footer` → `core_text_block` consolidation** — confirm OK to migrate and drop these tables (data preserved).
2. **`comm_email_signature`** — keep as a specialised table (recommended) or fold into `core_text_block`?
3. **`notification_templates` vs `core_template_channel_variant`** — confirm dual-track is acceptable short-term (operational vs design-time), with a future consolidation phase.
4. **`office_locations` vs `core_department_location`** — confirm split: `office_locations` = the place, `core_department_location` = department↔location mapping.
5. **Receipt/Statement/Certificate** — confirm they become `core_template` rows under category `RECEIPT`/`STATEMENT`/`CERTIFICATE` instead of their own branding tables.
6. **Persisted health findings** — OK to add the one new table `enterprise_health_finding` in Phase 13, or keep purely runtime?

---

## 13. Summary

- **Tables reused as-is:** 31
- **Tables reused with column extensions:** 9 (`core_organization`, `core_department_profile`, `comm_media_asset`, `core_text_block`, `comm_letterhead`, `core_template`, `core_template_token`, `core_generated_document`, `app_themes`)
- **Tables consolidated (data migrated, table dropped later):** 2 (`comm_disclaimer`, `comm_print_footer`)
- **New tables:** 0 in Phases 1–12; **1 optional** in Phase 13 (`enterprise_health_finding`)

This satisfies the "do not create duplicate tables" rule.
