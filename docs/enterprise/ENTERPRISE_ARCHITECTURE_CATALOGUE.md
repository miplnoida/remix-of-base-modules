# Enterprise Architecture Catalogue

**Version:** 1.0 (Inventory only — no code changes)
**Date:** 2026-07-05
**Status:** Draft — for cleanup planning
**Related:** `docs/platform/PLATFORM_OWNERSHIP_MATRIX.md`, `docs/platform/EPIC_0_1_PLATFORM_ADMIN_ACCEPTANCE.md`, `docs/legal/LEGAL_PLATFORM_ARCHITECTURE.md`, `docs/PLATFORM_DOCUMENTATION.md`

> This catalogue is documentation-only. No routes, tables, services, migrations, or screens were created. Where evidence is thin, items are marked **investigate**.

---

## 1. Module Inventory

Evidence sources: `src/pages/*` (subdirectories), `src/components/sidebar/menuItems/*`, `src/components/routing/AppRoutes.tsx` (1,234 route registrations), `src/services/*`, `supabase/migrations/*`, `docs/*`.

| # | Module | Purpose | Canonical Routes (root) | Main Pages (src/pages) | Owner | Reused By | Duplicate / Legacy Routes | Action |
|---|--------|---------|-------------------------|------------------------|-------|-----------|---------------------------|--------|
| 1 | **Platform** | Cross-module administration (users, roles, org, workflow, notifications, numbering, security, scheduler, logs, audit-log) | `/admin/platform`, `/admin/users`, `/admin/roles`, `/admin/offices`, `/admin/departments`, `/admin/designations`, `/admin/delegations`, `/admin/modules`, `/admin/numbering`, `/admin/security-*`, `/admin/session-health`, `/admin/logs`, `/system-logs/audit` | `pages/admin/PlatformAdmin.tsx`, `pages/admin/OrganizationManagementShell.tsx`, `pages/systemAdmin/*` (legacy siblings) | Platform | All modules | `/admin/home`, `/admin/dashboard`, `/admin/user-management`, `/admin/notification-management`, `/admin/workflow`, `/admin/system-monitoring`, `/admin/system-logs`, `/admin/audit` (redirected in AppRoutes) | keep |
| 2 | **Social Security (Core)** | Common contributor identity, employer identity, and shared reference data | `/person/*`, `/employer/*`, `/employers-management/*`, `/admin/master-data/*` | `pages/insuredPersons/*`, `pages/person/*`, `pages/employer/*`, `pages/employer-registration/*`, `pages/employersManagement/*`, `pages/registration/*` | Social Security Platform | BN, Compliance, Legal, Finance | Overlap between `pages/insuredPersons`, `pages/person`, `pages/ip-registration`, `pages/registration` | investigate — consolidate person pages |
| 3 | **BN / Benefits** | Benefit determination, entitlement, payment, awards, batch, post-issue review | `/bn/*`, plus `pages/nbenefit/*`, `pages/newBenefit/*` (parallel iterations) | `pages/bn/{admin,approval,awards,batch,claims,config,dashboard,engine,entitlement,history,intake,issue,legal,payables,person360,postissue,schedule,servicing,simulation,workbench}` | BN | Finance (payments), Legal (BN-legal referrals) | `pages/newBenefit/*`, `pages/nbenefit/*` appear to be older iterations | investigate — retire older iterations after audit |
| 4 | **Contributions / C3** | Employer contribution filings, calculation, verification, reports | `/c3-management/*`, `/c3/*` | `pages/c3Management/*`, `pages/c3/*` (settings/injury etc.) | Social Security Platform | Employer, Compliance | Split between `c3Management` and `c3` | investigate |
| 5 | **Employer** | Employer registration, directory, ledger, contribution entry | `/employer/*`, `/employers-management/*` | `pages/employer/*`, `pages/employersManagement/*`, `pages/employer-registration/*` | Social Security Platform | C3, Compliance, Legal | Three parallel employer roots (`employer`, `employersManagement`, `employer-registration`) | investigate — merge |
| 6 | **Insured Person** | IP registration, directory, ID cards, wages, claims history | `/person/*`, `/ip-registration/*` | `pages/person/*`, `pages/insuredPersons/*`, `pages/ip-registration/*`, `pages/registration/*` | Social Security Platform | BN, Legal, Compliance | Four parallel roots | investigate — consolidate |
| 7 | **Compliance / Enforcement** | Risk-based inspections, cases, notices, waivers, arrangements, geography, staff, sampling | `/compliance/*` (see `pages/compliance/Routes.tsx`) | `pages/compliance/{admin,arrangements,audit-planning,automation,cases,dashboards,employers,geography,inspections,legal,notices,operations,reports,risk,sampling,settings,staff,tools,violations,waivers,workbench}` | Compliance | Legal (referrals), BN | Legacy `pages/bema/*` | keep + retire `bema/*` |
| 8 | **Legal** | Case intake, matter workspace, court ops, orders, appeals, enforcement, recovery, reporting/BI | `/legal/*` | `pages/legal/*` (v1 canonical), plus `pages/legal-advanced/*` (LA prefixed), `pages/legalFinal/*` | Legal | Compliance, Finance, BN | `pages/legal-advanced/*` and `pages/legalFinal/*` overlap with canonical `pages/legal/*` | investigate — retain canonical `pages/legal`, retire duplicates |
| 9 | **Finance / Cashier** | Receipting, allocation, refunds, journals, approval matrices | `/cashier/*`, `/finance/*`, `/admin/approval-matrix/*`, `/admin/ledger/allocation-rules` | `pages/cashier/*`, `pages/finance/*`, `pages/systemAdmin/ApprovalMatrix*.tsx` | Finance | BN, Legal, Compliance, C3 | Approval matrices live under `/admin/*` but are Finance-owned | keep, document ownership boundary |
| 10 | **Workflow** | Workflow definitions, instances, triggers, tasks, analytics | `/admin/workflows`, `/admin/workflow-*`, `/workflow/*` | `pages/workflow/WorkflowManagement.tsx`, `pages/systemAdmin/WorkflowSchemeList.tsx` | Platform | All modules | Two entry points (systemAdmin vs admin) | merge — canonical = `/admin/workflow-management` |
| 11 | **Notification** | Templates, channels, logs, campaigns, delivery, in-app preferences | `/admin/notifications`, `/admin/notification-templates`, `/admin/comm/*`, `/admin/email-*`, `/notifications/*` | `pages/admin/NotificationManagement.tsx`, `NotificationTemplatesAdmin.tsx`, `NotificationLogs.tsx`, `EmailCampaigns.tsx`, `EmailLogs.tsx`, `pages/notifications/*`, `pages/correspondence/*` | Platform | All modules | `NotificationTemplates.tsx` (legacy) vs `NotificationTemplatesAdmin.tsx`; `/admin/comm/*` overlaps with `/admin/notification-templates` | merge legacy → canonical |
| 12 | **DMS / Documents** | Document archive, templates, signatures, generation | `/documents/*`, `/admin/dms`, `/admin/document-configuration` | `pages/admin/CoreDmsAdmin.tsx`, `pages/admin/DocumentConfigurationPage.tsx`, `documentMenuItems.ts` targets | Platform (DMS) | Legal, Compliance, BN, C3, Employer | Template Management link in Documents menu points at Notification Templates | keep, clarify boundary |
| 13 | **Audit (Internal Audit)** | Audit universe, risk, plans, execution, reports, workload | `/audit/*` (with optional `/audit-hub/*` remote mode) | `pages/audit/*` | Internal Audit | Reads across modules | Communication templates reused from Core Template Designer | keep |
| 14 | **Reporting / BI** | Report catalogue, runner, exports, dashboards, executive centre, data quality | `/legal/reports/*`, `/reports/*`, `/audit/audit-reports`, `/compliance/reports`, `/bema/reports`, `/employers-management/reports` | `pages/legal/reports/*` (EPIC-09A/B/C canonical), `pages/reports/*`, module-specific report pages | Reporting (per-module, unified via Legal Reports Centre pattern) | All modules | Multiple report roots across modules | investigate — align on shared Reports Centre pattern |
| 15 | **Portals** | External-user portals (employer, doctor, IP, generic external tasks) | `/public/*`, `/external/*`, portal routes | `src/portals/*` (EmployerLanding, DoctorLanding, PortalHub, ExternalTaskLanding), `pages/public/*`, `pages/external/*`, `pages/online-applications/*` | Portal | Employer, IP, Doctor | — | keep |
| 16 | **API / Integrations** | Public API mgmt, API keys, external APIs, api-test console, satellite embed | `/admin/api-keys`, `/admin/public-api`, `/admin/external-apis`, `/admin/api-test-console/*`, `/admin/external-portal-*` | `pages/admin/ApiKeysManagement.tsx`, `PublicApiManagement.tsx`, `ExternalApiManagement.tsx`, `ExternalPortalSettings.tsx`, `pages/admin/api-test-console/*` | Platform | Portals, all external integrations | — | keep |

