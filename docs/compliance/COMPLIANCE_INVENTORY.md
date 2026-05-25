# Compliance & Enforcement — Access-Control & Implementation Inventory

Generated: 2026-05-25 — context-reset baseline before resuming Compliance build.
Scope: read-only audit. **No code changed.** Use this document as the source of
truth for "what exists" before adding new Compliance functionality, so we do not
duplicate screens, tables, hooks, workflows, or permissions.

---

## 1. Module footprint (high level)

| Layer | Count | Location |
|---|---|---|
| Page components | **102** files | `src/pages/compliance/**` |
| Reusable components | ~60+ files | `src/components/compliance/**` |
| Hooks | 6 in `src/hooks/compliance/` + 13 top-level `useCompliance*`, `useRisk*`, `useLegalCases`, `useInspectorWorkboard`, `useEmployerCompliance*` | `src/hooks/**` |
| Adapters | `complianceAdapter.ts` | `src/adapters/` |
| Domain libs | `capabilities.ts`, `commTriggerEngine.ts`, `fieldStageResolver.ts`, `riskScoringEngine.ts`, `visitStageMapping.ts` | `src/lib/compliance/` |
| Supabase tables | **159** `ce_*` tables | `public` schema |
| Supabase views | 31 `ce_*` views | `public` schema |
| Edge functions | 12 (`ce-*`, `compliance-*`, `run-compliance-job`, `run-notice-generation`, seed fns) | `supabase/functions/` |
| Sidebar menu | `complianceMenuItems.ts` (active) + `bemaComplianceMenuItems.ts` (legacy, **not registered** in `sidebarMenuItems.ts`) | `src/components/sidebar/menuItems/` |
| Routes | `src/pages/compliance/Routes.tsx` — 7 sections, ~80 routes + ~40 legacy redirects | mounted under `/compliance/*` |
| Docs | `docs/compliance/**` — Admin index + 25+ screen docs + Phase 1–5 risk model | — |

Conclusion: this is a **large, already-substantive module**. Default posture for
any new work must be **reuse / extend** — not rebuild.

---

## 2. Route map (canonical, under `/compliance`)

```
1. /workbench         manager | inspector | legal | analytics | monitoring | queues | review-queue | reassignment
2. /violations        list | manual-entry | :id
3. /cases             list | queue | penalties
4. /field             plan-builder | my-plans | pending-review/:planId | execution | operations
                      inspections | findings | employer-statements | employer-statement/:id
                      visit/:employerId | employer-360 | employer-360/:id | employer-risk/:id
                      sampling | sampling/candidates | my-upcoming
                      weekly-report | weekly-reports | all-reports
                      audit-management | audit-details/:id | plan-execution | audit-report/:id
5. /enforcement       notices | arrangements | breaches | waivers
                      recommendation-queue | legal-queue | proceedings | legal-referral/new
6. /reports           violations-analytics | inspector-performance | c3-compliance | arrears
                      audit | arrangements | legal | trends
7. /admin             settings + settings/{rule-engine,violation-types,assignment-routing,number-templates,
                      risk-policy,templates,sampling,c3-ledger-sync,payment-ledger-sync,ledger-admin,
                      ledger-posting,ledger-operations,ledger-help}
                      communication-templates(+ /new, /:id) | report-templates | document-foundation
                      online-response
                      geography/{zones,office-zone-mapping,village-zone-mapping}
                      staff/{officers,queue-members,supervisors,link-legacy}
                      automation/{jobs,history,employer-jobs}
                      tools/{rule-simulator,risk-simulator}
```

Legacy paths (~40) all `<Navigate replace>` into the canonical `/compliance/*`
tree. **Do not add new top-level (non-`/compliance`) routes for compliance.**

---

## 3. Database surface (`ce_*`)

**By domain (159 tables, 31 views):**

- **Violations:** `ce_violations`, `ce_violation_types`, `ce_violation_assignments`,
  `ce_violation_correspondence`, `ce_violation_employer_snapshot`,
  `ce_violation_history`, `ce_violation_notes`, `ce_detection_rules`,
  `ce_calculation_rules`, `ce_rule_variable_mappings`
- **Cases:** `ce_cases`, `ce_case_actions`, `ce_case_assignments`,
  `ce_case_correspondence`, `ce_case_documents`, `ce_case_employer_snapshot`,
  `ce_case_families`, `ce_case_history`, `ce_case_merge_history|rules`,
  `ce_case_notices`, `ce_case_recommendations(+_history)`, `ce_case_reopen_rules`,
  `ce_case_risk_snapshots`, `ce_case_severity_rules`, `ce_case_status_masters`,
  `ce_case_violations`
