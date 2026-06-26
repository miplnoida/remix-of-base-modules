# Legal Module — Screen Dependency Matrix

Source of truth for the IA refactor. Every `/legal/*` and `/legal-advanced/*` screen is listed below with its classification for the new IA.

**Classifications**
- `STANDALONE` — keeps its own sidebar entry in the new IA
- `MATTER_TAB` — becomes a tab inside the Legal Matter Workspace; sidebar entry removed but route preserved
- `ADMIN` — moves under Administration grouping
- `REFERENCE` — reference data screen under Administration → Reference Data
- `REPORT` — exposed via Dashboard → Reports drawer
- `DUPLICATE_OF(<canonical>)` — duplicate component; new menu points at canonical, legacy route preserved
- `LEGACY_KEEP_AS_REDIRECT` — sidebar entry removed, route 301→ new equivalent

> Permissions / tables columns reflect best inference from imports; verified during Phase 1 against `role_permissions` and code search.

---

## 1. Dashboards

| Route | Component | Permission | Primary tables | Classification | New location |
|---|---|---|---|---|---|
| `/legal/dashboard` | `LegalDashboard` | `view_legal` | `lg_case`, `lg_hearing` | `DUPLICATE_OF(LgDashboard)` | Dashboard |
| `/legal/lg/dashboard` | `LgDashboard` | `view_legal` | `lg_case`, `lg_hearing`, `lg_case_action` | **STANDALONE** (canonical) | Dashboard → Executive |
| `/legal/ops` | `LegalOpsDashboard` | `view_legal` | `lg_case`, `lg_case_assignment` | **STANDALONE** | Dashboard → Team |
| `/legal-advanced` (`LADashboard`) | `LADashboard` | `view_legal_advanced` | `la_matter` | `LEGACY_KEEP_AS_REDIRECT` → `/legal/lg/dashboard` | — |
| `/legal` | `NewLegalModule` | `view_legal` | landing | `LEGACY_KEEP_AS_REDIRECT` → `/legal/lg/dashboard` | — |

## 2. Workbench / Queues

| Route | Component | Permission | Primary tables | Classification | New location |
|---|---|---|---|---|---|
| `/legal/workbench` | `LegalWorkbench` | `view_legal` | `lg_case`, `la_matter` | `DUPLICATE_OF(unified workbench)` | Workbench → My Work |
| `/legal/referrals-workbench` | `LegalReferralsWorkbench` | `view_legal_referrals` | `legal_referral`, `bn_legal_referral`, `ce_legal_referrals` | **STANDALONE** (folded into unified Workbench) | Workbench → Department Referrals queue |
| `/legal/advice/workbench/:bucket` | `AdviceWorkbench` | `view_legal_advice` | `la_advice_request`, `la_matter` | **STANDALONE** (folded) | Workbench → Awaiting Information / Response Received |
| `/legal-advanced/workbaskets` | `LAWorkbaskets` | `view_legal_advanced` | `la_workbasket`, `la_matter_workbasket` | `LEGACY_KEEP_AS_REDIRECT` → `/legal/workbench` | — |

## 3. Cases / Matters (Litigation)

| Route | Component | Permission | Primary tables | Classification | New location |
|---|---|---|---|---|---|
| `/legal/lg/cases` | `LgCaseList` | `view_legal` | `lg_case` | **STANDALONE** (canonical) | Litigation → Legal Matters |
| `/legal/lg/cases/new` | `LgCaseCreateWizard` | `create_legal_case` | `lg_case`, `lg_case_intake` | **STANDALONE** | Litigation → Legal Matters → New |
| `/legal/lg/cases/:id` | `LgCaseDetail` | `view_legal` | `lg_case`, all `lg_case_*` | **STANDALONE** (Matter Workspace host) | Litigation → Matter Workspace |
| `/legal/lg/cases/:id/edit` | `LgCaseEdit` | `edit_legal_case` | `lg_case` | **STANDALONE** | Matter Workspace → header action |
| `/legal/cases` | `CaseTracking` | `view_legal` | `legal_cases` (legacy) | `DUPLICATE_OF(LgCaseList)` | redirect via menu |
| `/legal/case-tracking` | `CaseTracking` | `view_legal` | legacy | `DUPLICATE_OF(LgCaseList)` | redirect |
| `/legal/cases/delinquent` | `DelinquentCases` | `view_legal` | `legal_cases` | `LEGACY_KEEP_AS_REDIRECT` → Workbench filter | — |
| `/legal/case-detail/:id` | `CaseDetailView` | `view_legal` | `legal_cases` | `DUPLICATE_OF(LgCaseDetail)` | — |
| `/legal/case-edit/:id` | `CaseEditView` | `edit_legal_case` | `legal_cases` | `DUPLICATE_OF(LgCaseEdit)` | — |

