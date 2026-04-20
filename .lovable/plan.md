# Compliance & Enforcement — Non-Admin Module Redesign

## 1. Current-State Assessment
~50 routes / 6 top-level groups with significant overlap. Single `manage_compliance` permission gates almost everything → role distinction invisible. Field area: 17 menu items / ~6 real concepts.

**Keep:** Enforcement lifecycle, Cases (3 screens), Violations (2 screens), Workbench dashboards (need role-gating).
**Weak:** Field overlap, undifferentiated Workbench, fake child links in Reports, monolithic permission, missing roles.

## 2. Final Logical Structure
```
Compliance & Enforcement
├─ Workbench                  (role-aware home)
├─ Field
│   ├─ Plan Builder           [Inspector, Senior]
│   ├─ My Plans               [Inspector, Senior]
│   ├─ Plan Approvals         [Senior, Head]
│   ├─ Visit Workspace        [Inspector, Senior]
│   ├─ Audits                 [Inspector, Senior]
│   ├─ Findings               [all]
│   ├─ Employer 360°          [all]
│   ├─ Employer Statements    [Senior, Head]
│   ├─ Submit Weekly Report   [Inspector, Senior]
│   ├─ Weekly Reports         [all — own/team filter]
│   ├─ Report Approvals       [Senior, Head]
│   └─ Sampling               [Senior, Head]
├─ Violations
├─ Cases
├─ Enforcement
└─ Reports & Analytics
```

## 3. Roles
- **Inspector** (`ComplianceInspector`): own work.
- **Senior Inspector** (NEW `SeniorInspector`): + approvals, sampling, team workbench.
- **Compliance Head** (NEW `ComplianceHead`): full non-admin oversight + analytics. Not Admin.

## 4. Capability Model
Replaces single `manage_compliance` gate with: `compliance.field.execute|plan|approve_plans|report|approve_reports|sampling`, `compliance.violations.manage`, `compliance.cases.manage`, `compliance.enforcement.notices|arrangements|legal`, `compliance.workbench.team|enterprise`, `compliance.reports.operational|analytics`.

## 5. Routes Removed (Hard Cutover)
- `/compliance/field/operations`
- `/compliance/field/inspections`
- `/compliance/field/weekly-reports` (kept: `/compliance/field/all-reports`)
- `/compliance/field/my-upcoming`
- `/compliance/field/sampling/candidates`

## 6. Phase 1 Implementation
1. Migration: add `SeniorInspector` + `ComplianceHead` roles.
2. `src/lib/compliance/capabilities.ts` — capability constants + role bundles.
3. `src/hooks/useComplianceRole.ts` — returns `'inspector'|'senior'|'head'|'other'`.
4. `complianceMenuItems.ts` → `getComplianceMenu(role)` builder.
5. `sidebarMenuItems.ts` consumes role-aware builder.
6. `AppRoutes.tsx`: remove 5 retired routes; add `/compliance/workbench` redirect.
7. `WorkbenchLanding.tsx` — role-based redirect.

## 7. Backward Compatibility
- 5 routes 404 (per your decision).
- All other URLs unchanged.
- Capability layer falls back to `manage_compliance` — existing users unaffected.
- New roles created empty; legacy menu shown until users reassigned.
