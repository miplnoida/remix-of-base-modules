# SSB Workflow Route & Source Alignment — Acceptance

Aligns the SSB platform with the **actually working** Workflow Engine screen
before BN Product Builder consumption. No duplicate workflow screen or
engine is introduced; no BN / BEMA / IA / legacy tables changed.

## 1. Route audit (observed against the running app)

| Route                              | Renders                                | Data source                             | Status |
|------------------------------------|-----------------------------------------|-----------------------------------------|--------|
| `/admin/workflows`                 | `pages/admin/workflows/WorkflowList`    | **`workflow_definitions`** (persisted)  | ✅ Working — canonical registry |
| `/admin/workflow-management`       | `pages/workflow/WorkflowManagement`     | React Flow designer shell, no persistence for the registry | ⚠️ Renders, but is a designer surface, not the workflow registry |
| `/admin/workflow-management/{workflows,runs,data,templates,settings}` | Same designer shell | — | ⚠️ Same as above |
| `/admin/workflow-schemes`          | `WorkflowSchemeList`                    | Schemes only                            | ✅ Working (scheme mapping only) |
| `/admin/workflow` (legacy alias)   | Redirect                                | —                                       | Redirect only |

**Decision:** the canonical Workflow Engine screen is **`/admin/workflows`**
(reads/writes the same `workflow_definitions` rows every downstream module
already consumes: `useApplicationsReview`, workflow instances, tasks, etc.).
`/admin/workflow-management` remains as the visual designer surface — not
duplicated, not removed — but it is **not** the canonical registry entry
point for SSB governance or BN readiness.

## 2. Broken assumption identified

Prior code and SSB governance deep-linked to `/admin/workflow` and
`/admin/workflow-management` as if they were the workflow registry. The
working, data-backed registry is `/admin/workflows`. All SSB platform
references have been retargeted.

## 3. Canonical workflow source

- **Route:** `/admin/workflows`
- **Table:** `public.workflow_definitions`
- **Stored key:** `workflow_definitions.id` (uuid)
- **Label:** `workflow_definitions.name`
- **Filter:** `is_active = true`

## 4. Route / menu changes

- `AppRoutes.tsx`: the `/admin/workflow` legacy alias now redirects to
  `/admin/workflows` (previously pointed at the designer shell). The
  designer route `/admin/workflow-management` is untouched and still opens
  the existing designer — no duplicate screen created.
- Sidebar (`systemAdminMenuItems`) already points at `/admin/workflows` and
  its siblings — no menu change required.

## 5. SSB / Configuration link changes

- `src/services/ssb/ssbImplementationConfigService.ts` — Workflow / SLA
  section deep-link changed from `/admin/workflow` → `/admin/workflows`.
- `src/pages/admin/ConfigurationCentre.tsx` — the Workflow Engine domain
  card `route` and `crudAt` now point at `/admin/workflows`.
- `ssb_configuration_asset` (row `ssb.workflow`) — migration updates
  `canonical_route = '/admin/workflows'`, `canonical_table =
  'workflow_definitions'`, `canonical_service = 'useWorkflowManagement'`
  so the Configuration Governance page renders the working link.
- SSB Setup Workflow section (`WorkflowPolicyForm`) already opens under
  `/admin/ssb-setup` and now exposes the reference selector below.

## 6. SSB Workflow Policy source-of-truth fix

`src/components/admin/ssb/sections/WorkflowPolicyForm.tsx`:

- `workflow_code` is no longer free text. It is a `reference` field bound
  to `workflow_definitions` (`valueColumn: id`, `labelColumn: name`,
  `filter: { is_active: true }`, `sourceBadge: "Workflow Engine"`). Stored
  value is the stable `workflow_definitions.id`.
- `applies_to` (process) continues to source from `ssb_process_catalogue`.
- No hardcoded workflow options.

## 7. Governance validation

`ssbConfigurationGovernanceService.runSsbSetupValidation`:

- New rule `SSB.E017.REF` — for every ACTIVE workflow policy row, verify
  `workflow_code` matches a row in `workflow_definitions`. Missing / unknown
  references are **blocking errors** that hold BN readiness. Recommendation
  points users to `/admin/workflows` to bind a published workflow.
- New rule `SSB.W017.INACTIVE` — non-blocking warning when the referenced
  workflow exists but `is_active = false`.
- Existing `SSB.E017` presence rule is retained. BN readiness now requires
  both presence **and** valid reference into the working workflow source —
  it can no longer flip green while the policy points at nothing.

## 8. Duplicate workflow screen — explicit non-goal

No new workflow list, designer, engine, or table was created. The existing
`/admin/workflows` (list) and `/admin/workflow-management` (designer)
screens are preserved as-is. Only deep-links and the policy selector's
data source were changed.

## 9. Rollback

- Revert the four code edits (AppRoutes redirect, ssbImplementationConfigService,
  ConfigurationCentre, WorkflowPolicyForm, ssbConfigurationGovernanceService).
- Revert the asset row:

```sql
UPDATE public.ssb_configuration_asset
   SET canonical_route = '/admin/workflow',
       canonical_table = 'core_workbasket',
       canonical_service = 'workflowService'
 WHERE asset_key = 'ssb.workflow';
```

No data was migrated or destroyed.

## 10. Acceptance

- ✅ Working workflow screen (`/admin/workflows`) opens from the sidebar
  and from all SSB / Configuration deep-links.
- ✅ SSB Setup → Workflow section links to `/admin/workflows` via the
  updated `ssbImplementationConfigService` deep-link.
- ✅ Configuration Governance renders the Workflow asset reference link
  pointing at `/admin/workflows`.
- ✅ Workflow policy selector loads options from `workflow_definitions`
  (the same source the working workflow screen writes).
- ✅ No duplicate workflow engine, list, or designer created.
- ✅ Typecheck passes.