## 4. Intake

| Route | Component | Permission | Primary tables | Classification | New location |
|---|---|---|---|---|---|
| `/legal/cases/intake` | `CaseIntake` | `create_legal_case` | `lg_case_intake` | `DUPLICATE_OF(LgCaseCreateWizard)` | Litigation → New Matter |
| `/legal/case-intake` | `CaseIntake` | `create_legal_case` | same | `DUPLICATE_OF(LgCaseCreateWizard)` | redirect |
| `/legal/cases/intake/:id` | `IntakeDetail` | `view_legal` | `lg_case_intake` | **MATTER_TAB** (Intake tab) | Matter Workspace → Intake |
| `/legal/admin/intake-validation` | `IntakeValidationReport` | `lg_admin_intake_validation` | `lg_case_intake` | **ADMIN** | Administration → System → Integrity Checks |

## 5. Hearings / Court / Orders / Appeals

| Route | Component | Permission | Primary tables | Classification | New location |
|---|---|---|---|---|---|
| `/legal/lg/hearings` | `LgHearingCalendar` | `view_legal` | `lg_hearing` | **STANDALONE** (canonical) | Workbench → Calendar (cross-matter) |
| `/legal/hearings` | `LegalHearingCalendar` | `view_legal` | `legal_hearings` | `DUPLICATE_OF(LgHearingCalendar)` | redirect |
| `/legal/court-orders` | `CourtOrdersManagement` | `view_legal` | `lg_order` | **STANDALONE** + tab | Litigation → Orders & on Matter |
| `/legal/notices` | `NoticeGeneration` | `view_legal` | `lg_notice` | **MATTER_TAB** | Matter Workspace → Letters |
| `/legal/appeals` | `AppealSubmission` | `view_legal` | `lg_case` | **MATTER_TAB** | Matter Workspace → Appeals |
| `/legal/evidence` | `LegalEvidenceManagement` | `view_legal` | `lg_document_link` | **MATTER_TAB** | Matter Workspace → Documents |

## 6. Recovery & Enforcement

| Route | Component | Permission | Primary tables | Classification | New location |
|---|---|---|---|---|---|
| `/legal/enforcement` | `EnforcementActions` | `manage_enforcement` | `lg_case_action` | **STANDALONE** | Recovery & Enforcement → Recovery Actions |
| `/legal/payment-plans` | `LegalPaymentPlans` | `view_legal` | `core_payment_arrangement`, `lg_payment_arrangement_link` | **STANDALONE** | Recovery & Enforcement → Payment Arrangements |

## 7. Legal Services (Advice / Contract Review)

| Route | Component | Permission | Primary tables | Classification | New location |
|---|---|---|---|---|---|
| `/legal/advice/dashboard` | `ContractReviewDashboard` | `view_legal_advice` | `la_advice_request` | **STANDALONE** | Legal Services → Legal Advice Requests |
| `/legal/advice/new` | `ContractReviewIntake` | `create_legal_advice` | `la_advice_request`, `la_matter` | **STANDALONE** | Legal Services → New Advice |
| `/legal/advice/mine` | `MyContractReviews` | `view_legal_advice` | same | **STANDALONE** | Legal Services → My Requests |
| `/legal/advice/:id` | `ContractReviewDetail` | `view_legal_advice` | same | **STANDALONE** | Legal Services → detail |
| `/legal/contract-review/dashboard` | `ContractReviewDashboard` | `view_legal_contract` | `lg_contract_review` | **STANDALONE** | Legal Services → Contract Reviews |
| `/legal/contract-review/new` | `ContractReviewIntake` | `create_legal_contract` | same | **STANDALONE** | Legal Services → New Contract Review |
| `/legal/contract-review/mine` | `MyContractReviews` | `view_legal_contract` | same | **STANDALONE** | Legal Services → My Reviews |
| `/legal/contract-review/:id` | `ContractReviewDetail` | `view_legal_contract` | same | **STANDALONE** | Legal Services → detail |

> Note: Advice and Contract Review currently resolve to the **same** components. Phase 4 will unify the underlying intake/detail behind a `request_type` discriminator while preserving both URL families.

## 8. Knowledge & Documents