- **Inspections / field:** `ce_inspections`, `ce_inspection_findings`,
  `ce_inspection_evidence`, `ce_inspection_employer_interactions`,
  `ce_inspection_working_papers`, `ce_field_activities`, `ce_planned_visits`,
  `ce_weekly_plans(+_items, +_item_audit, +_reviews)`,
  `ce_plan_revision_reasons`, `ce_planner_*` (5), `ce_inspectors`,
  `ce_inspector_performance`, `ce_inspector_status_history`,
  `ce_mobile_audit_log`, `ce_mobile_devices`, `ce_mobile_refresh_tokens`
- **Audit reports / communications:** `ce_audit_*` (≈25 tables — checklist,
  templates, deliveries, recipients, dispute submissions, response submissions,
  schedule/approval policies, secure_tokens, report versions/signatures,
  acknowledgments, field stage map, prior matter links, priority weights)
- **Risk:** `ce_risk_bands`, `ce_risk_config`, `ce_risk_policies`,
  `ce_risk_policy_factors`, `ce_risk_profiles`, `ce_risk_score_history`,
  `ce_case_risk_snapshots`
- **Enforcement:** `ce_notices`, `ce_notice_templates`, `ce_notice_delivery_log`,
  `ce_notice_validation_log`, `ce_employer_notice_recipients`,
  `ce_payment_arrangements`, `ce_arrangement_breaches`, `ce_arrangement_policies`,
  `ce_breach_monitoring`, `ce_installments`, `ce_waivers`,
  `ce_legal_escalations(+_log, +_rules)`, `ce_legal_proceedings`,
  `ce_legal_recommendations`, `ce_legal_referrals(+_lines)`,
  `ce_legal_documents`, `ce_legal_escalation_policies(+_rules)`,
  `ce_escalation_prerequisites`, `ce_penalty_calculations`,
  `ce_follow_up_actions(+_history)`
- **Ledger / sync (C3 ↔ Compliance):** `ce_c3_ledger_sync_log`,
  `ce_payment_ledger_sync_log`, `ce_ledger_periods`, `ce_posting_queue`,
  `ce_payment_allocations`, `ce_payment_observation_log`,
  `ce_reconciliation_exceptions`, `ce_employer_financial_ledger`
- **Employer 360:** `ce_employer_compliance_status`, `ce_employer_compliance_flags`,
  `ce_employer_contact_preferences`, `ce_employer_groups`,
  `ce_employer_group_membership`, `ce_employer_relationships`,
  `ce_employer_service_log`, `ce_employer_snapshots`,
  `ce_employer_snapshot_history`, `ce_group_compliance_rollup`
- **Geography / staffing:** `ce_zones`, `ce_zone_office_mapping`,
  `ce_village_zone_mapping`, `ce_queue_members`, `ce_assignment_queues`,
  `ce_assignment_routing_rules`, `ce_review_queue`
- **Automation:** `ce_automation_jobs`, `ce_automation_job_runs`,
  `ce_automation_runs`, `ce_job_run_log`, `ce_manual_rebuild_request`
- **Settings / document foundation:** `ce_settings`,
  `ce_compliance_policies`, `ce_completion_gate_config`,
  `ce_number_sequences`, `ce_number_templates`,
  `ce_document_templates(+_sections, +_settings)`,
  `ce_document_section_library`, `ce_org_document_foundation`,
  `ce_online_response_*` (3)
- **Scouting / leads:** `ce_scouting_leads`, `ce_scouting_lead_history`
- **Audit trail:** `ce_audit_log`

**Key views to reuse:**
`ce_v_compliance_kpis`, `ce_v_compliance_monitoring`, `ce_v_employer_arrears_summary`,
`ce_v_employer_filing_status`, `ce_v_employer_legal_status`,
`ce_v_employer_payment_status`, `ce_v_employer_timeline`,
`ce_v_employer_workforce`, `ce_v_officer_performance`, `ce_v_violation_trends`,
`ce_v_arrangement_health`, `ce_v_case_monthly_trend`,
`ce_v_case_resolution_stats`, `ce_v_c3_*` (4 — **the C3 integration surface**),
`ce_v_plan_*` (3), `ce_v_visit_execution_metrics`,
`ce_v_payments_unposted_to_ledger`, `ce_v_unobserved_payment_entries`,
`ce_v_payment_reconciliation_exceptions`, `ce_v_weekly_report_summary`,
`ce_inspector_profiles`, `ce_employer_profile_view`,
`ce_employer_hierarchy_view`, `ce_employer_contact_view`,
`ce_employer_group_summary_view`, `ce_ledger_reversals_v`.