---

## 2. Page Inventory (Major Groups)

Detail per file is out of scope; grouped by directory. `live/mock/unknown` reflects the maturity noted in existing docs and file names (mock = names containing `Placeholder`, `ComingSoon`, `FeatureDisabled`, `Demo`, or docs indicating stub).

| Path | Route Prefix | Owner | Purpose | Status | Canonical / Duplicate / Legacy | Recommended Action |
|------|--------------|-------|---------|--------|--------------------------------|--------------------|
| `pages/admin/PlatformAdmin.tsx` | `/admin/platform` | Platform | Admin landing hub | live | canonical | keep |
| `pages/admin/*` (Users, Roles, Offices, Departments, Designations, Delegations, Modules, Numbering, Security, Scheduler, SessionHealth, SystemLogs, Notifications) | `/admin/*` | Platform | Cross-module admin | live | canonical | keep |
| `pages/admin/{UserManagementAdmin, DepartmentManagement, DesignationManagement, OfficeManagement, NotificationTemplates, NumberingRulesAdmin}.tsx` | (redirected in AppRoutes) | Platform | Legacy siblings of canonical `*Admin` pages | live but superseded | legacy | redirect (already scheduled in Platform Ownership Matrix) |
| `pages/systemAdmin/*` | `/admin/*` and `/system-logs/*` | Platform | Older admin surface (SecuritySettings, WorkflowSchemeList, NotificationTemplates, SystemSettings, GlobalSettings, ReferenceSequencesAdmin, SessionHealth, SystemLogs) | live | duplicate of `pages/admin/*` for several files | merge into `pages/admin`; keep only files without a canonical twin |
| `pages/systemAdmin/ApprovalMatrix*.tsx` | `/admin/approval-matrix/*` | Finance | Journal / Payment / Refund / Write-Off / Fee Waiver matrices | live | canonical for Finance approvals | keep, document as Finance-owned |
| `pages/bn/*` (20+ subdirs) | `/bn/*` | BN | Benefits lifecycle | live | canonical | keep |
| `pages/nbenefit/*`, `pages/newBenefit/*` | (various) | BN | Earlier iterations | unknown | duplicate | investigate — likely retire |
| `pages/c3Management/*` | `/c3-management/*` | Contributions | C3 filing lifecycle | live | canonical | keep |
| `pages/c3/*` | `/c3/*` | Contributions | C3 settings (injury etc.) | live | canonical (settings subset) | keep |
| `pages/employer/*`, `pages/employersManagement/*`, `pages/employer-registration/*` | `/employer/*`, `/employers-management/*` | Employer | Three parallel employer roots | live | duplicate/overlap | investigate — consolidate |
| `pages/insuredPersons/*`, `pages/person/*`, `pages/ip-registration/*`, `pages/registration/*` | `/person/*`, `/ip-registration/*` | Insured Person | Four parallel IP roots | live | duplicate/overlap | investigate |
| `pages/compliance/*` (20+ subdirs) | `/compliance/*` | Compliance | Full compliance stack | live | canonical | keep |
| `pages/bema/*` | `/bema/*` | Compliance (legacy) | Predecessor of Compliance module | live but superseded | legacy | retire after route audit |
| `pages/legal/*` (including `pages/legal/reports/*` EPIC-09A/B/C) | `/legal/*` | Legal | V1-certified Legal platform | live | canonical | keep |
| `pages/legal-advanced/*` (LA prefixed) | `/legal-advanced/*` | Legal | Parallel "advanced" experiment | unknown | duplicate | investigate |
| `pages/legalFinal/*` | (various) | Legal | Older "final" iteration | unknown | duplicate | investigate |
| `pages/cashier/*`, `pages/finance/*` | `/cashier/*`, `/finance/*` | Finance | Receipting, allocation, refunds | live | canonical | keep |
| `pages/workflow/WorkflowManagement.tsx` | `/workflow/*`, `/admin/workflow-management` | Platform (Workflow) | Workflow definitions | live | canonical | keep |
| `pages/audit/*` | `/audit/*` | Internal Audit | Full IA lifecycle | live | canonical | keep |
| `pages/reports/*` | `/reports/*` | Reporting | Cross-module reports | live | canonical (partial) | investigate — align with Legal Reports Centre pattern |
| `pages/correspondence/*`, `pages/notifications/*`, `pages/templates/*` | `/notifications/*`, `/admin/comm/*`, `/admin/core-templates` | Notification | Template + delivery surface | live | overlap (Core Template Designer vs older template UI) | merge on Core Template Designer |
| `pages/external/*`, `pages/public/*`, `pages/online-applications/*`, `src/portals/*` | `/external/*`, `/public/*`, `/online-applications/*` | Portal | External surfaces | live | canonical | keep |
| `pages/setup/BootstrapAdmin.tsx` | `/setup/*` | Platform | Initial bootstrap | live | canonical | keep |
| `pages/crd/*` | `/crd/*` | IP / Cards | Card management | live | canonical | keep |
| `pages/medical/*`, `pages/meetings/*`, `pages/inspector/*`, `pages/selfEmployed/*` | (various) | Mixed | Module-specific surfaces | live | canonical | keep |
| `pages/db-diagram/*`, `pages/FoundationComponentsDemo.tsx`, `pages/dashboard/Index.tsx` | (various) | Platform / dev | Reference/demo screens | live/demo | not applicable | keep for developer use |
| `pages/sample-application/*`, `pages/test/*` | `/sample-applications/*`, `/test/*` | dev | Sample/test scaffolding | live | not applicable | keep (dev) |

