## Finding

The DB is already consistent: all 19 distinct `bn_workbasket.assigned_role` values exist in `public.roles`, and the static TS list `BN_WORKFLOW_ROLES` was updated in the prior pass to contain them all — so the validator should currently report 0 ERROR. The only outlier in DB is workbasket `123` (legacy/test) mapped to generic `INTAKE_OFFICER`.

The remaining problem is structural: roles live in **three places** (DB `public.roles`, `bn_workbasket.assigned_role`, and the static TS `BN_WORKFLOW_ROLES`). Any future role added in DB will silently drift again. The user wants DB to be the single source of truth.

## Plan

### 1. DB-backed workflow role catalogue (source of truth)
- Add a tiny service `src/services/bn/workflowRoleCatalogService.ts`:
  - `fetchWorkflowRoles()` → `select role_name from public.roles where is_active = true` (cached 5 min).
  - `fetchBnWorkflowRoles()` → same, filtered to `role_name LIKE 'BN\_%'` + a small allow-list of generic operational roles still in use (`INTAKE_OFFICER`, `DIRECTOR`, `COMPLIANCE_OFFICER`, etc.).
- Add hook `useWorkflowRoles()` (React Query, `['workflow-roles']`) returning `{ roles: string[], isLoading, error }`.

### 2. Validator uses DB, not the static const
Rewrite the role check in `src/services/bn/bnRegistryValidationService.ts` (lines 209–238):
- Replace `new Set(BN_WORKFLOW_ROLES)` with `new Set(await fetchWorkflowRoles())`.
- Keep the same finding shape; severity stays ERROR.
- Legacy basket `123 → INTAKE_OFFICER` will then validate cleanly (role exists in DB allow-list).

### 3. UI selectors use the same DB source
Replace static imports of `BN_WORKFLOW_ROLES` in:
- `src/pages/bn/config/WorkbasketConfig.tsx` (line 175)
- `src/pages/bn/config/EscalationConfig.tsx` (line 199)
- `src/components/bn/config-builder/BlockInspector.tsx` (lines 156, 167)
- `src/components/bn/config-builder/canvasValidation.ts` (line 11) — make it async-aware or accept roles via props/context.

Each switches to `useWorkflowRoles()` (or `fetchBnWorkflowRoles()` for validators).

### 4. Keep the TS const as a typed fallback only
Demote `BN_WORKFLOW_ROLES` in `src/services/bn/registries/workflowRolesRegistry.ts` to a documented fallback list used only when the DB fetch fails (offline / first paint). Add a code comment stating DB is source of truth.

### 5. Optional cleanup
- Deactivate legacy basket `code = '123'` or rename it to a real BN workbasket — confirm with user before touching data.
- Add `BN_CONFIG_ADMIN` to the BN allow-list (exists in DB, not currently assigned to any basket but used by `useRuleGovernance`).

### 6. Acceptance verification
- Re-run Benefit Configuration Validation → Workflow Roles section shows 0 ERROR.
- `WorkbasketConfig` and `EscalationConfig` dropdowns list every active BN role from DB (incl. any future ones added via SQL — no code change needed).
- TypeScript build passes; existing imports of `BN_WORKFLOW_ROLES` still resolve to the fallback array.

## Files touched
- **new** `src/services/bn/workflowRoleCatalogService.ts`
- **new** `src/hooks/bn/useWorkflowRoles.ts`
- `src/services/bn/bnRegistryValidationService.ts` (role check → DB)
- `src/services/bn/registries/workflowRolesRegistry.ts` (mark as fallback)
- `src/pages/bn/config/WorkbasketConfig.tsx`
- `src/pages/bn/config/EscalationConfig.tsx`
- `src/components/bn/config-builder/BlockInspector.tsx`
- `src/components/bn/config-builder/canvasValidation.ts`

No DB migration required — `public.roles` already contains the 19 BN roles plus `BN_CONFIG_ADMIN`, and all 20 active workbaskets already map to valid roles.

## Open question
Workbasket `code = '123'` (assigned to `INTAKE_OFFICER`) looks like leftover test data. Want me to deactivate it as part of this pass, or leave it alone?