**Rule (memory):** RLS is mostly disabled on `ce_*`; rely on the role/capability
gate in code. Financial/audit tables still have RLS — check before reading/writing.

---

## 4. Edge functions (existing — reuse)

| Function | Purpose |
|---|---|
| `ce-violation-scan` | Scheduled violation detection over `ce_detection_rules` |
| `ce-notice-gen` / `run-notice-generation` | Templated notice generation pipeline |
| `ce-notice-validate` | Pre-issue notice validation |
| `ce-risk-recalculation` | Recalc `ce_risk_profiles` / `ce_risk_score_history` |
| `ce-compliance-refresh` | Refresh KPI / monitoring views and snapshots |
| `compliance-intelligence` | LLM-assisted compliance analysis |
| `compliance-mobile-api` / `compliance-mobile-auth` | Field inspector mobile app |
| `run-compliance-job` | Generic automation runner used by `ce_automation_jobs` |
| `seed-compliance-officers`, `seed-compliance-test-users` | Seed-only (`SEED-` prefix) |

**Do not add new edge functions for violation scan, notice generation, risk
recalc, or job execution.** Extend the existing ones.

---

## 5. Access-control model

### 5.1 Operational roles (capability bundles)
`src/lib/compliance/capabilities.ts` defines:

- Roles: `inspector` | `senior` | `head` | `other`
  (derived in `useComplianceRole.ts` from `auth.roles` / profile role names —
  matches `ComplianceInspector`, `SeniorInspector`, `ComplianceHead`,
  case-insensitive, no country-specific names).
- 15 capability constants under `COMPLIANCE_CAPABILITIES` (FIELD_*, VIOLATIONS_MANAGE,
  CASES_MANAGE, ENFORCEMENT_*, WORKBENCH_*, REPORTS_*).
- `ROLE_CAPABILITIES` mapping per role; `head` gets all.
- `useHasCapability(cap)` gate — checks capability bundle first, then falls back
  to legacy permission `manage_compliance`, then `Admin` role.

### 5.2 Legacy permission gate
Sidebar (`complianceMenuItems.ts`) still uses string permissions only:
`manage_compliance`, `conduct_inspections`, `create_weekly_plan`,
`approve_weekly_plan`, `generate_reports`, `view_financial_data`.
These resolve through the project's existing permission system (`useSupabaseAuth`
roles + `Permission` type in `src/types/auth.ts`). **No parallel permission
table exists for Compliance** — keep it that way.

### 5.3 Row-level access utilities
`src/hooks/useDataAccessPolicy.ts` exposes `useRowAccess`, `useFieldVisibility`,
`maskFieldValue`, `useUserDataOverrides` — driven by RPCs `check_row_access` and
`get_visible_fields`. Use these for field masking / per-row gating on new
compliance screens instead of inventing parallel logic.

### 5.4 Test users (seeded)
`compliance.inspector1@test.com`, `compliance.senior1@test.com`,
`compliance.head1@test.com` (see memory `Compliance Role-Based Workbench` and
`Testing & Seeding Context`).

---

## 6. Workflow integration

- **No direct references** to `workflow_definitions` / `workflow_instances`
  exist under `src/pages/compliance`, `src/hooks/compliance`, or
  `src/components/compliance` today.
- The project ships a generic workflow engine (admin tables already configured
  per memories `Workflow Task Safety`, `Notification Engine`, `Maker-Checker`).
- **Action for new Compliance flows that need approvals** (e.g. weekly-plan
  review, notice issuance, waiver approval, legal referral): bind them through
  the existing `workflow_definitions` engine, **do not introduce a parallel
  approval table.** `ce_audit_comm_approval_policies` and
  `ce_planner_action_approvals` are domain config tables — they feed into the
  generic engine, not replace it.

---

## 7. C3 → Compliance integration (existing — do not duplicate)

C3 is now strictly an **upstream data source**. Compliance reads C3 via:

| Surface | Source |
|---|---|
| Aggregate C3 stats | view `ce_v_c3_aggregate_stats` |
| Filing compliance summary per employer/period | view `ce_v_c3_compliance_summary` |
| Unposted C3 → ledger queue | view `ce_v_c3_unposted_to_ledger` |
| C3 ledger sync log | table `ce_c3_ledger_sync_log` |
| Admin screen | `/compliance/admin/settings/c3-ledger-sync` (`C3LedgerSync.tsx`) |
| Reports | `/compliance/reports/c3-compliance` (`C3Compliance.tsx`) |
| Settings doc | `docs/compliance/admin/integrations-ledger/c3-ledger-sync.md` |

