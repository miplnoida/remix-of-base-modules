# Full Legal Module Capability Wiring

Apply the existing `useLegalCapability` hook + role model across **every** `lg_*` screen, the entire Legal Enforcement menu, and all Legal admin screens. Replace ad-hoc role checks and unguarded buttons with a single, consistent capability gate. Add a route-level guard so unauthorized users never reach the page.

## Goals

- Every Legal route is gated by role at the router level (no silent redirect to dashboard, no flicker).
- Every action button (create / edit / assign / reassign / approve / reject / close / reopen / send / cancel / configure) is gated by `useLegalCapability`.
- `LEGAL_READ_ONLY` users see all screens but cannot trigger any mutation.
- `LEGAL_ADMIN` is the only role that sees and uses the configuration screens.
- No hardcoded role strings remain in any Legal screen.

## Scope (screens touched)

**Operational**
- Referrals: workbench, list, detail, intake, info request, reassign, accept/reject
- Cases (Legal Enforcement): list, detail, intake, stage transitions, actions, deadlines, notes, assignments
- Hearings: schedule, attendees, outcomes
- Orders, Settlements, Notices
- Court proceedings, Court venues/officers (read for ops)
- Matters: list, detail, parties, documents, actions, financial snapshot, stage history
- Contract Reviews: list, detail, versions, comments, checklist, AI analysis, external share, cycles
- Advice Requests: list, detail, assignment, AI analysis
- Document links, calendar events, tasks

**Admin (LEGAL_ADMIN only)**
- Assignment Integrity (already built)
- Routing: `lg_routing_policy`, `lg_routing_source_map`, `lg_routing_case_type`, `lg_routing_stage_override`, `lg_routing_precedence`
- Workbaskets: `lg_team_workbasket`, `lg_workbasket_role`
- Teams & Staff: `lg_team`, `lg_team_member`, `lg_staff`
- Stage rules: `lg_stage_action_rule`, `lg_stage_document_rule`, `lg_stage_transition_rule`, `lg_stage_template_mapping`, `lg_stage_reference_mapping`
- Fees: `lg_fee_rule`, `lg_fee_bundle`, `lg_fee_waiver_policy`
- Department profile, workflow policy, matter types, court masters, case source config

## Approach

### 1. Centralized route guard
Create `src/components/legal/LegalRouteGuard.tsx`:
- Reads route → required capability mapping from a single config table.
- Uses `useLegalCapability()` to check access.
- While loading: skeleton. If denied: dedicated `LegalAccessDenied` screen explaining required role (no redirect to dashboard).
- Wrap every `/legal/*` and `/legal-enforcement/*` route in `AppRoutes.tsx` with `<LegalRouteGuard required="...">`.

### 2. Route → capability map
`src/config/legalRouteCapabilities.ts` — single source of truth: path pattern → required capability flag (or `view` for read-only-OK pages).

### 3. Expand `useLegalCapability`
Add any missing flags surfaced during the audit (e.g. `canConfigureRouting`, `canManageTeams`, `canManageStaff`, `canManageFeeRules`, `canManageStageRules`, `canManageWorkbaskets`, `canScheduleHearing`, `canRecordOrder`, `canIssueNotice`, `canRecordSettlement`, `canManageCourtMasters`, `canEditContractReview`, `canShareContractExternally`, `canRunContractAI`, `canRespondAdvice`).

### 4. Action gating pattern
Every mutating button/menu item across the listed screens becomes:
```tsx
{caps.canX && <Button onClick={...}>...</Button>}
```
For destructive/admin actions, also disable when `caps.isReadOnly`. No role-name string checks anywhere — only capability flags.

### 5. Read-only mode
For `LEGAL_READ_ONLY`: all forms render with `disabled` inputs, save buttons hidden, inline edit affordances suppressed. A subtle "Read-only access" badge appears in page header.

### 6. Menu visibility
Sidebar Legal/Legal Enforcement entries filter by the same capability map, so users only see what they can open.

### 7. No DB migration required
Role/team/workbasket/routing seed already done in previous migration. This pass is UI + guard only.

## Technical details

- New files: `src/components/legal/LegalRouteGuard.tsx`, `src/components/legal/LegalAccessDenied.tsx`, `src/components/legal/ReadOnlyBadge.tsx`, `src/config/legalRouteCapabilities.ts`, `src/hooks/legal/useLegalReadOnly.ts`.
- Modify: `src/hooks/legal/useLegalCapability.ts` (add flags), `src/components/routing/AppRoutes.tsx` (wrap legal routes), sidebar config (filter items by capability), and each `lg_*` page/form to wrap action buttons in capability checks.
- No changes to backend, RPCs, or schema.
- Build verification: `tsgo` after each batch of screens.

## Out of scope

- Field-level masking beyond existing PII rules.
- Server-side authorization (already enforced by NO-RLS app-layer policy + capability hook + future edge function checks).
- New workflows or new actions — only gating of existing ones.

## Acceptance

- Logging in as each of the six test users shows the correct menu, the correct buttons, and blocks every disallowed action.
- `LEGAL_READ_ONLY` can open every operational screen but cannot mutate anything.
- `LEGAL_ADMIN` is the only role with access to routing/teams/staff/workbasket/fee/stage admin screens.
- No `role === 'LEGAL_*'` string checks remain in `src/pages/legal/**` or `src/components/legal/**`.
- TypeScript build passes.
