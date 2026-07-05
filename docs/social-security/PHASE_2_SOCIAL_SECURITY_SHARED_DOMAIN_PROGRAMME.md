# Phase 2 — Social Security Shared Domain Programme

**Status**: Programme of record. Converts the approved Enterprise Core (Epics 1.1.x, 1.2, 2.0.x) into the Social Security Platform. After approval, every future prompt implements *this* programme — no additional planning documents will be produced.

**Rules (non-negotiable)**
- Reuse existing canonical screens, tables, services, and hooks. No parallel implementations.
- Live menu remains `app_modules`-driven. No static menus.
- No structural changes to BEMA / legacy `tb_*`, `ip_*`, `er_*`, `cl_*`, `cn_*`, `au_*`, `ia_*`, `lg_*`, `bema_*` tables — adapter views only, and only via `BEMA_LEGACY_TABLE_IMPACT_NOTE.md`.
- Every capability delivered registers into `enterprise_capability_registry`.
- BN Product Builder (Epic 0.40) stays ON HOLD for the entire programme.

---

## 1. Domain summary & classification

| # | Shared Domain | Canonical Owner | Framework Dependency | Status |
|---|---|---|---|---|
| 1 | Identity | Enterprise Core (Auth + Profiles + Roles) | Organisation Foundation, Reference Framework | **PARTIAL** |
| 2 | Geography | Enterprise Core | Reference Framework | **PARTIAL** |
| 3 | Organisation Extensions | Organisation Foundation | Organisation Foundation, Reference Framework | **PARTIAL** |
| 4 | Legal | Legal Module (canonical) | Reference Framework, Document, Organisation | **READY** |
| 5 | Financial Reference | Enterprise Core (Ledger + Numbering) | Reference Framework, Organisation | **PARTIAL** |
| 6 | Participant | Contributor / IP + Employer canonical | Identity, Reference Framework, Document | **PARTIAL** |
| 7 | Communication | Comm/Template canonical | Reference Framework, Document, Organisation | **READY** |
| 8 | Document | Core Document Profile + DMS Provider | Reference Framework, Organisation | **PARTIAL** |

Legend: READY = reusable as-is; PARTIAL = canonical exists, gaps to close; NOT STARTED = no canonical; DEFERRED = intentionally out of Phase 2.

---

## 2. Domain-by-domain plan

### 2.1 Identity — **PARTIAL**

- **Current implementation**: `profiles`, `roles`, `user_roles`, `role_permissions`, `password_policies`, `password_history`, `mfa_config`, `login_security_events`, `security_users`; screens under `/admin/users`, `/admin/roles`, `/admin/security/*`; Supabase Auth for sessions.
- **Reusable assets**: profile CRUD, role assignment, MFA, password policy, security logs, `has_role`-style checks via `user_roles`.
- **Canonical owner**: Enterprise Core.
- **Consumers**: every module.
- **Missing capability**:
  - Unified `identity_service` facade (currently modules query `profiles` / `user_roles` directly).
  - External identity link (`external_user_person_link`, `external_persona_audit`) has no admin surface.
  - Delegation UX for `bn_role_delegation` is BN-scoped; needs a shared delegation console.
- **Required enhancements**: identity facade hook (`useIdentity`, `useCurrentUser`, `useHasRole`), external persona admin tab under existing Users screen, generic delegation console reusing existing tables.
- **Implementation waves**: Wave 1.
- **Complexity**: M.
- **Dependencies**: none new.
- **Acceptance**: every module reads identity through `useIdentity`; no direct `profiles`/`user_roles` queries in new code; external persona and delegation visible under existing Users screen tabs.

### 2.2 Geography — **PARTIAL**

