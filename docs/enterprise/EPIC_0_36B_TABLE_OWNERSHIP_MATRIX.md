# Epic 0.36B — Table Ownership Matrix

**Status:** Read-only audit. Tables grouped by prefix family. Full row-by-row inspection is impractical (~700 tables); this matrix classifies at the family level and enumerates the notable individual tables where classification differs from the family default.

Legend:

- **Live** — actively written by current app.
- **Legacy** — retained, read-only or superseded.
- **Audit shadow** — historical `au_*` copy.
- **Snapshot** — module-local point-in-time copy.
- **Owner (curr)** — application / layer that currently writes it.
- **Owner (target)** — per enterprise architecture.

## 1. Family-level classification

| Family | Table count (approx.) | Status | Owner (curr) | Owner (target) | Shared master? | Migration req.? | Notes |
|---|---|---|---|---|---|---|---|
| `bn_*` | 210+ | Live | BN | BN (mostly) | Selected (see §2) | Yes — extract SSP-owned tables | Includes SSP-target tables that must move. |
| `cl_*` | 22 | Legacy | BN | BN (retire) | No | Retain per Epic 0.2 | Legacy claim head/detail. |
| `au_cl_*` | 14 | Audit shadow | BN | BN | No | Retain | Historical claim audit. |
| `au_cn_*` | 9 | Audit shadow | C3 | C3 | No | Retain | |
| `au_ip_*` | 10 | Audit shadow | Shared Party | Shared | No | Retain | |
| `au_er_*` | 3 | Audit shadow | Shared Party | Shared | No | Retain | |
| `cn_*` | 45 | Live | C3 | C3 (Contribution) | No | No | Contribution collection core. |
| `c3_*` | 26 | Live | C3 | C3 | No | No | Config + policy. |
| `bema_*` | 18 | Legacy | CE | CE (retire) | No | Retain per Epic 0.2 | Legacy compliance stack. |
| `compliance_*` | 5 | Legacy | CE | CE (retire) | No | Retain | Legacy. |
| `inspector_*` | 4 | Legacy | CE | CE (retire) | No | Retain | Legacy. |
| `ce_*` | 155+ | Live | CE | CE | No (mostly) | Partial (see §2) | Live compliance stack. |
| `lg_*` | 105+ | Live | LG | LG | No | No | Legal V1 certified. |
| `legal_*` | 30 | Legacy | LG | LG (retire) | No | Retain | Pre-V1 Legal. |
| `la_*` | 20 | Live | LG (Advisory) | LG | No | No | Legal advisory. |
| `ip_*` | 45 | Live | Shared Party | Shared (Person) | Yes | Consolidate with `au_ip_*`, `bema_contributors`, `contributor_profiles` | Central person master. |
| `er_*` | 12 | Live | Shared Party | Shared (Employer) | Yes | Consolidate | Employer master. |
| `core_*` | 65+ | Live | Shared / Org | Shared (mostly) + Org | Yes | Yes — Org profile facade needed | Cross-module foundation. |
| `comm_*` | 12 | Live | Shared Comm | Shared (Correspondence) | Yes | No | Assets, letterheads, signatures. |
| `notification_*` | 6 | Live | Shared | Shared (Notification) | Yes | Consolidate with `bn_comm_*`, `ce_audit_communication*`, `lg_notification_rule` | |
| `audit_*` (root) | 3 | Live | Shared | Shared (Audit) | Yes | No | Interviews + logs. |
| `system_*` | 10 | Live | Platform | Platform | Yes | No | System logs, settings, events. |
| `tb_*` | 60+ | Live legacy | Shared (Reference) | Shared Reference | Yes | Consolidate into `core_reference_*` | Legacy code lists. |
| `ia_*` | 90+ | Live | IA (Internal Audit) | Business (IA) | No (mostly) | Migrate IA doc foundation to Org | Parallel doc & workflow stacks. |
| `security_*` / `roles*` / `role_*` | 10 | Mixed | Platform | Platform | Yes | Consolidate | Fragmented RBAC. |
| `profiles`, `mfa_config`, `password_*`, `login_security_events`, `external_*_link` | 12 | Live | Platform | Platform | Yes | No | Identity core. |
| `dev_info_*`, `db_diagram_*`, `qa_*`, `kb_*` | 40+ | Live | Platform (dev tools) | Platform | No | No | Documentation & QA tooling. |
| `api_*`, `public_api_*`, `external_api_*` | 30+ | Live | Platform | Platform | No | No | API gateway config. |
| `pbcat*` | 5 | Legacy | Vendor artefact | — | No | Retain | PowerBuilder catalog tables (legacy). |
| `stg_bema_*` | 2 | Legacy staging | CE (legacy) | CE | No | Retain | |
| `sr_tab*` | 4 | Legacy | Reference | Shared | No | Retain | |
| `mi_tb_*` | 1 | Legacy | Reference | Shared | No | Retain | |

## 2. Individual tables requiring re-ownership

These are the tables that current architecture places in the wrong layer.

### 2.1 Move to SSP (Country Pack)

| Table | Current owner | Target owner |
|---|---|---|
| `bn_country` | BN | SSP |
| `bn_country_address_model` | BN | SSP |
| `bn_country_id_rule` | BN | SSP |
| `bn_country_participant_type` | BN | SSP |
| `bn_country_participant_proof_link` | BN | SSP |
| `bn_country_payment_config` | BN | SSP |
| `bn_country_payment_cycle_method` | BN | SSP |
| `bn_country_config_package` | BN | SSP |
| `bn_country_config_package_item` | BN | SSP |