| Route | Component | Permission | Primary tables | Classification | New location |
|---|---|---|---|---|---|
| `/legal/documents` | `DocumentCenter` | `view_legal` | `lg_document_link`, `core_generated_document` | **STANDALONE** | Knowledge & Documents → Document Centre |
| `/legal/templates` | `ModuleTemplates(LEGAL)` | `view_legal_templates` | `core_template` | **STANDALONE** | Knowledge & Documents → Templates |
| `/legal/admin/templates` | `LegalTemplateManagement` | `lg_admin_templates` | `core_template` | **ADMIN** | Administration → Communications → Templates |
| `/legal/admin/templates/:id/edit` | `LegalTemplateEditor` | `lg_admin_templates` | `core_template`, `core_template_version` | **ADMIN** | Administration → Communications → Templates → Edit |
| `/legal/admin/legal-references` | `LegalReferenceLibrary` | `lg_admin_legal_refs` | `core_legal_reference` | **STANDALONE** | Knowledge & Documents → Legal References |
| `/legal/admin/legal-references/verification` | `LegalReferenceVerification` | `lg_admin_legal_refs` | same | **ADMIN** | Administration → System → Integrity Checks |

## 9. Reports

| Route | Component | Permission | Primary tables | Classification | New location |
|---|---|---|---|---|---|
| `/legal/reports/cases-by-stage` | `CasesByStageReport` | `view_legal_reports` | `lg_case` | **REPORT** | Dashboard → Reports |
| `/legal/reports/recovery` | `RecoveryAnalysis` | `view_legal_reports` | `lg_payment_arrangement_link` | **REPORT** | Dashboard → Reports |
| `/legal/reports/aging` | `AgingReceivables` | `view_legal_reports` | `lg_case` | **REPORT** | Dashboard → Reports |
| `/legal/reports/costs-fees` | `CourtCostsFees` | `view_legal_reports` | `lg_fee_charge` | **REPORT** | Dashboard → Reports |
| `/legal/reports/performance` | `PerformanceMetrics` | `view_legal_reports` | `lg_case`, `lg_case_assignment` | **REPORT** | Dashboard → Reports |
| `/legal/reports/pending-hearings` | `PendingHearings` | `view_legal_reports` | `lg_hearing` | **REPORT** | Dashboard → Reports |

## 10. Administration

### 10a. Work Management

| Route | Component | Permission | Tables | New location |
|---|---|---|---|---|
| `/legal/admin/teams` | `LegalAdminTeams` | `lg_admin_teams` | `lg_team`, `lg_team_member`, `lg_team_workbasket` | Administration → Work Management → Teams |
| `/legal/admin/staff` | `LegalAdminStaff` | `lg_admin_staff` | `lg_staff`, `lg_workbasket_role` | Administration → Work Management → Staff |
| `/legal/admin/routing` | `LegalAdminRouting` | `lg_admin_routing` | `lg_routing_policy`, `lg_routing_*` | Administration → Case Processing → Routing Rules |
| `/legal-advanced/workbaskets` | `LAWorkbaskets` | `view_legal_advanced` | `la_workbasket` | redirect → `/legal/admin/teams` |

### 10b. Case Processing

| Route | Component | Permission | Tables | New location |
|---|---|---|---|---|
| `/legal/admin/policy` | `LgPolicyConfig` | `lg_admin_policy` | `lg_workflow_policy` | Administration → Case Processing → Workflow Rules |
| `/legal/admin/workflow` | `LgPolicyConfig` | same | same | duplicate, redirect |
| `/legal/admin/stage-template-mapping` | `LegalStageTemplateMapping` | `lg_admin_stage` | `lg_stage_template_mapping` | Administration → Case Processing → Stage Rules |
| `/legal/admin/stage-reference-mapping` | `LegalStageReferenceMapping` | `lg_admin_stage` | `lg_stage_reference_mapping` | Administration → Case Processing → Stage Rules |
| `/legal/admin/stage-document-rules` | `LegalStageDocumentRules` | `lg_admin_stage` | `lg_stage_document_rule` | Administration → Case Processing → Stage Rules |
| `/legal/admin/sla-rules` | `LegalAdminSlaRules` | `lg_admin_sla` | `legal_referral_sla_rule` | Administration → Case Processing → SLA Rules |
| `/legal/settings/workflow` | `CaseWorkflow` | `manage_legal_settings` | `legal_workflow_stages` | Administration → Case Processing → Workflow Rules |
| `/legal/settings/statuses` | `CaseStatuses` | `manage_legal_settings` | `legal_status_transitions` | Administration → Case Processing → Workflow Rules |

