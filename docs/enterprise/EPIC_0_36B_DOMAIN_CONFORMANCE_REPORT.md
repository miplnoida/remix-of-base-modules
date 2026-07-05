# Epic 0.36B — Enterprise Domain Conformance Report

**Status:** Read-only audit. No code, schema, routes, hooks, services, APIs, `app_modules`, menus, permissions, or feature flags are changed by this epic.

**Purpose:** Measure how closely the current repository conforms to the enterprise architecture defined in Epics 0.35, 0.36A, and 0.36A.1/.2, and produce the definitive gap map that drives Epics 0.36C → 0.40.

**Evidence base for this report (repository snapshot at audit time):**

- **Route surface:** 1,234 route declarations in `src/components/routing/AppRoutes.tsx`, distributed across 60 top-level path prefixes.
- **Page surface:** 49 top-level page directories under `src/pages/` (see `EPIC_0_36B_UI_IMPLEMENTATION_MATRIX.md`).
- **Hook surface:** dense `src/hooks/bn/*` family (40+ BN-specific hooks) plus `src/hooks/useHasCapability.ts` and compliance/legal families.
- **Service surface:** `src/services/{bn,compliance,core,external,ledger,legal,legal-reference,reference,system}` with `bn/_legacy` shim already present.
- **Table surface:** ~700+ tables across families `bn_*`, `ce_*`, `cl_*`, `cn_*`, `ip_*`, `au_*`, `er_*`, `bema_*`, `c3_*`, `core_*`, `comm_*`, `ia_*`, `la_*`, `lg_*`, `legal_*`, `tb_*`, `system_*`, `notification_*`, `audit_*`, plus operational and admin tables.

Full per-artefact tables live in the sibling documents; this report is the synthesis.

---

## 1. Enterprise domain conformance summary

Domains are the 22 defined in `ENTERPRISE_DOMAIN_MODEL.md`. Maturity is on 0–5:

- **0** Not started
- **1** Concepts exist, no coherent implementation
- **2** Fragmented implementation, multiple owners
- **3** Consolidated but coupled
- **4** Consolidated, low coupling, minor gaps
- **5** Fully aligned with architecture