- **Current implementation**: `tb_country` (legacy), `bn_country*` (BN-scoped), `office_locations`, `core_department_location`, `rf_address_link`, `rf_mail_address`, `tb_district` (legacy).
- **Reusable assets**: country/district reference values (should migrate into Reference Framework), address model already in `rf_*`.
- **Canonical owner**: Enterprise Core (Reference Framework for country/state/district; Organisation Foundation for offices/locations).
- **Consumers**: all products.
- **Missing capability**:
  - No canonical country/state/district `reference_group` — BN and legacy hold private copies.
  - No shared address service; modules format addresses ad-hoc.
- **Required enhancements**: Reference Framework groups `geo.country`, `geo.state`, `geo.district`, `geo.postal_area`; `useGeography` facade; adapter view for `tb_country` → reference group (no drop). `bn_country*` remains untouched (BN-scoped).
- **Implementation waves**: Wave 1.
- **Complexity**: S.
- **Dependencies**: Reference Framework (already active).
- **Acceptance**: canonical geography groups seeded and adopted by ≥ Organisation Foundation + Participant module; adapter view over `tb_country` documented; no BEMA changes.

### 2.3 Organisation Extensions — **PARTIAL**

- **Current implementation**: Organisation Foundation active (Epic 2.0.1); `core_organization`, `core_department`, `office_locations`, `designation_hierarchy`, `public_holidays`, plus grouping modules `admin_org_*`.
- **Reusable assets**: `OrganizationManagementShell`, `OrganizationProfilePage`, `OfficesAdmin`, `DepartmentsAdmin`, `PublicHolidaysSection`.
- **Canonical owner**: Organisation Foundation.
- **Consumers**: all products.
- **Missing capability**:
  - `core_calendar` (business calendar with working days/hours) — proposed additively in Epic 2.0.2 plan, not yet built.
  - Working-week service.
  - Time-zone service.
  - Branding facade beyond letterhead/media library.
- **Required enhancements**: `core_calendar` table (additive), `useCoreCalendar`, `useWorkingWeek`, `useTimezone`, `useBranding` facades — added as leaves inside the existing shell (no new module).
- **Implementation waves**: Wave 1 (facades over existing data) → Wave 3 (calendar schema + working-week binding).
- **Complexity**: M.
- **Dependencies**: Reference Framework (timezone group).
- **Acceptance**: three tabs (Calendar, Holidays, Working Week) inside `OrganizationManagementShell` per Epic 2.0.2 plan; facades exported from `@/services/organisation`.

### 2.4 Legal — **READY**

- **Current implementation**: `lg_*` canonical set (matter, case, hearing, judgment, order, referral, workbaskets, teams, SLA, fees, etc.) with 14-section canonical sidebar and shared `v_lg_case_financials` (per memory).
- **Reusable assets**: full Legal module, `legal_reference_type`, `core_legal_reference`, financial aggregation view.
- **Canonical owner**: Legal Module.
- **Consumers**: Compliance/Enforcement, Benefits (appeals), Contributions (recovery), future Prison/Licensing.
- **Missing capability**:
  - Shared `legal_referral_service` facade for non-Legal modules (Compliance already couples directly).
  - Registry entry in `enterprise_capability_registry` (add on programme start).
- **Required enhancements**: publish `useLegalReferral`, `useLegalReferences`, `useLegalCase` facades reading canonical `lg_*` tables; retarget Compliance/BN legal calls onto the facade over subsequent waves. No schema change.
- **Implementation waves**: Wave 2.
- **Complexity**: S.
- **Dependencies**: Document (referral packs), Organisation (teams/workbaskets).
- **Acceptance**: at least Compliance module consumes legal via `useLegalReferral`; catalogue entry `legal_module` marked active.

### 2.5 Financial Reference — **PARTIAL**

