# Internal Audit Module — Port into Satellite (Host Untouched)

## Goal
Make the Internal Audit module in **SocialServe-Internal Audit** (`7e98fc6b-…`) a 1:1 functional clone of the same module in **SocialServe** (`455cbbae-…`). Replace every "Page under development" placeholder with the real screen, wired to the **same shared Supabase database** that the host already uses.

## Hard constraints
- **Zero changes** to the host project `SocialServe` — no code edits, no migrations, no edge-function deploys, no `app_modules` row changes, nothing.
- **Zero database migrations** anywhere — host already owns every `ia_*` table, RPC, view, trigger, edge function, notification template, workflow definition. The satellite reuses them as-is.
- All work happens **only** inside the satellite repo and the satellite's Supabase client config.

## Scope (host inventory to port into satellite)
- **27 pages** under `src/pages/audit/*` (Dashboard, Departments + View, Functions, Risk Assessment / Matrix / Register / Settings / Entity Summary, Audit Plans + Detail + Approval, Engagements + Detail, Preparation, Queries, Auditor Profiles, Workload, Time Tracking, Leave, Templates, Document Templates, Reports + Builder, Config, Module Activation).
- **~50 components** under `src/components/audit/*` plus `engagement/`, `execution/`, `reports/`, `templates/`, `workspace/` subfolders.
- **~50 hooks** (`useAuditData*`, `useAuditDataPhase2`, `useEngagement*`, `useRisk*`, `useAuditPlan*`, `useAuditCommunication*`, `useAuditTrail`, `useAuditedMutation`, `useFunctionRiskSync`, `useDepartmentRiskSync`, `useRiskRealtimeSync`, etc.).
- **~14 audit services** (`auditService`, `auditReportService`, `auditReportPdfService`, `auditCommunication*Service`, `auditNotificationService`, `auditPriorMatterLinkService`, `auditPublicSubmission*Service`, `iaNotificationService`, plus `weeklyAuditPlanService` if referenced by ported screens).
- **24 lib files** under `src/lib/audit/*` (riskEngine, capacityPlanner, plan/report layout + render + pagination + pdf/docx export, document foundation/resolver/defaults/overrides, communication actions/merge preview, output mappers, template governance/presets/types).
- **7 type files** (`audit.ts`, `auditChecklist.ts`, `auditCommunication.ts`, `auditPublicSubmissions.ts`, `auditReport.ts`, `riskPolicy.ts`, `weeklyAuditPlan.ts`).
- **5 audit reports pages** under `src/pages/reports/audit/*` (EngagementSummary, CommunicationCompliance, PlanSlippage, OverdueActions, CarryForwardAging).
- **Routes + sidebar**: replicate the host's `/audit/*` route map and the audit sidebar group inside the satellite.
- **Cross-cutting deps used by audit** (port only the pieces the audit screens actually need): `PageShell`, `DataTable`, `StatusBadge`, `SearchableSelect`, `BlockingOverlay`/`useBlockingMutation`, `SupabaseAuthContext` readiness gate, system_audit_trail logger helpers, notification template helpers, document-proxy invocation helper, `runtimeEnvironment`, `format-config`, error handler, `chartColors`, `statusColors`.

## Database strategy (host DB, no migrations)
Repoint the satellite's Supabase client at the **host** project so both apps read/write the same `ia_*` tables, RPCs, views and triggers.
- Override `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` in the satellite to the host values.
- The satellite's auto-generated `src/integrations/supabase/client.ts` and `types.ts` stay untouched in code; `types.ts` will regenerate against the host schema once env points at it.
- All audit data writes flow through the host's existing RPCs/tables exactly as in the host app.
- Notifications, document-proxy edge function, workflow engine, role/permission tables, `system_audit_trail`, `app_modules`, `notification_templates`, `system_business_events` are all reached on the host project automatically.
- **No INSERT/UPDATE/DELETE on `app_modules` or any host table from the satellite as part of this port.** Satellite uses whatever the host has already configured.

## Authentication
- Satellite already has `SupabaseAuthProvider` + `/auth/exchange` endpoint and a `/login` fallback. Once the satellite points at the host Supabase, the host's existing `satelliteSso` flow mints a code that the satellite exchanges for a session against the same project — single sign-on works end-to-end with no host edits.

## Phased delivery (each phase is independently shippable)