| # | Domain | Architecture owner | Current implementation owner(s) | Maturity | Key finding |
|---|---|---|---|---|---|
| 1 | Platform Foundation | Platform | `src/integrations/supabase/*`, `src/config/routes.ts`, `system_*` tables | 4 | Solid; ownership clear. |
| 2 | Organisation | Organisation admin | `core_organization`, `core_department*`, `office_locations`, `system_office_settings` | 3 | Multiple owners for department/office; no single Org profile facade. |
| 3 | Identity | Platform (Auth) | `profiles`, `security_*`, `mfa_config`, `password_*`, `external_*_link`, `SupabaseAuthContext` | 3 | Solid core; several parallel external-identity link tables and duplicate role/permission tables (`roles`, `role_permissions`, `role_hierarchy`, `security_users`). |
| 4 | Authorisation / RBAC | Platform | `role_permissions`, `route_security_config`, `field_security_rules`, `data_scope_rules`, `useHasCapability`, `legalRouteCapabilities` | 2 | Fragmented: capability model exists for Compliance and Legal; BN routes still rely on module-level flags. |
| 5 | Location / Geography | SSP (target) | `bn_country`, `bn_country_address_model`, `tb_country`, `tb_district`, `office_locations`, `er_locations` | 1 | Owned inside BN today; SSP layer not yet extracted. |
| 6 | Legal Reference | SSP (target) | `core_legal_reference*`, `bn_country` legal binding fields, `tb_legal_status`, `legal_reference_type` | 2 | Core exists; BN and Legal both reference it inconsistently. |
| 7 | Payment Channel / Bank | SSP (target) | `bn_bank_master`, `bn_bank_branch`, `bn_payment_method`, `bn_eft_format`, `tb_bank_code` | 1 | Fully BN-owned; must move to SSP. |
| 8 | Identity Rules / Address Model / Participant Types | SSP (target) | `bn_country_id_rule`, `bn_country_address_model`, `bn_country_participant_type` | 1 | BN-owned; SSP extraction pending. |
| 9 | Reference Data | Enterprise Shared | `core_reference_group`, `core_reference_value`, dozens of `tb_*` legacy code lists | 2 | Two competing masters (`core_reference_*` vs `tb_*`); no single admin. |
| 10 | Document Type Master | Organisation (target) | `core_dms_document_type`, `core_document_profile`, `bn_service_doc_type`, `ce_document_templates`, `ia_document_templates` | 2 | Per-module document masters; Org-level master not authoritative. |
| 11 | Workflow | Enterprise Shared | `bn_workflow_template`, `bn_approval_policy`, `ce_workflow_mappings`, `lg_workflow_policy`, `la_routing_rule` | 2 | Four parallel engines; no consolidated shared workflow service. |
| 12 | Notification | Enterprise Shared | `notification_templates`, `notification_providers`, `notification_queue`, `bn_comm_mapping`, `ce_audit_communication*`, `bn_communication_log`, `in_app_notifications` | 2 | Central engine exists but BN and CE ship their own template stacks. |
| 13 | Document Management | Enterprise Shared | `core_dms_*`, `bn_claim_document`, `ce_case_documents`, `lg_document_link`, `ia_evidence`, `meeting_uploaded_documents` | 3 | DMS provider abstraction exists; module tables still hold document metadata. |
| 14 | Audit & Traceability | Enterprise Shared | `audit_logs`, `system_audit_trail`, `legal_audit_log`, `ce_audit_log`, `bn_*` per-entity audit, `data_policy_audit_log` | 3 | Uniform pattern per module; no single audit query surface. |
| 15 | Person (subject) | Shared | `ip_master`, `au_ip_master`, `ip_depend`, `bn_claim_person_snapshot`, `contributor_profiles`, `bema_contributors` | 2 | Multiple person masters (`ip_master` live, `au_ip_master` archival, `bema_contributors` duplicate). |
| 16 | Employer | Shared | `er_master`, `au_er_master`, `ce_employer_snapshots`, `bema_registrations`, `compliance_registrations` | 2 | Live + audit + several snapshot copies; no single facade. |
| 17 | Scheme / Coverage | Business | `bn_scheme`, `bn_coverage_type`, `bn_coverage_type_rule`, `tb_benefit`, `tb_contributory` | 2 | Definition split between BN and legacy `tb_*`. |
| 18 | Contribution | Business (C3) | `cn_*`, `c3_*`, `bema_c3_*`, `au_cn_*`, `ip_wages*`, `stg_bema_*` | 2 | Live `cn_*` + legacy `bema_*` + audit `au_cn_*` all present. |
| 19 | Benefit | Business (BN) | `bn_*` (200+ tables), `cl_*` legacy claim head/detail, `au_cl_*` audit | 3 | Consolidated BN core with heavy legacy `cl_*` still routable via `/nbenefit`, `/newbenefit`, `/benefits`. |
| 20 | Compliance & Enforcement | Business (CE) | `ce_*` (150+ tables), `compliance_*` legacy, `bema_*` legacy, `inspector_*` legacy | 3 | Live CE strong; three legacy stacks retained (per Epic 0.2). |
| 21 | Legal | Business (LG) | `lg_*` (100+ tables), `legal_*` legacy, `la_*` advisory, `ce_legal_*` referral bridge | 3 | Legal V1 certified; older `legal_*` retained; advisory `la_*` parallel. |
| 22 | Finance | Business (FN) | `core_ledger*`, `core_payment_*`, `cn_*` receipts, `bn_payment_*`, `lg_fee_*` | 2 | No unified Finance app; ledger fragments spread across modules. |

**Overall enterprise maturity:** ≈ **2.4 / 5** — sufficient for daily module operation, insufficient to safely resume BN Product Builder without the SSP/Org extraction work.

## 2. Systemic conformance findings

### 2.1 Duplicate implementations (must consolidate)

- **Country / Location:** `bn_country*`, `tb_country`, `office_locations`, `er_locations` — target SSP owner.
- **Bank / Payment channel:** `bn_bank_master`, `bn_bank_branch`, `bn_payment_method`, `tb_bank_code` — target SSP owner.
- **Reference data:** `core_reference_*` vs `tb_*` (dozens of code lists) — target Enterprise Shared.
- **Person master:** `ip_master`, `au_ip_master`, `bema_contributors`, `contributor_profiles` — must collapse to one canonical Person with historical shadow.
- **Employer master:** `er_master`, `au_er_master`, `bema_registrations`, `compliance_registrations` — same.
- **Legacy Benefit stacks:** `/nbenefit`, `/newbenefit`, `/benefits` route trees plus `cl_*` tables — retained per Epic 0.2 but excluded from live menu.
- **Workflow engines:** BN, CE, LG, LA each own an engine.
- **Notification stacks:** platform `notification_*` + BN `bn_comm_*` + CE `ce_audit_communication*`.
- **Audit logs:** per-module `*_audit_log` and central `audit_logs` / `system_audit_trail`.
- **Role/permission tables:** `roles`, `role_permissions`, `role_hierarchy`, `security_users`, `security_template`, `security_groupings`, `security_apps`.

