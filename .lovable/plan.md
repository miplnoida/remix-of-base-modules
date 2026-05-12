## Target

Synchronize only **Integrated Compliance Hub** (`8471f73c-7659-4260-8d4d-c70dfbebe261`) so its **Compliance & Enforcement** module screens, components, menu items, and routes match **SocialServe** (`455cbbae-c40e-4f3f-af49-d9ed99089948`).

No changes will be made to SocialServe and no database/backend changes will be made.

## Key finding

The satellite already has many Compliance files copied, but it is still not matching because the satellite uses `src/pages/compliance/Routes.tsx`, while the main SocialServe module exposes newer Compliance screens through the main app router. Several SocialServe Compliance screens exist but are not routed in the satellite, including enhanced planner/revision flows, case detail, audit visit/report print, and approval inbox screens.

## Implementation plan for the satellite project only

1. **Update satellite Compliance route map**
   - Replace the satellite `src/pages/compliance/Routes.tsx` route definitions with the SocialServe Compliance route surface, adapted for the satellite nested `/compliance/*` route.
   - Add missing canonical routes:
     - `/compliance/workbench`
     - `/compliance/cases/:id`
     - `/compliance/field/plan-builder-v2`
     - `/compliance/field/plan-builder-v3`
     - `/compliance/field/approval-inbox`
     - `/approval/inbox` equivalent inside the satellite where applicable
     - `/approval/decide` if the standalone approval decision page is required by copied links
     - `/compliance/field/revisions-pending`
     - `/compliance/field/revision-review/:revisionId`
     - `/compliance/field/execution-dashboard/:planId/visit/:planItemId`
     - `/compliance/field/audit-visit/:planItemId`
     - `/compliance/field/audit-report/:reportId/print/:variant`
     - `/compliance/enforcement/legal-referral`
     - `/compliance/reports`
   - Keep legacy redirects from SocialServe so old Compliance links continue landing on the same canonical screens.

2. **Mirror all Compliance screen files used by those routes**
   - Copy/update from SocialServe into the satellite for every routed screen under:
     - `src/pages/compliance/**`
   - Specifically ensure these currently under-routed screens are present and identical:
     - `workbench/WorkbenchLanding.tsx`
     - `cases/CaseDetailView.tsx`
     - `audit-planning/WeeklyPlanBuilderV2.tsx`
     - `audit-planning/WeeklyPlanBuilderV3.tsx`
     - `audit-planning/PlannerApprovalInbox.tsx`
     - `audit-planning/PlannerApprovalDecidePage.tsx`
     - `audit-planning/RevisionsPending.tsx`
     - `audit-planning/PlanRevisionReview.tsx`
     - `audit-planning/AuditVisitWorkspace.tsx`
     - `audit-planning/AuditReportPrintPage.tsx`
     - `reports/ComplianceReports.tsx`

3. **Mirror supporting Compliance components**
   - Copy/update all SocialServe Compliance UI components used by the screens:
     - `src/components/compliance/**`
   - Include the enhanced weekly planner component subtree:
     - `src/components/compliance/weekly-plan/**`
     - `src/components/compliance/weekly-plan/v3/**`
   - Preserve the satellite app shell and sidebar layout; only the Compliance menu should render.

4. **Mirror supporting hooks, services, libs, config, and types required by Compliance**
   - Copy/update only dependencies required by copied Compliance screens:
     - `src/hooks/useComplianceRole.ts`
     - `src/hooks/useComplianceWorkbench.ts`
     - `src/hooks/useHasCapability.ts`
     - `src/hooks/useWeeklyPlanBuilder.ts`
     - `src/hooks/compliance/**`
     - `src/services/compliance/**`
     - `src/services/plannerApprovalService.ts`
     - `src/services/plannerCandidateActionsService.ts`
     - `src/services/plannerApprovalService.ts`
     - `src/services/caseViolationService.ts`
     - `src/services/complianceDataService.ts`
     - `src/lib/compliance/**`
     - `src/lib/smartDraftEngine.ts`
     - related `src/types/**` files, especially `weeklyPlan`, `violation`, `legal`, `inspection`, and Compliance settings types.
   - Do not copy unrelated BN, C3, Payments, or other non-Compliance modules unless a Compliance screen imports a shared utility from them and the import cannot be safely removed.

5. **Align sidebar menu with SocialServe Compliance routes**
   - Update `src/components/sidebar/menuItems/complianceMenuItems.ts` in the satellite to match the active SocialServe Compliance menu.
   - Ensure every visible menu URL has a working route.
   - Add or correct menu entries for any SocialServe Compliance screens that should be reachable, such as enhanced planner, approvals, revisions, reports, legal referral, and case detail entry points where appropriate.
   - Keep `DynamicSidebarContent` satellite-specific so it renders only `complianceMenuItems`.

6. **Keep satellite shell and authentication intact**
   - Do not replace the satellite `src/App.tsx` shell unless a route must be added outside `/compliance/*` for approval decision or auth exchange.
   - Preserve:
     - `/auth/exchange`
     - `/login`
     - `/` redirect to `/compliance/workbench/manager`
     - `/compliance/*` protected layout
   - Do not modify backend auth settings or environment/database configuration.

7. **Run import and route verification**
   - Sweep copied files for unresolved `@/...` imports.
   - Copy only missing shared files needed for Compliance screens.
   - Verify these satellite routes render without missing-component errors:
     - `/compliance/workbench`
     - `/compliance/workbench/manager`
     - `/compliance/workbench/monitoring`
     - `/compliance/violations`
     - `/compliance/cases`
     - `/compliance/cases/:id`
     - `/compliance/field/plan-builder`
     - `/compliance/field/plan-builder-v2`
     - `/compliance/field/plan-builder-v3`
     - `/compliance/field/approval-inbox`
     - `/compliance/field/revisions-pending`
     - `/compliance/field/audit-management`
     - `/compliance/enforcement/legal-queue`
     - `/compliance/enforcement/legal-referral`
     - `/compliance/reports`
     - `/compliance/admin/settings/rule-engine`
     - `/compliance/admin/report-templates`

## Guardrails

- No database migrations.
- No backend changes.
- No SocialServe file edits.
- No changes to `src/integrations/supabase/client.ts` or generated backend type files.
- No mock data added.
- Satellite keeps only Compliance & Enforcement navigation.