

## Plan: Seed Test Users + Phase 2 Compliance Redesign

### Part A — Seed 3 Test Users

Create 3 users via `bootstrap-admin`-style edge function (or direct admin API) with role assignments:

| Email | Role | Operational Role |
|---|---|---|
| `inspector@secureserve.gov` | `Inspector` | inspector |
| `sinspector@secureserve.gov` | `SeniorInspector` | senior |
| `compliancehead@secureserve.gov` | `ComplianceHead` | head |

Password for all: `Admin@123` · `force_password_change = false` · `is_active = true`

**Note on email:** You wrote "linspector" — I'll use `sinspector@secureserve.gov` (Senior Inspector). Confirm if you want a different prefix.

**Implementation:**
1. New edge function `seed-compliance-test-users` (one-shot, idempotent — skips if email exists).
2. Creates `auth.users` via admin API → inserts into `profiles` → inserts into `user_roles`.
3. Logs each created user to `system_audit_trail`.
4. Returns JSON list of created/skipped users.
5. Trigger via a small admin-only utility page `/admin/seed-test-users` (button + result table) OR direct invoke — I'll add the page for convenience.

---

### Part B — Phase 2: Compliance Redesign

Per `.lovable/plan.md` Phase 1 shipped role/capability scaffolding. Phase 2 = wire it into real UI + workbench widgets.

**B1. Role-aware Workbench widgets** (`WorkbenchLanding.tsx` currently a router shell)
- **Inspector view** — My Visits Today, In-Progress Visits, Pending Reports, My Plans Awaiting Action, My Open Violations.
- **Senior view** — all Inspector widgets + Plans Awaiting My Approval, Reports Awaiting Review, Team Workload, Escalation Candidates.
- **Head view** — Module KPIs (open cases, overdue installments, breach count), Team Performance, Enforcement Pipeline, Recent Legal Escalations.
- Each widget = card with count + top 5 rows + "View all" link to canonical screen. Data via existing dashboard views where possible; new `useComplianceWorkbench(role)` hook for aggregation.

**B2. Capability-based menu gating**
- Replace broad `manage_compliance` checks in sidebar/route guards with capability checks from `ROLE_CAPABILITIES`.
- Add `useHasCapability(cap)` hook. Update `AppRoutes.tsx` route guards + sidebar filter to consult capabilities (with `manage_compliance` legacy fallback retained per Phase-1 spec).

**B3. Group navigation under operational headers**
DB update to `app_modules`:
- `Workbench` group → My Workbench, Team Workbench (senior+), Executive View (head only).
- `Field` group → Plan Builder, Visit Workspace, Weekly Reports, Sampling.
- `Cases & Violations` group → Violations, Cases (kept distinct, grouped).
- `Enforcement` group → keep as-is (already clean).
- `Reports & Analytics` group → operational reports + analytics.

**B4. Default landing redirect by role**
- Login redirect for compliance roles → `/compliance/workbench` (already exists, will populate).
- Non-compliance users unaffected.

**B5. Documentation**
- Update `.lovable/plan.md` Phase 2 section with what shipped.
- Memory entry: `mem://features/compliance/role-based-workbench`.

---

### Files to create/modify

**Created**
- `supabase/functions/seed-compliance-test-users/index.ts`
- `src/pages/admin/SeedTestUsers.tsx`
- `src/hooks/useComplianceWorkbench.ts`
- `src/hooks/useHasCapability.ts`
- `src/components/compliance/workbench/InspectorWorkbench.tsx`
- `src/components/compliance/workbench/SeniorWorkbench.tsx`
- `src/components/compliance/workbench/HeadWorkbench.tsx`
- Migration: app_modules grouping + default-landing config

**Modified**
- `src/pages/compliance/workbench/WorkbenchLanding.tsx` — render role-specific workbench
- `src/components/routing/AppRoutes.tsx` — capability gates + seed page route
- Sidebar filter logic — capability-aware
- Login redirect logic — role-aware default route
- `.lovable/plan.md`

### Backward compatibility
- `manage_compliance` legacy permission still grants all capabilities (Phase-1 fallback retained).
- Old workbench routes keep working — no further hard cutover this phase.
- Seed function is idempotent — safe to re-run.

### Test credentials after seed
```
inspector@secureserve.gov       / Admin@123  → Inspector workbench
sinspector@secureserve.gov      / Admin@123  → Senior workbench  
compliancehead@secureserve.gov  / Admin@123  → Head workbench
```

