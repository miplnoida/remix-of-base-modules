# Compliance & Enforcement — Menu Alignment Summary

Generated: 2026-05-25. No functional behavior was changed beyond menu
structure, placeholder pages, and a feature-toggle helper.

## Access-control compliance

- Reused the existing legacy permission strings consumed by the static
  sidebar path (`requiresPermission`) — `manage_compliance`,
  `generate_reports`, `create_weekly_plan`, `conduct_inspections`.
- Did **not** create a new permission system, role list, or hardcoded
  role checks. Capability bundles in `src/lib/compliance/capabilities.ts`
  remain the only Compliance-specific abstraction and continue to fall
  back to `manage_compliance`.
- Every menu item (existing or new) carries `requiresPermission`.
- Feature-area visibility is additionally gated by a new helper
  (`src/lib/compliance/featureToggles.ts`) — TODO: replace with a real
  `ce_feature_toggles` admin screen.
- Placeholder routes render a "Configuration or implementation pending"
  card with no mock business data.

## Top-level menu (after alignment)

```
Compliance & Enforcement
├── Dashboard
├── My Work Queue
├── Violations
├── Compliance Cases
├── Notices And Communications
├── Payment Arrangements
├── Inspections
├── Legal Escalations
├── Risk And Employer Profile
├── Reports
└── Administration
```

The admin section is intentionally named **Administration** (users are
already inside Compliance & Enforcement). "Jurisdiction Configuration
Layer" is not surfaced as a label anywhere.

## Routes reused (existing, working)

| Menu item | Existing route |
|---|---|
| Dashboard → Overview | `/compliance/workbench/manager` |
| Dashboard → Inspector / Legal / Analytics / Monitoring | `/compliance/workbench/*` |
| Violations → All Violations | `/compliance/violations` |
| Violations → Manual Violation Entry | `/compliance/violations/manual-entry` |
| Cases → All Cases | `/compliance/cases` |
| Cases → Case Review | `/compliance/cases/queue` |
| Notices → Notice Register | `/compliance/enforcement/notices` |
| Arrangements → All Arrangements | `/compliance/enforcement/arrangements` |
| Arrangements → Breaches | `/compliance/enforcement/breaches` |
| Inspections → Plans / Assigned / Field Visits / Findings | `/compliance/field/plan-builder`, `/my-plans`, `/execution`, `/findings` |
| Legal → Review Queue | `/compliance/enforcement/legal-queue` |
| Legal → Escalation Recommendations | `/compliance/enforcement/recommendation-queue` |
| Legal → Status Tracking | `/compliance/enforcement/proceedings` |
| Risk → Employer Risk Register | `/compliance/field/employer-360` |
| Reports → all 7 existing report screens | `/compliance/reports/*` |
| Admin → General Settings, Violation Types, Rule Engine, Risk Scoring, Assignment Routing, Reference Numbering, Communication Templates, Notice Templates (report templates), Automation Jobs, Employer Response Settings, Simulators | `/compliance/admin/...` (paths preserved) |

## Routes added (placeholder — `PlaceholderPage`)

Top-level: `/compliance/my-work-queue`

Violations: `verification-queue`, `rule-detected`, `duplicate-review`, `history`

Cases: `intake`, `assigned`, `merge-review`, `reopen-requests`, `closure`

Notices: `generate`, `pending-approval`, `delivery-tracking`,
`employer-responses`, `communication-history`

Arrangements: `new`, `pending-approval`, `active`, `installments-due`,
`payment-allocation`

Inspections: `evidence`, `convert-finding`

Legal: `pack-preparation`, `approved-escalations`, `returned-from-legal`

Risk: `score-details`, `repeat-defaulters`, `high-risk`, `watchlist`

Reports: `automation-jobs`

Administration: `setup-wizard`, `feature-toggles`, `calculation-rules`,
`escalation-rules`, `case-families`, `workflow-mapping`,
`schedule-settings`, `payment-arrangement-rules`, `waiver-rules`,
`legal-handoff-rules`, `help`

## Routes preserved but no longer surfaced in the new top-level menu

These continue to work via direct URL but are not exposed in the new
flat top-level structure. They remain available for deep-links and the
DB-driven sidebar where modules are seeded:

- `/compliance/cases/penalties` (subsumed under Cases lifecycle — pending
  decision on whether Penalties becomes a Closure step or a separate
  Admin rule)
- `/compliance/field/operations`, `/field/inspections`,
  `/field/audit-management`, `/field/employer-statements`,
  `/field/weekly-report*`, `/field/all-reports`,
  `/field/weekly-report-review`, `/field/sampling*`,
  `/field/my-upcoming` (legacy Field surface; will be re-mapped under
  Inspections or My Work Queue in a follow-up prompt)
- `/compliance/enforcement/waivers` (subsumed under Administration →
  Waiver Rules for policy; the queue UI will be reattached when waiver
  workflow is built)
- `/compliance/admin/document-foundation`,
  `/compliance/admin/settings/templates`,
  `/compliance/admin/settings/sampling`,
  `/compliance/admin/settings/c3-ledger-sync` and other ledger pages,
  `/compliance/admin/geography/*`, `/compliance/admin/staff/*`,
  `/compliance/admin/automation/history`,
  `/compliance/admin/automation/employer-jobs` — kept reachable; these
  belong to a "deep Admin" tier that we'll group in a follow-up.

## Routes still pending implementation

All routes listed under "Routes added (placeholder)" above are not yet
implemented. They are reserved by the menu and route table so that
permissions, navigation, and deep-links can be wired now. Each renders
the `PlaceholderPage` component which clearly states
"Configuration or implementation pending" and never displays fake
business data.

## Feature toggles

`src/lib/compliance/featureToggles.ts` exposes
`isComplianceFeatureEnabled(key)` and a default-on map. Operators can
hide unfinished areas without code changes by setting
`VITE_COMPLIANCE_DISABLED_FEATURES=cases.intake,risk.watchlist,...` in
the environment. TODO: replace with an admin-managed table once the
Administration → Feature Toggles screen is implemented.