### 10c. Reference Data

| Route | Component | Permission | Tables | New location |
|---|---|---|---|---|
| `/legal/admin/codesets` | `LegalAdminCodeSets` | `lg_admin_codesets` | `legal_code_sets` | Administration → Reference Data |
| `/legal/admin/code-sets` | `LegalAdminCodeSets` | same | same | duplicate, redirect |
| `/legal/admin/complainant` | `LegalAdminComplainant` | `lg_admin_complainant` | `legal_complainant_settings` | Administration → Reference Data |
| `/legal/admin/courts` | `LegalCourtAdmin` | `lg_admin_courts` | `lg_court`, `lg_court_*` | Administration → Reference Data → Courts |
| `/legal/admin/document-types` | `LegalAdminPlaceholder` | `lg_admin_doc_types` | `core_dms_document_type` | Administration → Reference Data |
| `/legal/settings/courts` | `CourtsJudges` | `manage_legal_settings` | `legal_cases` | duplicate → redirect |
| `/legal/settings/hearing-types` | `HearingTypes` | `manage_legal_settings` | `legal_hearings` | Administration → Reference Data |
| `/legal/settings/roles` | `LegalRoles` | `manage_legal_settings` | `legal_parties` | Administration → Reference Data |
| `/legal/settings/territory` | `TerritorySettings` | `manage_legal_settings` | `legal_settlements` | Administration → Reference Data |
| `/legal/config/reference-data` | `LegalReferenceData` | `view_legal_config` | `core_reference_group`, `core_reference_value` | Administration → Reference Data |

### 10d. Fees & Waivers

| Route | Component | Permission | Tables | New location |
|---|---|---|---|---|
| `/legal/admin/fees` | `LgFeeConfig` | `lg_admin_fees` | `lg_fee_rule` | Administration → Reference Data → Fees |
| `/legal/admin/fee-bundles` | `LegalAdminPlaceholder` | `lg_admin_fee_bundles` | `lg_fee_bundle` | Administration → Reference Data → Fees |
| `/legal/admin/waiver-policies` | `LgFeeWaiverPolicyConfig` | `lg_admin_waivers` | `lg_fee_waiver_policy` | Administration → Reference Data → Fees |
| `/legal/settings/fee-mappings` | `FeeMappings` | `manage_legal_settings` | legacy | Administration → Reference Data → Fees |

### 10e. System

| Route | Component | Permission | Tables | New location |
|---|---|---|---|---|
| `/legal/admin/profile` | `LegalAdminDepartmentProfile` | `lg_admin_profile` | `lg_department_profile` | Administration → System → Department Profile |
| `/legal/admin/permissions` | `LegalAdminPlaceholder` | `lg_admin_permissions` | `role_permissions` | Administration → System → Permissions |
| `/legal/admin/audit` | `LegalAdminPlaceholder` | `lg_admin_audit_log` | `legal_audit_log` | Administration → System → Audit |
| `/legal/admin/validation` | `LegalAdminValidationReport` | `lg_admin_validation` | mixed | Administration → System → Integrity Checks |
| `/legal/admin/referral-integrity` | `LegalAdminReferralIntegrity` | `lg_admin_validation` | `legal_referral` | Administration → System → Integrity Checks |
| `/legal/admin/case-integrity` | `LegalAdminCaseIntegrity` | `lg_admin_validation` | `lg_case` | Administration → System → Integrity Checks |
| `/legal/admin/assignment-integrity` | `LegalAdminAssignmentIntegrity` | `lg_admin_validation` | `lg_case_assignment` | Administration → System → Integrity Checks |
| `/legal/admin/matter-workspace-integrity` | `LegalMatterWorkspaceIntegrity` | `lg_admin_matter_workspace_integrity` | `lg_case`, `la_matter` | Administration → System → Integrity Checks |
| `/legal-advanced/settings` | `LASettings` | `view_legal_advanced` | `la_routing_rule`, `la_matter_type` | redirect → `/legal/admin/routing` |

---

## Summary counts

- **Total routes audited:** 75 + 7 advanced = **82**
- **Canonical (kept in sidebar):** 28
- **Becomes Matter Workspace tab:** 6
- **Admin pages (regrouped):** 24
- **Reports:** 6
- **Duplicates / legacy redirects:** 18

Every route remains reachable; only the sidebar entries change.