---

## 3. Shared Platform Services

| Service | Current Routes | Current Pages | Owner | Consuming Modules | Duplicates | Gaps |
|---------|----------------|---------------|-------|-------------------|-----------|------|
| **Workflow** | `/admin/workflow-management`, `/admin/workflow-analytics`, `/admin/workflow-triggers`, `/admin/workflow-instances`, `/workflow/my-tasks`, `/workflow/applications-review` | `WorkflowManagement.tsx`, `systemAdmin/WorkflowSchemeList.tsx` | Platform | All | Two entry points | Analytics coverage uneven across modules |
| **Notification** | `/admin/notifications`, `/admin/notification-templates`, `/admin/comm/*`, `/admin/email-*`, `/admin/core-templates` | `NotificationManagement.tsx`, `NotificationTemplatesAdmin.tsx`, `NotificationLogs.tsx`, `EmailCampaigns.tsx`, `CoreTemplateAdmin.tsx`, `systemAdmin/NotificationChannelSettings.tsx` | Platform | All | `NotificationTemplates.tsx` (legacy) vs `*Admin`; `/admin/comm/templates/*` vs `/admin/core-templates` | Unified template resolver documented (`docs/architecture/template-designer-resolver-rules.md`); UI surface still split |
| **Audit (System)** | `/admin/logs`, `/system-logs/audit`, `/admin/audit-log`, `/admin/audit-logs` | `SystemLogs.tsx`, `systemAdmin/SystemLogs.tsx` | Platform | All | 4 audit-log route variants | Consolidate to single canonical `/system-logs/audit` |
| **Numbering** | `/admin/numbering` | `NumberingAdmin.tsx`, `NumberingRulesAdmin.tsx` (legacy) | Platform | All | Two files | Retire legacy `NumberingRulesAdmin.tsx` |
| **Scheduler** | `/admin/scheduler` | `CentralScheduler.tsx` | Platform | Notifications, BN payables, Legal recurring reports | None | investigate cron job registration UX |
| **DMS** | `/admin/dms`, `/documents/*` | `CoreDmsAdmin.tsx`, `DocumentConfigurationPage.tsx`, `documentMenuItems.ts` | Platform (DMS) | Legal, Compliance, BN, C3, Employer | Template Management link redirects to Notification Templates | Signatures page (`/documents/signatures`) status unknown |
| **Reporting** | `/legal/reports/*`, `/reports/*`, module-specific `/*/reports` | `pages/legal/reports/LegalReportsCentre.tsx` + canonical suite; `pages/reports/*` | Reporting | All | Per-module Reports pages | Unify around Legal Reports Centre pattern (EPIC-09) |
| **Security** | `/admin/security-*`, `/admin/data-access/*`, `/admin/api-keys` | `SecuritySettings.tsx`, `RolePermissionManagement.tsx`, `data-access/*`, `ApiKeysManagement.tsx` | Platform | All | `systemAdmin/SecuritySettings.tsx` vs `admin/SecuritySettings.tsx` | Data Access Test Console appears mock — investigate |
| **Feature / Module Management** | `/admin/modules`, `/admin/module-button-bindings` | `ModuleManagement.tsx`, `ModuleButtonBindings.tsx` | Platform | All | None | Feature-flag surface undocumented outside `docs/bn/permission_feature_flag_matrix.md` |
| **API / Integration** | `/admin/api-keys`, `/admin/public-api`, `/admin/external-apis`, `/admin/api-test-console/*`, `/admin/external-portal-*` | `ApiKeysManagement.tsx`, `PublicApiManagement.tsx`, `ExternalApiManagement.tsx`, api-test-console suite | Platform | Portals, external clients | None | Public API docs (`/public/api-docs`) status unknown |