- **Current implementation**: `core_ledger_head`, `core_employer_ledger_*`, `core_ledger_payment_allocation`, `core_payment_allocation*`, `core_payment_arrangement*`, `core_number_sequence*`, `cashier_currency_config`, `tb_currencies`, `tb_deductions_tax_table_*`, `payment_module_config`, `bn_payment_*` (BN-scoped), `cn_*` (contributions cashier — legacy).
- **Reusable assets**: `core_ledger_*`, `core_number_sequence*`, allocation rules.
- **Canonical owner**: Enterprise Core (Financial Reference).
- **Consumers**: Contributions, Benefits, Compliance, Legal, HRMS, Payroll.
- **Missing capability**:
  - No canonical currency reference group (currently `tb_currencies` legacy + BN copy).
  - No shared `useNumbering` façade covering both `core_number_sequence` and `system_reference_sequence`.
  - No shared `useLedger` façade — every module writes to `core_*ledger*` directly.
  - Tax tables in `tb_deductions_tax_table_*` remain BEMA-adjacent and untouched.
- **Required enhancements**: reference groups `finance.currency`, `finance.ledger_head_type`, `finance.allocation_rule`; facades `useNumbering`, `useLedger`, `useAllocationRule`; adapter view `v_currency_master` over `tb_currencies`; no BEMA changes.
- **Implementation waves**: Wave 2.
- **Complexity**: M.
- **Dependencies**: Reference Framework, Organisation (office-scoped numbering).
- **Acceptance**: any new module writing to `core_ledger_*` does so exclusively through `useLedger`; numbering unified through `useNumbering`.

### 2.6 Participant — **PARTIAL**

- **Current implementation**: canonical `ip_master` + supporting `ip_*` and `er_master` + supporting `er_*` (legacy SSN model); `contributor_profiles`, `bema_contributors` (legacy shadow); `bn_claim_person_snapshot`, `bn_claim_employer_snapshot` for BN snapshots.
- **Reusable assets**: `ip_master`, `er_master`, `ip_names`, `ip_depend`, `ip_documents`, `er_locations`, `er_owner`.
- **Canonical owner**: shared Participant domain (owned by Contributions historically; must be elevated to shared).
- **Consumers**: all products.
- **Missing capability**:
  - No canonical `Participant` facade (Person / Employer / Dependant / Provider); each module joins raw `ip_*`/`er_*`.
  - No participant-type registry; BN has its own `bn_country_participant_type`.
  - No unified search/360 view surface outside legacy screens.
- **Required enhancements**: read-only adapter views `v_participant_person`, `v_participant_employer`, `v_participant_dependant`; facades `useParticipant`, `useParticipantSearch`, `useParticipant360`; canonical participant-type reference group. **No structural changes to `ip_*`/`er_*`** (BEMA-adjacent) — adapter views only, per `SCREEN_AND_LEGACY_TABLE_GOVERNANCE_RULES.md`. Any structural proposal requires `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` first.
- **Implementation waves**: Wave 3.
- **Complexity**: L.
- **Dependencies**: Identity (external persona link), Geography, Document, Reference Framework.
- **Acceptance**: new modules read participants only via facades; existing legacy screens remain untouched; participant catalogue entry active.

### 2.7 Communication — **READY**

- **Current implementation**: `core_template*`, `core_text_block`, `comm_layout_block`, `comm_letterhead`, `comm_email_signature`, `comm_print_footer`, `comm_disclaimer`, `comm_media_asset*`, `notification_templates`, `notification_providers`, `notification_queue`, `notification_logs`, `in_app_notifications`, `email_*`, `ce_audit_communication*` (Compliance-scoped).
- **Reusable assets**: full template engine (`TemplateDesignerDialog`, template layout/section/token/version), notification provider stack, letterhead/signature/footer library.
- **Canonical owner**: Enterprise Core (Communication).
- **Consumers**: all products.
- **Missing capability**:
  - Shared `notificationService` / `useNotify` facade (Compliance uses its own; others use `notification_queue` directly).
  - Shared `templateService` for rendering already exists structurally — needs explicit facade export.
