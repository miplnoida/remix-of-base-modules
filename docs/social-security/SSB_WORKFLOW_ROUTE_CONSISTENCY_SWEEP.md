# Workflow Route Consistency Sweep

Follow-up to `SSB_WORKFLOW_ROUTE_AND_SOURCE_ALIGNMENT_ACCEPTANCE.md`.
Confirms every workflow reference across code, DB seeds, and docs points at
the **actually working** screen and clearly separates registry vs designer.

## Canonical decisions (unchanged, restated)

| Purpose                          | Route                                   | Backing table          | Status |
|----------------------------------|-----------------------------------------|------------------------|--------|
| **Workflow Engine (registry)**   | `/admin/workflows` (+ `/new`, `/:id`)   | `workflow_definitions` | ✅ canonical, working |
| Legacy alias                     | `/admin/workflow`                       | —                      | Redirects → `/admin/workflows` |
| Visual designer shell            | `/admin/workflow-management` (+ sub)    | none (designer only)   | Kept as-is, NOT the registry |
| Schemes                          | `/admin/workflow-schemes`               | schemes only           | Kept |
| Triggers / Logs / Analytics / Instances / Security / Approvals / Role-Assignment | `/admin/workflow-*` | respective tables | Kept |

Rule: any UI, deep-link, governance rule, or doc that means "the Workflow
Engine registry" must point at `/admin/workflows`. `/admin/workflow-management`
is only referenced when the designer surface is specifically meant.

## Sweep results

### Code — already aligned (no changes this pass)

| File | Reference | Points to |
|------|-----------|-----------|
| `src/config/routes.ts` | `WORKFLOW_MANAGEMENT` constant | `/admin/workflows` ✅ |
| `src/components/sidebar/menuItems/systemAdminMenuItems.ts` | Sidebar → Workflow Engine → **Workflow Management** | `/admin/workflows` ✅ |
| `src/components/routing/AppRoutes.tsx` | `/admin/workflow` legacy alias | `<Navigate to="/admin/workflows">` ✅ |
| `src/pages/admin/ConfigurationCentre.tsx` | Workflow domain card `route` + `crudAt` | `/admin/workflows` ✅ |
| `src/services/ssb/ssbImplementationConfigService.ts` | Workflow section deep-link | `/admin/workflows` ✅ |
| `src/services/ssb-configuration/ssbConfigurationGovernanceService.ts` | `SSB.E017.REF` / `SSB.W017.INACTIVE` recommendations | `/admin/workflows` ✅ |
| `src/components/admin/ssb/sections/WorkflowPolicyForm.tsx` | `workflow_code` selector | `workflow_definitions` (same source as `/admin/workflows`) ✅ |

### Database — already aligned

| Migration | Effect |
|-----------|--------|
| `20260706091844_*.sql` (initial seed) | Seeded `ssb_configuration_asset` row `ssb.workflow` with legacy `/admin/workflow`. Superseded in the same migration series. |
| `20260706171003_*.sql` | Updates the row to `canonical_route='/admin/workflows'`, `canonical_table='workflow_definitions'`, `canonical_service='useWorkflowManagement'`. ✅ |

On any fresh install both migrations run in order → the final asset row is
correct. No further migration required.

### Docs — corrected this pass

| File | Before | After |
|------|--------|-------|
| `docs/platform/PLATFORM_OWNERSHIP_MATRIX.md` | "Workflow management" = `/admin/workflow-management` (canonical), "Workflow designer" = `/admin/workflows` — **inverted** | "Workflow Engine (canonical registry)" = `/admin/workflows`, "Workflow visual designer" = `/admin/workflow-management`, "Workflow schemes" = `/admin/workflow-schemes`, legacy `/admin/workflow` documented as redirect |
| `docs/social-security/SSB_IMPLEMENTATION_CONFIGURATION_ACCEPTANCE.md` | Workflow / SLA → `/admin/workflow` | `/admin/workflows` |
| `docs/social-security/SSB_ADMIN_POLICY_CONFIGURATION_FIX_ACCEPTANCE.md` | Workflow engine → `/admin/workflow` | `/admin/workflows` (canonical registry, backed by `workflow_definitions`) |

### Docs — intentionally NOT changed

- `docs/social-security/SSB_WORKFLOW_ROUTE_AND_SOURCE_ALIGNMENT_ACCEPTANCE.md`
  — the earlier acceptance doc where `/admin/workflow` appears only inside
  the audit table and the rollback SQL; those references correctly describe
  the pre-fix state and how to revert.
- `docs/platform/EPIC_0_1_PLATFORM_ADMIN_ACCEPTANCE.md` — historical epic
  record; labels differ but the routes it lists are all real routes.
- `docs/social-security/SSB_ST_KITTS_IMPLEMENTATION_CONFIGURATION_SOURCE_MAP.md`,
  `SSB_CONFIGURATION_OWNERSHIP_MATRIX.md` — already point at
  `/admin/workflows`.

## Non-workflow-adjacent references (out of scope)

- `/legal/admin/workflow` — legal subsystem's own filtered view of the
  engine. Different capability, different page. Untouched.
- `/legal/settings/workflow`, `/bn/config/workflow-templates`,
  `/nbenefit/shared/workflows`, `/workflow/my-tasks`,
  `/workflow/applications-review`, `/registration/approval-workflow`,
  `/compliance/admin/workflow-mapping` — module-owned surfaces that
  consume the engine, not the engine itself. Untouched.

## Rollback

Revert the three doc edits above. No code or database change was made in
this sweep.

## Acceptance

- ✅ Every code path that means "Workflow Engine registry" resolves to
  `/admin/workflows`.
- ✅ `/admin/workflow` remains as a redirect alias only.
- ✅ `/admin/workflow-management` is documented as the visual designer
  shell, not the registry, and no user-facing link claims it is the
  registry.
- ✅ SSB governance, SSB Setup, Configuration Centre, Platform Ownership
  Matrix, and SSB Implementation Configuration Acceptance all agree.
- ✅ No BN / BEMA / IA / legacy tables changed. No new screens created.
- ✅ Typecheck unchanged (no code edits this pass).