---

## 4. Settings Ownership

| Settings Area | Route(s) | Classification |
|---------------|----------|----------------|
| Users, Roles, Offices, Departments, Designations, Delegations | `/admin/{users,roles,offices,departments,designations,delegations}` | **Platform** |
| Modules, Module Button Bindings, Numbering | `/admin/{modules,module-button-bindings,numbering}` | **Platform** |
| Security (password, MFA, IP access, security policy), Data Access Rules | `/admin/security-*`, `/admin/data-access/*` | **Platform** |
| Workflow, Scheduler, Session Health, System Logs, Audit Logs | `/admin/{workflow-*,scheduler,session-health,logs}`, `/system-logs/*` | **Platform** |
| Notification Templates, Channels, Comm Templates, Email Campaigns/Logs | `/admin/notification*`, `/admin/comm/*`, `/admin/email-*`, `/admin/core-templates` | **Platform (Notification)** |
| DMS Admin, Document Configuration, Template Assignments | `/admin/dms`, `/admin/document-configuration`, `/admin/configuration/template-assignments` | **Platform (DMS)** |
| API Keys, Public API, External APIs, API Test Console, External Portal Settings/Approvals | `/admin/{api-keys,public-api,external-apis,api-test-console/*,external-portal-*}` | **Platform (API)** |
| Master Data (countries, districts, industries, banks, occupations, marital, relations, sectors, methods of payment, etc.) | `/admin/master-data/*` | **Social Security Platform** |
| C3 Configuration, C3 Calculation Config, C3 Period Config, Fee Configuration, Payment Allocation Rules, Levy Slabs, Penalty Rates, SSC Rates, Income Categories/Codes, SEP Contribution Rates, Payer Types, Payment Sources, Invoice Types, Receipt Status | `/admin/c3-*`, `/admin/fee-configuration`, `/admin/ledger/allocation-rules`, various `/admin/master-data/*` | **Social Security Platform** |
| IP Card Configuration, Office IP Management | `/admin/{ip-card-configuration,office-ip-management}` | **Social Security Platform (IP)** |
| Approval Matrices (Journal, Payment, Refund, Write-Off, Fee Waiver) | `/admin/approval-matrix/*` | **Finance** |
| BN admin & configuration screens | `pages/bn/admin/*`, `pages/bn/config/*` | **BN** |
| Compliance admin (rules, geography, sampling, routing, staff, automation, comms) | `pages/compliance/{admin,settings,geography,sampling,staff,automation}/*` | **Compliance** |
| Legal Reports Centre, Data Quality, Executive Command, Shared Dashboards, Personalization, Managers | `pages/legal/reports/*` | **Legal** |
| Legal admin surfaces (workflow policies, routing, SLA, fees, waivers under `pages/legal/*`) | `/legal/admin/*` (per Legal architecture) | **Legal** |
| Portal-specific settings (external portal branding, portal hub config) | `/admin/external-portal-*`, `src/portals/*` config | **Portal** |
| BeMA (legacy) settings | `/bema/admin/*` | **Compliance (legacy)** → retire |
| Foundation Components Demo, DB Diagram, Sample Applications, Test Data Entry | `/sample-applications`, `/test/*`, `/foundation-components` | **Unknown (dev/demo)** |