**Rule:** any new "expected contribution vs filed C3" check must query the
view above. **Do not** reimplement C3 contribution math inside compliance —
the canonical path is C3 RPC → ledger sync → `ce_v_*` views.

---

## 8. Sidebar / menu surfaces

- **Active:** `complianceMenuItems.ts` (registered? — verify in
  `sidebarMenuItems.ts` aggregator; **currently NOT exported there** — only
  `userMenuItems`, `masterDataMenuItems`, `bnMenuItems`, `systemAdminMenuItems`).
  This means the compliance sidebar is wired in elsewhere (likely via DB-driven
  `app_modules` per memory `Sidebar Navigation`); confirm before adding entries.
- **Legacy / not registered:** `bemaComplianceMenuItems.ts` — kept for
  reference, do not extend.
- `applyComplianceRemoteRouting` (from `src/lib/embed/satelliteRouting.ts`)
  rewrites compliance URLs when running inside the satellite shell — any new
  menu entry must route through this helper for portability.

---

## 9. Documentation already in place

- `docs/compliance/admin/COMPLIANCE_ADMIN_SCREEN_DOCUMENTATION_INDEX.md` —
  master index for admin screens (rules, templates, geography, staff,
  automation, integrations, tools).
- `docs/compliance/AUDIT_MANAGEMENT_FRAMEWORK.md` — audit/inspection lifecycle.
- `docs/compliance/PHASE1_RISK_MODEL_EXTENSION.md` …
  `PHASE5_UAT_FINAL.md` — risk scoring rollout plan & results.
- `docs/COMPLIANCE-MOBILE-API.md` — mobile inspector API contract.
- `docs/COMPLIANCE_SATELLITE_*.md` — satellite deployment notes.

When adding a new feature, **update the matching doc in the same PR** (per
project rule "knowledge-repository").

---

## 10. Gaps / risks before next build phase

These are observations, not work items — confirm scope before acting:

1. **Menu registration** — `complianceMenuItems.ts` is not in
   `sidebarMenuItems.ts`. Verify it's pulled from DB (`app_modules`) per
   memory; otherwise add to the aggregator.
2. **Capability rollout** — UI mostly still gates on legacy
   `manage_compliance`. Migrate menu/page gates to `useHasCapability` per
   `capabilities.ts` so the `inspector / senior / head` split is enforceable.
3. **Workflow binding** — approval flows (plan review, waiver, legal
   escalation) need explicit `workflow_definitions` records; today the screens
   exist (`PlannerApprovalInbox`, `WeeklyPlanReview`, `WaiversOverrides`,
   `LegalRecommendationQueue`) but it's unclear whether they use the generic
   engine or a domain-local approval table. Audit before adding new approvals.
4. **Country hardcoding** — none found in `ce_*` table names or libs; St Kitts
   & Nevis specifics live in seed data / `c3_system_rates`. Keep new rules
   parameter-driven.
5. **Audit trail consolidation** — both `ce_audit_log` and the global
   `system_audit_trail` exist. Per memory "Audit Trail System", new compliance
   actions should write to `system_audit_trail`; reserve `ce_audit_log` for
   inspector-audit module events. Confirm convention before logging.

---

## 11. Build-phase rules (locked from this inventory)

1. Reuse the route under `/compliance/*` — no new top-level routes.
2. Reuse `ce_*` tables/views; new domain tables must also use `ce_` prefix and
   keep RLS posture consistent (mostly off, financial/audit ON).
3. Gate features via `useHasCapability` + capability constants; only fall back
   to `manage_compliance` for legacy parity. **No new permission strings.**
4. Approvals → existing `workflow_definitions` engine. **No new approval tables.**
5. C3 data → existing `ce_v_c3_*` views and `ce_c3_ledger_sync_log`. **No new
   C3 math in compliance.**
6. Notices / risk / job execution → extend existing edge functions
   (`ce-notice-gen`, `ce-risk-recalculation`, `run-compliance-job`).
7. Sidebar entries → through DB `app_modules` (and `applyComplianceRemoteRouting`
   for URLs), not direct edits to a static aggregator.
8. Audit logging → `system_audit_trail` per global standard.
9. Every change updates the matching `docs/compliance/**` file.
10. C3 module code is read-only unless the change is a documented integration
    point (e.g. exposing a new column in `ce_v_c3_*`).
