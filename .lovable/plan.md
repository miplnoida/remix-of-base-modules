# Legal Matter Workspace — Phase 1 (Read/Service Layer)

## Scope
Build a unified read-only resolver for Legal matters. No table changes, no removal of existing screens, no refactor of Case Detail/Letters/AI yet. Only the resolver + types + a workbench wire-up + an admin integrity report.

## Deliverables

### 1. Types
`src/types/legalMatterWorkspace.ts`
- `LegalMatterWorkspace` DTO with sub-objects: `identity`, `classification`, `source`, `party`, `status`, `assignment`, `sla`, `counts`, `latest`, `navigation`, `permissions` (all fields per spec).
- `LegalMatterLifecycleObjectType = 'REFERRAL' | 'INTAKE' | 'CASE' | 'ADVICE_REQUEST'`
- `LegalMatterCategory = 'ENFORCEMENT' | 'BENEFITS' | 'COMPLIANCE' | 'ADVISORY' | 'CONTRACT' | 'INTERNAL'`
- Filter + list result types.

### 2. Resolver service
`src/services/legal/legalMatterWorkspaceService.ts`
Reads from existing tables only:
- `legal_referral`, `lg_case_intake`, `lg_case`, `la_advice_request`
- `lg_case_assignment` (+ history), `lg_team`, `lg_team_workbasket`, `profiles`
- `au_er_master`, `au_ip_master`, `au_cl_head` (party resolution)
- `core_generated_document`, `lg_document_link`, `legal_referral_info_request`, `lg_case_action`, `lg_case_task`, `lg_case_activity` (counts/latest)
- `legal_referral_sla_event`, `legal_referral_sla_rule` (SLA)

Methods:
- `getByReferralId`, `getByIntakeId`, `getByCaseId`, `getByAdviceRequestId`
- `listForWorkbench(filters)`, `listForUserWorkbasket(ctx)`, `listForTeamWorkbasket(teamCode)`
- `buildTemplateContext(matterId)` — wraps existing `buildTokenContext` and extends with party/officer
- `buildAiContext(matterId)` — flat summary for prompt injection

Source-priority rules per spec (matter type, stage, assignment, primary party). Permissions are derived from `useLegalCapability` flags passed in by caller (service-pure: takes a `LegalCapability` arg, no React hooks).

### 3. React hooks
`src/hooks/legal/useLegalMatterWorkspace.ts`
- `useLegalMatterWorkspace(matterRef)`
- `useLegalMatterWorkspaceList(filters)`

Both wrap react-query and merge capability flags into the returned `permissions` block.

### 4. Workbench integration
Update `src/workbenches/legal-referrals/useLegalReferralsWorkbenchData.ts` to call `legalMatterWorkspaceService.listForWorkbench` and map columns:
Matter No, Source, Matter Type, Primary Party, Source Reference, Status, Stage, Workbasket, Team, Owner, SLA, Pending Info, Last Activity, Actions.

Fallback labels: `Not linked`, `Pending assignment`, `Not applicable`, `No activity yet`.

Update `LegalReferralsWorkbenchAdapter.tsx` row actions to be driven by `row.permissions` + `row.identity.lifecycle_object_type`. Remove any remaining placeholder buttons.

### 5. Admin integrity report
`src/pages/legal/admin/LegalMatterWorkspaceIntegrity.tsx`
Route: `/legal/admin/matter-workspace-integrity` (LEGAL_ADMIN/MANAGER per existing `legalRouteCapabilities`).
Checks listed in spec section 8, each as a card with a count + drill-down table. Pure SELECT queries through the service.

### 6. Non-goals (Phase 2+)
- Case Detail page rewrite
- Letter/template UI changes (service exposes `buildTemplateContext` but call sites stay)
- Documents tab rewrite
- AI integration UI

## Acceptance
- No DB migration.
- `tsgo` clean.
- Workbench rows render with no blank unexplained fields; only valid actions visible.
- Integrity report loads and lists violations on current data (or empty states).
- Existing Case Detail, Letters, Referral detail screens untouched and still work.

## Files
**New:** `src/types/legalMatterWorkspace.ts`, `src/services/legal/legalMatterWorkspaceService.ts`, `src/hooks/legal/useLegalMatterWorkspace.ts`, `src/pages/legal/admin/LegalMatterWorkspaceIntegrity.tsx`
**Modified:** `src/workbenches/legal-referrals/useLegalReferralsWorkbenchData.ts`, `src/workbenches/legal-referrals/LegalReferralsWorkbenchAdapter.tsx`, `src/components/routing/AppRoutes.tsx`, `src/config/legalRouteCapabilities.ts`