- **Required enhancements**: publish `useNotify`, `useTemplateRender`, `useCommunicationAssets`; retarget module-scoped stacks (BN, CE) onto the facade in later waves (contract only in Phase 2).
- **Implementation waves**: Wave 3.
- **Complexity**: S.
- **Dependencies**: Document (attachments), Organisation (branding).
- **Acceptance**: at least Organisation and Legal consume via `useNotify`; catalogue entry active.

### 2.8 Document — **PARTIAL**

- **Current implementation**: `core_document_profile`, `core_document_sequence`, `core_document_storage_config`, `core_generated_document*`, `core_dms_*` (provider, storage policy, module mapping, document type, API config), `dms_transfer_queue`, per-module document tables (`bn_claim_document`, `ce_case_documents`, `ia_working_papers`, `lg_document_link`, `ip_documents`, `er_documents`).
- **Reusable assets**: DMS provider abstraction, storage policy, generated-document pipeline, document type registry.
- **Canonical owner**: Enterprise Core (Document / DMS).
- **Consumers**: all products.
- **Missing capability**:
  - No shared `documentService` facade — modules call `core_dms_*` and storage directly.
  - No unified upload/preview component; every module built its own.
  - No document-purpose → module mapping consumed centrally (`document_purpose_rules` exists but is orphaned in new code).
- **Required enhancements**: `useDocument`, `useDocumentUpload`, `useDocumentPreview`, `useDocumentPurpose`; shared `<DocumentUpload />` and `<DocumentViewer />` primitives reusing existing shadcn/lucide UI. Per-module document tables remain owned by their modules; the facade fans out via `core_dms_module_mapping`.
- **Implementation waves**: Wave 4.
- **Complexity**: L.
- **Dependencies**: Communication (attachments), Organisation (org-scoped storage), Reference Framework (document types).
- **Acceptance**: at least Organisation, Legal and new Participant surfaces consume via `useDocument`; catalogue entry active; no changes to per-module document tables.

---

## 3. Implementation waves

Every wave is additive. Every wave ends by registering/updating rows in `enterprise_capability_registry`. Every wave rollback is: revert code, delete new facade files, drop new tables if any (never legacy), remove new `app_modules` rows + `role_permissions` grants.

### Wave 1 — Identity & Geography (foundation facades)

- **Repository impact**
  - **Tables**: none new. Adapter view `v_currency_master` deferred to Wave 2.
  - **Screens**: extend existing `/admin/users` (add "External Personas" and "Delegation" tabs); no new routes.
  - **Services**: `identityService`, `geographyService` under `src/services/enterprise/`.
  - **Hooks**: `useIdentity`, `useCurrentUser`, `useHasRole`, `useGeography`, `useCountries`, `useDistricts`.
  - **Permissions**: reuse existing `admin_users`, `admin_reference_framework`; no new modules.
  - **Menu**: no change (tabs inside existing shell).
  - **Catalogue registration**: `identity_service`, `geography_service` rows (status = active).
  - **Rollback**: revert extended tabs; delete new files under `src/services/enterprise/` and matching hooks; delete two catalogue rows.

### Wave 2 — Legal & Financial Reference (facade contracts)

- **Repository impact**
  - **Tables**: adapter views only — `v_currency_master` over `tb_currencies`; no schema changes to `lg_*` or `core_ledger_*`.
  - **Screens**: none new — Legal reused as-is; Ledger admin tab added inside existing Platform Admin > Financial group (no new shell).
  - **Services**: `legalReferralService`, `ledgerService`, `numberingService`, `allocationRuleService`.
  - **Hooks**: `useLegalReferral`, `useLegalReferences`, `useLegalCase`, `useLedger`, `useNumbering`, `useAllocationRule`.
  - **Permissions**: reuse existing Legal + Platform Admin permissions.
  - **Menu**: no new items.
  - **Catalogue registration**: `legal_module`, `financial_reference` rows.
  - **Rollback**: drop adapter view; delete new service/hook files; remove two catalogue rows.

### Wave 3 — Participant & Communication (facade + read views)

