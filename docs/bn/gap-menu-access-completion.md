# BN-GAP-MENU — Dynamic Menu, Route, Admin Role & Current-User Access Certification

## Outcome
All six Benefits Gap modules are now first-class citizens under **Benefit Management** with menu visibility, protected routes, a canonical 5-action permission model, and full Admin access for `admin@secureserve.gov` (auto-granted via existing trigger).

## What changed

### Front-end
| File | Purpose |
|---|---|
| `src/components/bn/gap/BnGapModuleRouteGate.tsx` | Unified access control component. Fail-closed: checks auth → `app_modules.is_enabled` → `routes_enabled` → explicit `view` permission (or Admin). Exposes `actionsEnabled`, `rolloutState`, `readOnly` and the 5-action permission bundle to the page. |
| `src/components/bn/gap/BnGapModuleReadOnlyLanding.tsx` | Shared read-only workspace shell. Surfaces rollout status, canonical lifecycle states, canonical commands, cross-module hand-offs and the actor's effective permissions. |
| `src/pages/bn/gap/BnMortalityPage.tsx` | Landing (bn_mortality). |
| `src/pages/bn/gap/BnAppealsWorkspacePage.tsx` | Landing (bn_appeals). |
| `src/pages/bn/gap/BnMeansTestsPage.tsx` | Landing (bn_means_tests). |
| `src/pages/bn/gap/BnRiskManagementPage.tsx` | Landing (bn_risk_management). |
| `src/pages/bn/gap/BnUpratingPage.tsx` | Landing (bn_uprating). |
| `src/lib/bn/featureToggles.ts` | Added `bn.gap.mortality`, `bn.gap.appeals`, `bn.gap.meansTests`, `bn.gap.risk`, `bn.gap.uprating` (defaults=true, screen-level only; DB `actions_enabled` still gates mutations). |
| `src/components/routing/AppRoutes.tsx` | Registered `/bn/mortality`, `/bn/appeals-workspace`, `/bn/means-tests`, `/bn/risk-management`, `/bn/uprating` (each wrapped in `BnFeatureGate`, gated inside by `BnGapModuleRouteGate`). |
| `src/hooks/useNavigationMenu.ts` | **Fail-closed fix.** Removed `skipPermFilter = userPermissions.length === 0`. Only Admin bypasses filtering; every other user must have an explicit `view` grant. |

### Database (single migration)
- `app_modules` — six gap modules re-parented under `benefits_management` (`839cee37…`), `show_in_menu=true`, `routes_enabled=true`, routes aligned with React Router, icons + sort_order 60-65.
- `module_actions` — added `view` action for `bn_mortality`, `bn_appeals`, `bn_means_tests`, `bn_risk_management`, `bn_uprating`. `bn_overpayments` already had it.
- Admin `role_permissions` — auto-granted for all six `view` actions via existing `auto_grant_admin_permission` trigger.
- `user_roles` — `admin@secureserve.gov` bootstrapped to `Admin` (idempotent).

## Verification (executed post-migration)

**All six modules registered:**
```
bn_mortality       /bn/mortality          menu=t routes=t actions=f rollout=internal_pilot
bn_appeals         /bn/appeals-workspace  menu=t routes=t actions=t rollout=internal_pilot
bn_means_tests     /bn/means-tests        menu=t routes=t actions=f rollout=internal_pilot
bn_risk_management /bn/risk-management    menu=t routes=t actions=f rollout=internal_pilot
bn_uprating        /bn/uprating           menu=t routes=t actions=f rollout=internal_pilot
bn_overpayments    /bn/overpayments       menu=t routes=t actions=t rollout=public
```

**All six have `view` action, all six Admin-granted:**
```
bn_appeals         view granted=t
bn_means_tests     view granted=t
bn_mortality       view granted=t
bn_overpayments    view granted=t
bn_risk_management view granted=t
bn_uprating        view granted=t
```

## Security & guardrails

| Guardrail | Enforced by |
|---|---|
| Direct-URL entry requires `view` | `BnGapModuleRouteGate` |
| Non-admin sees no menu without explicit `view` | `useNavigationMenu.ts` (fail-closed) |
| Read-only mode | `app_modules.actions_enabled=false` surfaced through `ctx.readOnly` and a visible read-only banner |
| Mutations still fail-closed for pilot modules | Existing `bn_actor_has_capability` RPC continues to deny; `actions_enabled=false` is the second layer |
| Rollout gate | `app_modules.rollout_state` shown in shell; menu remains hidden when `show_in_menu=false` |

## Rollout status
- `bn_appeals`, `bn_overpayments` — `actions_enabled=true` (full pilot).
- `bn_mortality`, `bn_means_tests`, `bn_risk_management`, `bn_uprating` — `actions_enabled=false` (read-only pilot; server rejects mutations).

Promotion path: flip `app_modules.actions_enabled` per-module once operational UI ships.

## Not in scope this slice
- Operational mutation UIs for the four read-only modules (foundation stages S1–S6 remain in progress).
- Non-admin role grants — Admin only until stakeholders confirm the pilot role matrix.