---

## 5. Table Ownership Draft

Full table listing is out of scope of this inventory pass; table names below are inferred from service names in `src/services/*`, the Legal architecture doc, and referenced migrations. Anything not directly evidenced is marked **investigate**.

| Table (inferred) | Inferred Owner | Used By | Shared? | Action |
|------------------|----------------|---------|---------|--------|
| `lg_case`, `lg_case_intake`, `lg_case_action`, `lg_hearing`, `lg_order`, `lg_appeal`, `lg_enforcement_action`, `lg_notice`, `lg_recovery_*`, `lg_settlement`, `lg_consent_*`, `lg_fee_*`, `lg_legal_cost`, `lg_document_link`, `lg_workflow_policy`, `lg_routing_*`, `lg_sla_policy`, `lg_*_audit` | Legal | Legal services, Legal Reports Centre | module-specific | keep |
| `lg_recoverable_liability`, `v_lg_case_financials`, `lg_payment_allocation`, `lg_*_liability` | Legal (financial) | Legal, Compliance write-back, Executive Dashboard, BI | module-specific (single source) | keep — do not duplicate calc |
| `lg_shared_dashboard` (EPIC-09C) | Legal (BI) | Legal Reports Centre | module-specific | keep |
| `ce_legal_referrals`, compliance case / violation / assessment tables (prefixed `ce_*`) | Compliance | Compliance, Legal (referral bridge) | shared boundary | keep |
| BN benefit / entitlement / payment / product / formula tables (see `docs/bn/BN_Enterprise_Data_Model.md`) | BN | BN, Finance (payment issue) | module-specific | keep — refer BN docs |
| C3 filing / calculation tables (`pblcnt_*`, `c3_*`) | Contributions | C3, Employer, Compliance | shared across SS core | keep |
| Employer registration tables (`pblcnt_*` per project rules) | Employer | Employer, C3, Compliance, Legal | shared | keep |
| Insured Person registration tables (`pblcnt_applicants`, `pblcnt_dependants`, etc.) | Insured Person | IP, BN, Legal, Compliance | shared | keep |
| Workflow tables (definitions, instances, tasks, triggers) | Platform (Workflow) | All modules | shared | keep |
| Notification tables (templates, channels, logs, campaigns, dispatch, resolver) | Platform (Notification) | All modules | shared | keep |
| DMS tables (document store, generated documents, signatures) | Platform (DMS) | All modules | shared | keep |
| Audit-log tables (`legal_audit_log`, `legal_admin_audit`, generic audit) | Platform (Audit) | All modules (each writes its own `*_audit`) | shared pattern | keep — adapter pattern documented |
| Master data tables (countries, districts, industries, occupations, banks, etc.) | Social Security Platform | All modules | shared | keep |
| Internal Audit tables (`audit_*`) | Internal Audit | Audit | module-specific | keep |
| BeMA legacy tables | Compliance (legacy) | BeMA screens | to retire | investigate |
| Portal tables (external tokens, external submissions) | Portal | Portals, receiving modules | shared boundary | keep |
| Any legacy `newBenefit_*` / `nbenefit_*` tables | BN (legacy) | Older BN iterations | unknown | investigate |
| Any tables backing `legal-advanced` / `legalFinal` | Legal (legacy) | Duplicate legal screens | unknown | investigate |