### 2.2 Move to SSP (Payment / Bank)

| Table | Current | Target |
|---|---|---|
| `bn_bank_master` | BN | SSP |
| `bn_bank_branch` | BN | SSP |
| `bn_payment_method` | BN | SSP |
| `bn_eft_format` | BN | SSP |
| `bn_eft_format_field` | BN | SSP |
| `tb_bank_code` | Reference | SSP |

### 2.3 Move to SSP (Legal Reference)

| Table | Current | Target |
|---|---|---|
| `core_legal_reference` | Shared | SSP |
| `core_legal_reference_version` | Shared | SSP |
| `core_module_legal_reference` | Shared | SSP |
| `core_template_legal_reference` | Shared | SSP |
| `core_generated_document_legal_reference` | Shared | SSP |
| `core_legal_referral_document` | Shared | SSP |
| `core_legal_referral_item` | Shared | SSP |
| `legal_reference_type` | Legacy | SSP |
| `tb_legal_status` | Reference | SSP |

### 2.4 Move to Org (Document Master)

| Table | Current | Target |
|---|---|---|
| `core_dms_document_type` | Shared | Org |
| `core_document_profile` | Shared | Org |
| `bn_service_doc_type` | BN | Org |
| `ce_org_document_foundation` | CE | Org |
| `ia_org_document_foundation` | IA | Org |
| `ce_document_template_settings` | CE | Org (as taxonomy) |
| `ia_document_template_settings` | IA | Org (as taxonomy) |

### 2.5 Consume Shared Workflow

| Table | Current owner | Target |
|---|---|---|
| `bn_workflow_template` | BN | Shared Workflow |
| `bn_approval_policy` | BN | Shared Workflow |
| `bn_escalation_policy`, `bn_escalation_policy_level` | BN | Shared Workflow |
| `ce_workflow_mappings` | CE | Shared Workflow |
| `lg_workflow_policy` | LG | Shared Workflow |
| `la_routing_rule` | LG | Shared Workflow |
| `ia_plan_workflow_bindings` | IA | Shared Workflow |

### 2.6 Consume Shared Notification

| Table | Current owner | Target |
|---|---|---|
| `bn_comm_mapping`, `bn_comm_event`, `bn_communication_log`, `bn_letter` | BN | Shared Notification |
| `ce_audit_communication*` (12 tables) | CE | Shared Notification |
| `lg_notification_rule`, `lg_hearing_communication` | LG | Shared Notification |
| `notification_templates`, `notification_providers`, `notification_queue`, `notification_types`, `notification_logs` | Shared | Shared Notification ✅ (already) |

### 2.7 Consolidate Person master

| Table | Role | Target |
|---|---|---|
| `ip_master` | Live person master | Canonical (retain) |
| `au_ip_master` | Historical | Audit shadow (retain) |
| `bema_contributors` | Legacy duplicate | Read-only view (Epic 0.39) |
| `contributor_profiles` | Duplicate | Fold into `ip_master` |
| `bn_claim_person_snapshot` | Snapshot | Keep (immutable claim record) |
| `ce_case_employer_snapshot`, `ce_violation_employer_snapshot` (person-side equivalents) | Snapshot | Keep |

### 2.8 Consolidate Employer master

| Table | Role | Target |
|---|---|---|
| `er_master` | Live employer master | Canonical (retain) |
| `au_er_master` | Historical | Audit shadow |
| `bema_registrations`, `compliance_registrations` | Legacy duplicates | Read-only view |
| `ce_employer_snapshots`, `ce_employer_snapshot_history` | Snapshot | Keep as CE snapshots |

### 2.9 Consolidate Reference Data

Move populated `tb_*` code lists into `core_reference_group` + `core_reference_value`. Priority: `tb_bank_code`, `tb_country`, `tb_district`, `tb_indus*`, `tb_income_*`, `tb_currencies`, `tb_dept`, `tb_designations`, `tb_disablement*`, `tb_illness`, `tb_legal_status`, `tb_relations` families. Retention rule (Epic 0.2): tables remain; only ownership moves.

## 3. Deprecated / retained (no delete)

Per Epic 0.2, the following remain in the database but are excluded from live menus / new writes:

- All `au_*` audit shadow tables
- `cl_*`, `cl_head_*`, `cl_detail_*` legacy claim heads
- `bema_*`, `compliance_*`, `inspector_*` legacy compliance
- `legal_*` (pre-V1 legal)
- `pbcat*` (PowerBuilder catalog)
- `stg_bema_*` staging
- `sr_tab*`, `mi_tb_*` legacy reference
- Duplicate `au_ip_wages_ann_sum_old`, `cn_c3_reported_bkup`, `ip_wages_bkup`, `ip_wages_tmp`, `ip_wages_orphans`, `messages_copy`, `app_modules_reorg_backup`

## 4. Migration priority buckets

| Priority | Bucket | Epic |
|---|---|---|
| P0 | SSP Country Pack extraction | 0.36C → 0.36D |
| P0 | SSP Payment / Bank extraction | 0.36C → 0.36D |
| P0 | Legal Reference to SSP | 0.36C → 0.36D |
| P0 | Reference Data consolidation (`tb_*` → `core_reference_*`) | 0.36D |
| P1 | Workflow consolidation | 0.37 |
| P1 | Notification consolidation | 0.37 |
| P1 | Org Document Master seeding | 0.38 |
| P1 | Person / Employer facade | 0.38 |
| P1 | BN consumption swap (hooks → SSP/Org) | 0.39 |
| P2 | IA doc foundation → Org | Later |
| P2 | Finance consolidation | Finance track |
