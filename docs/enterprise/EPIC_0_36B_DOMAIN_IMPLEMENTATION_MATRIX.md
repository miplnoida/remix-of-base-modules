# Epic 0.36B — Domain Implementation Matrix

**Status:** Read-only audit.

For each of the 22 enterprise domains from `ENTERPRISE_DOMAIN_MODEL.md`, this matrix records the concrete implementation surface currently in the repository and the resulting conformance verdict.

Legend: **✅ Conforms** · **🟡 Partial** · **🔴 Non-conforming** · **N/A**.

| # | Domain | Routes (prefix) | Pages (`src/pages/*`) | Hooks | Services | Tables (families) | Owner (arch) | Owner (impl) | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Platform Foundation | `/admin/api-*`, `/admin/logs`, `/admin/backup`, `/admin/global-settings` | `admin/*`, `system-logs/*` | — | `services/system/*` | `system_*`, `api_*`, `feature_flags`, `app_modules` | Platform | Platform | ✅ |
| 2 | Organisation | `/admin/departments`, `/admin/designations`, `/admin/office-ip-management`, `/admin/employees`, `/admin/dms` | `admin/*` | — | `services/core/*` | `core_organization`, `core_department*`, `office_locations`, `system_office_settings`, `designation_hierarchy`, `role_hierarchy` | Org | Mixed (Platform + Org) | 🟡 |
| 3 | Identity | `/login`, `/mfa-verify`, `/change-password`, `/forgot-password`, `/reset-password`, `/profile` | `auth/*`, `profile/*` | `SupabaseAuthContext` | — | `profiles`, `mfa_config`, `password_*`, `security_*`, `external_*_link`, `login_security_events` | Platform | Platform | 🟡 |
| 4 | Authorisation / RBAC | `/admin/data-access/*`, `/admin/role-*` (embedded) | `admin/data-access/*` | `useHasCapability`, Legal `useLgAccess` | `services/core/*` | `role_permissions`, `roles`, `role_hierarchy`, `route_security_config`, `field_security_rules`, `data_scope_rules` | Platform | Platform + per-module | 🔴 |
| 5 | Location / Geography | (consumed everywhere) | — | `useBnCountryPack`, `useBnCountryMaster` | `services/bn/registries/*` | `bn_country*`, `tb_country`, `tb_district`, `office_locations`, `er_locations` | SSP | BN | 🔴 |
| 6 | Legal Reference | `/admin/master-data/legal-status`, `/legal/admin/*` | `admin/master-data`, `legal/admin` | — | `services/legal-reference/*` | `core_legal_reference*`, `tb_legal_status`, `legal_reference_type`, `bn_country` legal fields | SSP | Shared + BN + Legal | 🔴 |
| 7 | Payment Channel / Bank | `/admin/master-data/bank-codes`, `/admin/master-data/methods-of-payment`, `/bn/payment-*` | `bn/payment*`, `admin/master-data` | `useBnPaymentMasters` | `services/bn/payment/*` | `bn_bank_master`, `bn_bank_branch`, `bn_payment_method`, `bn_eft_format*`, `tb_bank_code` | SSP | BN | 🔴 |
| 8 | ID Rules / Address Model / Participant Types | (consumed by registration) | — | `useBnCountryPack` | `services/bn/registries/*` | `bn_country_id_rule`, `bn_country_address_model`, `bn_country_participant_type`, `bn_country_participant_proof_link` | SSP | BN | 🔴 |
| 9 | Reference Data | `/admin/master-data/*` (dozens) | `admin/master-data/*` | — | `services/reference/*` | `core_reference_group`, `core_reference_value`, `tb_*` legacy | Shared | Split (`core_*` + `tb_*`) | 🔴 |
| 10 | Document Type Master | `/admin/document-configuration`, `/admin/dms`, `/admin/comm/templates/document` | `admin/dms`, `admin/document-configuration` | — | `services/core/*` | `core_dms_document_type`, `core_document_profile`, `bn_service_doc_type`, `ia_document_templates`, `ce_document_templates` | Org | Split (Org + per-module) | 🔴 |
| 11 | Workflow | (per-module) | (per-module) | (per-module) | `services/{bn,legal,compliance}/*` | `bn_workflow_template`, `bn_approval_policy`, `ce_workflow_mappings`, `lg_workflow_policy`, `la_routing_rule` | Shared | Multiple engines | 🔴 |
| 12 | Notification | `/admin/notifications/*`, `/notifications` | `admin/notifications`, `notifications` | — | `services/core/*` | `notification_*`, `bn_comm_*`, `ce_audit_communication*`, `lg_notification_rule`, `in_app_notifications` | Shared | Multiple stacks | 🔴 |
| 13 | Document Management | `/admin/dms`, `/documents` | `admin/dms`, `documents` | — | `services/core/*` | `core_dms_*`, `dms_transfer_queue`, per-module `*_documents` | Shared | Shared + per-module metadata | 🟡 |
| 14 | Audit & Traceability | `/admin/audit-log`, `/admin/audit-logs`, `/admin/audit` | `admin/audit-log`, `admin/audit-logs` | — | `services/core/*` | `audit_logs`, `system_audit_trail`, per-module `*_audit_log`, per-entity `*_audit` | Shared | Uniform pattern, no shared surface | 🟡 |
| 15 | Person (subject) | `/person`, `/ip-registration`, `/insured-persons`, `/registration` | `person`, `ip-registration`, `insuredPersons`, `registration` | — | (mixed) | `ip_master`, `au_ip_master`, `ip_depend`, `contributor_profiles`, `bema_contributors`, `bn_claim_person_snapshot` | Shared | Multiple masters | 🔴 |
| 16 | Employer | `/employer`, `/employers`, `/employers-management`, `/employer-registration` | `employer`, `employer-registration`, `employersManagement` | — | (mixed) | `er_master`, `au_er_master`, `ce_employer_snapshots`, `bema_registrations`, `compliance_registrations` | Shared | Multiple masters | 🔴 |
| 17 | Scheme / Coverage | `/bn/*` (scheme admin), `/admin/master-data/*` | `bn/*` | `useBnConfig` | `services/bn/config/*` | `bn_scheme`, `bn_coverage_type`, `bn_coverage_type_rule`, `tb_benefit`, `tb_contributory` | Business | BN + legacy `tb_*` | 🟡 |
| 18 | Contribution | `/c3`, `/c3-management`, `/cashier`, `/self-employed`, `/bema` | `c3`, `c3Management`, `cashier`, `selfEmployed`, `bema` | — | `services/compliance/*` | `cn_*`, `c3_*`, `bema_c3_*`, `au_cn_*`, `ip_wages*`, `stg_bema_*` | Business (C3) | Live + legacy `bema_*` + audit | 🟡 |
| 19 | Benefit | `/bn/*`, `/nbenefit`, `/newbenefit`, `/benefits`, `/medical` | `bn`, `nbenefit`, `newBenefit`, `medical` | `useBn*` (40+) | `services/bn/*` | `bn_*` (200+), `cl_*` legacy, `au_cl_*` audit | Business (BN) | Consolidated BN + legacy `cl_*` | 🟡 |
| 20 | Compliance & Enforcement | `/compliance` (256 routes), `/compliance-hub`, `/bema`, `/inspector` | `compliance`, `bema`, `inspector` | (per-page) | `services/compliance/*` | `ce_*` (150+), `compliance_*`, `bema_*`, `inspector_*` | Business (CE) | Live CE + 3 legacy stacks | 🟡 |
| 21 | Legal | `/legal` (151 routes), `/legal-advanced`, `/legal-final` | `legal`, `legal-advanced`, `legalFinal` | `useLgAccess`, `useLegalMatterWorkspace` | `services/legal/*`, `services/legal-reference/*` | `lg_*` (100+), `legal_*` legacy, `la_*` advisory | Business (LG) | Legal V1 + advisory + legacy | ✅ |
| 22 | Finance | `/finance`, `/ledger` | `finance`, `admin/ledger/*` | — | `services/ledger/*` | `core_ledger*`, `core_payment_*`, `cn_*`, `bn_payment_*`, `lg_fee_*` | Business (FN) | Fragmented | 🔴 |

## Overall counts

| Verdict | Domains |
|---|---|
| ✅ Conforms | 2 (Platform Foundation, Legal) |
| 🟡 Partial | 8 |
| 🔴 Non-conforming | 12 |