> A full physical-schema audit is required before Phase 1 to promote this draft to a canonical Table Ownership Matrix.

---

## 6. Route & Navigation Gaps

**Duplicate routes** (observed in `AppRoutes.tsx`)
- `/admin/audit-log` vs `/admin/audit-logs` vs `/admin/audit` vs `/system-logs/audit` (audit-log surface fragmented; Epic 0.1 redirected 3 → 1).
- `/admin/notification-management` vs `/admin/notifications` (redirected).
- `/admin/user-management` vs `/admin/users` (redirected).
- `/admin/workflow` vs `/admin/workflow-management` (redirected).
- `/admin/system-monitoring` vs `/admin/session-health` (redirected).
- `/admin/comm/templates/*` (per-kind) vs `/admin/core-templates` vs `/admin/notification-templates` — three template UIs coexist.
- `/employer/*`, `/employers-management/*`, `/employer-registration/*` — three employer roots.
- `/person/*`, `/ip-registration/*`, IP-related routes under `/registration/*` — multiple IP roots.
- `/legal/*` vs `/legal-advanced/*` vs `legalFinal` pages.

**Orphan routes (route without discoverable menu entry)** — investigate
- `/admin/date-culture-consistency`, `/admin/dms-api-test`, `/admin/public-catalog-validation`, `/admin/seed-test-users`, `/admin/knowledge-base`, `/foundation-components`, `/db-diagram`, `/sample-applications/*`, `/test/*`.
- `/acknowledge-audit/:token` (linked only from email flow).