### Phase 0 — Repoint + shared infra (foundation)
- Override Supabase env in the satellite to the host project; verify `SupabaseAuthContext` boots and SSO exchange returns a session.
- Port shared primitives audit depends on: `src/components/common/*` (PageShell, DataTable, StatusBadge, SearchableSelect, BlockingOverlay), `useBlockingMutation`, `useUserCode`, `useAuditTrail`, `useAuditedMutation`, `globalErrorHandler`, `format-config`, `runtimeEnvironment`, `satelliteSso`, `chartColors`, `statusColors`.
- Port all 7 audit type files and all 24 `src/lib/audit/*` files.
- Port the audit sidebar group (DB-driven via host's `app_modules` once on host DB) and add a sidebar shell into the satellite layout.

### Phase 1 — Masters
Replace placeholders, wire to host DB:
- `/audit/departments` → `DepartmentMaster` + `DepartmentView`
- `/audit/functions` → `FunctionMaster`
- `/audit/risk-settings` → `RiskSettings` (+ `useRiskConfig`, `useFunctionRiskSync`, `useDepartmentRiskSync`)
- `/audit/document-templates` → `DocumentTemplateSettings`
- `/audit/templates` → `TemplatesManagement` + Communication Template services
- `/audit/config` → `AuditConfig`

### Phase 2 — Risk
- `/audit/risk-assessment` → `RiskAssessment`
- `/audit/risk-matrix` → `RiskMatrix` + `RiskHeatMap`
- `/audit/risk-register` → `RiskRegister` (+ `useRiskRegister`, `useRiskRecalculation`, `useRiskRealtimeSync`)
- `/audit/entity-summary` → `EntitySummary`

### Phase 3 — Plans & Approval
- `/audit/audit-plans` → `AuditPlansNew`
- `/audit/audit-plans/:id` → `AuditPlanDetail` (+ `PlanningWizard`, `AnnualPlanForm`, `AuditPlanForm`, `PlanApprovalBanner`, `PlanVersionHistory`, `PlanRevisionDialog`, `PlanAmendmentHistory`, `PlanSubmissionReadiness`, `PlanDistributionTab`, `LaunchReadinessPanel`, `CarryForwardBoard`, `AutoPlanSuggestions`, `CapacityCalendarPanel`, `TeamAvailabilityDashboard`, `ConflictAlertPanel`, plan workflow + change-log + artifacts hooks).
- `/audit/plan-approval` → `PlanApproval` (+ `useAuditPlanApproval`, `useAuditPlanWorkflowAccess`, `useAuditWorkflowGates`).

### Phase 4 — Engagements & Execution
- `/audit/audits` → `AuditEngagements` (+ `EngagementFilterBanner`, `AddEngagementToPlanForm`, `EditEngagementDialog`).
- `/audit/audits/:id` → `EngagementDetail` (+ `EngagementBuilder`, `WorkProgramPanel`, `ExecutionLifecycleStepper`, `EngagementGatePanel`, `ExecutionAuditTrail`, `EngagementClosurePanel`, `ClosureGatePanel`, `CommunicationStageDialog`, `CommunicationTimeline`, `DocumentRequestsTab`, `DiscussionThread`, `BoardPackTab`, `CoverageRiskTab`, plus `engagement/`, `execution/`, `workspace/` subfolders).
- `/audit/preparation` (if surfaced) → `AuditPreparation`.

### Phase 5 — People, Workload, Tracking
- `/audit/auditor-profiles` → `AuditorProfiles`
- `/audit/workload` → `WorkloadCapacity`
- `/audit/time-tracking` → `TimeTracking`
- `/audit/leave` → `AuditorLeaveManagement`
- `/audit/queries` → `AuditQueries`

### Phase 6 — Findings, Actions, Reports, Dashboard polish
- `/audit/findings`, `/audit/actions` → host's findings + action-tracker pages (use the same `useIAFindings` / `useIAActionTracking` data already on the dashboard).
- `/audit/audit-reports` → `AuditReports` + `AuditReportBuilder` (+ `reports/` subfolder, `reportOutputMapper`, `auditReportPdfService`, `auditReportService`, `ReportPreviewDialog`, `ReportCustomizationDialog`, `ReportIssuanceGate`).
- Port the 5 `src/pages/reports/audit/*` pages and add their routes.
- Reconcile satellite `AuditDashboard` with host dashboard if any drift remains.

### Phase 7 — Verification & parity sign-off
For each migrated screen run a parity checklist:
- Same data loaded for the same logged-in user (host vs satellite, side-by-side).
- Same validations fire on the same inputs.
- Same workflow actions appear, same approval/rejection paths, same notifications inserted.
- Same `system_audit_trail` rows written by the same actions.
- Same exports (PDF/DOCX) produce comparable output for the same record.
- No `/audit/*` route in the satellite still resolves to the placeholder component.
- Satellite has no direct `from('ia_*')` calls outside hooks/services that exist in host (access patterns mirror host).

## Technical notes
- **Auto-generated files** in the satellite (`src/integrations/supabase/client.ts`, `types.ts`, `.env`) must not be hand-edited; the env override regenerates `types.ts` against the host schema.
- **Realtime channels** (`useRiskRealtimeSync`, etc.) work transparently once both apps share the same Supabase project.
- **Document foundation, branding, communication templates, notification templates** all live in host DB — satellite reads them as-is.
- **No new edge functions** in the satellite. Calls to `document-proxy` and other audit edge functions resolve to the host project automatically after the env repoint.
- **Memory rules respected**: no RLS added; role-based security only; `isAuthReady && isAuthenticated` gating on every protected query; 1k-row chunked pagination; SearchableSelect; PII masking honored; `user_code` populated on all created/updated/verified-by fields.

## Deliverable per phase
1. Code merged for all screens in the phase (satellite repo only).
2. Placeholder routes removed.
3. Parity checklist (Phase 7 criteria) executed for that phase's screens.
4. Short verification note in chat: screens migrated, routes activated, anything deferred.

## Out of scope
- Any change to the host `SocialServe` project (code, schema, edge functions, `app_modules`, secrets).
- Any schema/migration/edge-function/secret change in the satellite Supabase project.
- Any UI redesign — the satellite must look and behave identical to the host.
- Compliance field-audit pages (`/compliance/*`), which already live on the host and are not part of the Internal Audit module.