### 2.2 Wrong ownership (against target architecture)

| Artefact | Current owner | Target owner |
|---|---|---|
| `bn_country`, `bn_country_id_rule`, `bn_country_address_model`, `bn_country_participant_type`, `bn_country_payment_config` | BN | SSP |
| `bn_bank_master`, `bn_bank_branch`, `bn_payment_method`, `bn_eft_format*` | BN | SSP |
| `bn_legal_referral` link fields | BN | Consume Legal + Legal Reference |
| `bn_service_doc_type` | BN | Consume Org Document Master |
| `bn_workflow_template`, `bn_approval_policy`, `bn_escalation_policy*` | BN | Consume Enterprise Workflow |
| `bn_comm_mapping`, `bn_communication_log` | BN | Consume Enterprise Notification |
| `ce_audit_communication_templates` | CE | Consume Enterprise Notification |
| `lg_notification_rule` | LG | Consume Enterprise Notification |
| `core_dms_*` scattered per-module document metadata | Mixed | Consume Enterprise DMS |

### 2.3 Coupling issues

- BN hooks (`useBnCountryMaster`, `useBnCountryPack`, `useBnPaymentMasters`) read directly from `bn_country*` / `bn_bank_*` — must move to SSP hooks.
- Legal capability gate (`useLgAccess`, `legalRouteCapabilities`) is Legal-local; Compliance has its own (`useHasCapability`, `capabilities.ts`); BN has no equivalent — must converge on a single capability engine.
- Compliance reads directly from BN `ce_legal_referrals` and Legal reads `ce_*` directly — target: shared referral surface.
- Finance logic scattered: `core_ledger_*`, `cn_*`, `bn_payment_*`, `lg_fee_*` all compute independently. No single GL owner.

### 2.4 Cross-domain violations

- BN writes to Legal-adjacent tables (`bn_legal_referral`) instead of emitting to Legal Referral & Intake.
- CE mirrors employer data into `ce_employer_snapshots` and `ce_employer_snapshot_history` rather than consuming a shared Employer service.
- IA (Internal Audit) module owns `ia_org_document_foundation` and duplicates Org Document Master.
- Portal (`src/portals/*`) uses `publicBenefitApiClient` directly — bypasses the shared Portal Interaction Management contract.

## 3. Product Builder gate — status

Applying the readiness gates from `IMPLEMENTATION_READINESS_MODEL.md` §2 to the current repository:

| Gate | Status | Evidence |
|---|---|---|
| SSP Foundation (Country, Legal Ref, Payment/Bank, ID Rules, Address, Participant Types) | 🔴 Not started | All still `bn_*` owned. |
| Organisation Foundation (Profile, calendar, branding, DMS taxonomy, roles) | 🟡 Partial | `core_organization`, `core_department*`, `office_locations` exist; no consolidated Org facade. |
| Workflow & Notification consolidation | 🔴 Not started | 4 workflow engines, 3 notification stacks. |
| Reference Data Administration (governed masters, maker-checker) | 🟡 Partial | `core_reference_*` exists but competes with `tb_*`. |
| BN Consumption Refactor | 🔴 Not started | BN reads directly from `bn_*` masters. |

**Decision:** BN Product Builder **remains on hold**. Remaining prerequisites are Epics 0.36C, 0.36D, 0.37, 0.38, 0.39. Detail in §7 of `EPIC_0_36B_GAP_BACKLOG.md`.

## 4. Downstream artefacts

| File | Contents |
|---|---|
| `EPIC_0_36B_DOMAIN_IMPLEMENTATION_MATRIX.md` | Domain × implementation surface. |
| `EPIC_0_36B_ROUTE_OWNERSHIP_MATRIX.md` | Every route prefix → domain / application. |
| `EPIC_0_36B_TABLE_OWNERSHIP_MATRIX.md` | Every table family → current vs. target owner. |
| `EPIC_0_36B_SERVICE_IMPLEMENTATION_MATRIX.md` | Hooks, contexts, services, utilities classification. |
| `EPIC_0_36B_UI_IMPLEMENTATION_MATRIX.md` | Every page directory → domain, retention, migration status. |
| `EPIC_0_36B_GAP_BACKLOG.md` | Prioritised P0–P3 backlog with epics. |
| `EPIC_0_36B_IMPLEMENTATION_READINESS_SCORECARD.md` | Traffic-light scorecard per domain. |

## 5. Acceptance

- Every enterprise domain has a maturity score.
- Duplicate, wrong-owner, and cross-domain violations are enumerated.
- Product Builder gate is re-evaluated and remains **On Hold**.
- No implementation change in this epic.