**Legacy redirects (already in AppRoutes)**
- `/admin/home`, `/admin/dashboard` → `/admin/platform`.
- `/admin/user-management`, `/admin/notification-management`, `/admin/workflow`, `/admin/system-monitoring`, `/admin/system-logs`, `/admin/audit` → canonical equivalents.

**Menu items without route** — investigate
- `documentMenuItems.ts` "Template Management" points to `/admin/notification-templates?tab=core&type=PDF` (cross-module link, not a dedicated DMS templates page).
- `auditMenuItems.ts` "Communication Templates" also cross-links to notification templates.

**Routes without menu**
- Everything under `/admin/api-test-console/*` (developer surface).
- `/admin/data-access/test-console` (developer surface).
- BN parallel roots (`newBenefit`, `nbenefit`) if still routed.

**Module boundary violations**
- Approval matrices under `/admin/*` are Finance-owned but appear in Platform admin surface — resolved via documentation (Ownership Matrix), not code.
- Legal reports duplicated inside `/reports/*` if any legal-flavoured cross-module reports were added there — investigate.
- `pages/admin/C3*Config*.tsx`, `IPCardConfiguration.tsx`, `SepContribRateManagement.tsx`, `PaymentAllocationRules.tsx`, `IncomeCategoryManagement.tsx`, `IncomeCodeManagement.tsx`, `LevySlabsConfigPage.tsx`, `FeeConfiguration.tsx` live under `pages/admin/*` but are Social Security / Finance domain — document ownership.

---

## 7. Cleanup Candidates

> Listed for planning only. Not deleted, not moved.

Legacy admin siblings (superseded by canonical `*Admin.tsx`):
- `pages/admin/UserManagementAdmin.tsx`
- `pages/admin/DepartmentManagement.tsx`
- `pages/admin/DesignationManagement.tsx`
- `pages/admin/OfficeManagement.tsx`
- `pages/admin/NotificationTemplates.tsx`
- `pages/admin/NumberingRulesAdmin.tsx`
- `pages/admin/OrganizationManagementAdmin.tsx` (kept as redirector to `OrganizationManagementShell`)