- **Repository impact**
  - **Tables**: read-only adapter views `v_participant_person`, `v_participant_employer`, `v_participant_dependant`. No structural changes to `ip_*`/`er_*`. Reference groups added under Reference Framework: `participant.type`, `participant.status`, `participant.relationship`, `comm.channel`.
  - **Screens**: no new routes. New Participant 360 view added as a leaf inside the existing Contributor/IP canonical screen — not a parallel screen.
  - **Services**: `participantService`, `notificationService`, `templateRenderService`, `communicationAssetsService`.
  - **Hooks**: `useParticipant`, `useParticipantSearch`, `useParticipant360`, `useNotify`, `useTemplateRender`, `useCommunicationAssets`.
  - **Permissions**: reuse existing IP/Employer permissions and `admin_comm_doc_engine`.
  - **Menu**: no additions; leaf toggles inside existing shells only.
  - **Catalogue registration**: `participant_domain`, `communication_domain`.
  - **Rollback**: drop adapter views; remove new leaves; delete facade files; remove two catalogue rows.

### Wave 4 — Document

- **Repository impact**
  - **Tables**: none new. Wire `document_purpose_rules` into the facade.
  - **Screens**: shared `<DocumentUpload />`, `<DocumentPreview />`, `<DocumentPicker />` primitives under `src/components/document/`. Reused in existing screens — no new routes.
  - **Services**: `documentService`, `documentUploadService`, `documentPreviewService`.
  - **Hooks**: `useDocument`, `useDocumentUpload`, `useDocumentPreview`, `useDocumentPurpose`.
  - **Permissions**: reuse existing DMS module permissions.
  - **Menu**: no additions.
  - **Catalogue registration**: `document_domain`.
  - **Rollback**: remove shared components + facade files; remove catalogue row. Per-module document tables untouched.

### Wave 5 — Business Module Consumption

Retarget business modules onto the facades from Waves 1–4. No new capabilities delivered; this wave is pure adoption.

- **Repository impact**
  - **Tables**: none.
  - **Screens**: none new. Existing module screens migrated to facades.
  - **Services / Hooks**: refactor call sites in Contributions, Compliance/CE, Benefits (view-only surfaces — BN Product Builder stays on hold), HRMS placeholder, DMS, Legal-consumers.
  - **Permissions**: unchanged.
  - **Menu**: unchanged.
  - **Catalogue registration**: update `consumers` arrays on every registry row that gains a new consumer; flip `health_implementation` to green where retargeting completes.
  - **Rollback**: revert refactored call sites per module (each module refactor is a separate atomic PR).

---

## 4. Governance rails (apply to every wave)

1. **Inspect before proposing a screen**: reuse canonical → extend canonical → add tab in canonical → link from Platform Admin → redirect legacy. Never a second screen for the same capability.
2. **Inspect before proposing a table**: reuse canonical → adapter view over legacy → new additive table (with GRANTs). Never alter BEMA/legacy structure.
3. **Every BEMA touch requires** `docs/enterprise/BEMA_LEGACY_TABLE_IMPACT_NOTE.md` amendment before execution.
4. **Every wave completion writes** an acceptance file under `docs/social-security/` and updates `enterprise_capability_registry`.
5. **Menu remains `app_modules`-driven**. No static menu edits.

---

## 5. Programme acceptance

- ✅ Every shared domain classified (READY / PARTIAL / NOT STARTED / DEFERRED).
- ✅ Every domain has: current implementation, reusable assets, canonical owner, framework dependency, consumers, missing capability, required enhancements, wave assignment, complexity, dependencies, acceptance.
- ✅ Five implementation waves defined with repository impact (tables, screens, services, hooks, permissions, menu, catalogue registration, rollback).
- ✅ No code, schema, menu, `app_modules` or permission changes made in this document.
- ✅ Reuse-first, BEMA-safe, screen-safe rails restated.
- ✅ This is the single implementation programme; no additional planning documents will be created after approval.