systemAdmin duplicates of canonical `pages/admin/*`:
- `pages/systemAdmin/SecuritySettings.tsx`
- `pages/systemAdmin/SessionHealth.tsx`
- `pages/systemAdmin/SystemLogs.tsx`
- `pages/systemAdmin/SystemSettings.tsx` / `GlobalSettings.tsx`
- `pages/systemAdmin/NotificationTemplates.tsx` / `NotificationChannelSettings.tsx` / `NotificationLog.tsx`
- `pages/systemAdmin/WorkflowSchemeList.tsx`
- `pages/systemAdmin/EmployeeList.tsx`, `PositionList.tsx`, `RoleList.tsx`, `DelegationList.tsx`, `OrgUnitList.tsx`, `UserManagement.tsx`, `ReferenceSequencesAdmin.tsx`

Parallel BN iterations:
- `pages/newBenefit/*`
- `pages/nbenefit/*`

Parallel Legal iterations:
- `pages/legal-advanced/*`
- `pages/legalFinal/*`

Legacy Compliance:
- `pages/bema/*` and `/bema/*` routes

Parallel Employer / IP roots:
- `pages/employer-registration/*` vs `pages/employer/*` vs `pages/employersManagement/*`
- `pages/registration/*` vs `pages/ip-registration/*` vs `pages/insuredPersons/*` vs `pages/person/*`

Old / thin template UIs superseded by Core Template Designer:
- `pages/admin/comm/templates/*` per-kind pages (verify they aren't the Core Designer itself before retiring).

Ambiguous / possibly mock pages (investigate maturity):
- `pages/admin/PublicCatalogValidation.tsx`
- `pages/admin/DateCultureConsistency.tsx`
- `pages/admin/SeedTestUsers.tsx`
- `pages/admin/DmsApiTest.tsx`
- `pages/FoundationComponentsDemo.tsx`

---

## 8. Recommended Implementation Roadmap

Based only on observed inventory. Each phase is scope-bounded and non-destructive until confirmed by the owning module lead.

**Phase 0 — Cleanup (documentation + redirects only)**
- Extend `docs/platform/PLATFORM_OWNERSHIP_MATRIX.md` with legacy → canonical map for all systemAdmin duplicates.
- Add `<Navigate replace />` for remaining duplicate admin routes.
- Retire BeMA routes (redirect to Compliance equivalents).
- Mark `newBenefit`, `nbenefit`, `legal-advanced`, `legalFinal` for investigation; do not delete.

**Phase 1 — Shared Platform Services consolidation**
- Consolidate Notification Templates on Core Template Designer; retire legacy template pages.
- Consolidate audit-log surface on `/system-logs/audit`.
- Consolidate Workflow entry on `/admin/workflow-management`.
- Publish canonical Reporting pattern (Legal Reports Centre) as reference; migrate `/reports/*` under it.
- Complete Table Ownership Matrix (physical schema audit).

**Phase 2 — Social Security foundation**
- Consolidate Employer roots (`employer` / `employersManagement` / `employer-registration`).
- Consolidate Insured Person roots (`person` / `insuredPersons` / `ip-registration` / `registration`).
- Reaffirm Master Data ownership under Social Security Platform.

**Phase 3 — BN settings and product framework**
- Audit `pages/bn/admin/*` and `pages/bn/config/*` against `docs/bn/*` (formula library, product bindings, permission/feature flag matrix).
- Retire `newBenefit` / `nbenefit` iterations after functional parity confirmed.
- Formalise BN product framework routes.

**Phase 4 — Claims and decisions**
- Harden `pages/bn/{intake,claims,engine,approval}/*` and BN ↔ Workflow integration per `docs/bn/BN_Workflow_Integration_Specification.md`.
- Legal ↔ BN referral bridge audit.

**Phase 5 — Entitlement / payment / servicing**
- Align `pages/bn/{entitlement,payables,schedule,issue,postissue,servicing}/*` with Finance approval matrices.
- Verify single-source financial rule (`v_lg_case_financials` for Legal, equivalent BN payment source) — no duplicate calculations across modules.
- Portal-facing entitlement views audit.

---

## Acceptance Checklist

- [x] Documentation-only; no new routes, tables, services, migrations, or screens.
- [x] References existing Platform Ownership Matrix (`docs/platform/PLATFORM_OWNERSHIP_MATRIX.md`) and Epic 0.1 acceptance doc.
- [x] Every recommendation ties to an observed file, route, or existing doc.
- [x] Unknown items are flagged **investigate**, not guessed.
