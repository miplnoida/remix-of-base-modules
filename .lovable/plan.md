

## Compliance & Enforcement — Menu Restructure Plan (Navigation-Only)

### 1. Current state — what's actually in DB

The sidebar is **fully DB-driven** via `app_modules` + `get_user_accessible_modules` RPC. There is NO hardcoded `complianceMenuItems.ts` driving the live sidebar (the file exists but isn't used by `AppSidebar`). So all menu changes = `app_modules` updates (display_name, parent_id, sort_order, show_in_menu) + role_permissions tweaks.

Current top-level under "Compliance & Enforcement" (`ca000000-...-001`):
- Workbench, Field (`ce_field`), Violations, Cases, Enforcement, Reports, Settings — already correct top-level shape.

**Confirmed problems in DB:**
1. **Field** group has 17+ children mixing planning, execution, employer views, audits, weekly reports, sampling — flat list, no sub-grouping.
2. Duplicates inside Field: `My Plans`, `Plan Builder`, `Plan Execution Dashboard`, `Visit Workspace`, `Employer Visit Workspace`, `Field Execution`, `Audit Management`, `Employer 360`, `Employer Statements`, `Submit Weekly Report`, `Weekly Reports`, `Report Approvals`, `Sampling`, `Findings`.
3. Operational reports (weekly reports, findings) live under Field — correct, but `compliance_reports` group ALSO has weekly-plan-compliance and field-activities-summary → duplicate report exposure.
4. Workbench → no role-tailored items, just one landing page.
5. Some retired items already hidden (Field Operations, Inspections) from Phase 1 — keep.

### 2. Target structure (preserve top-level, add sub-groups under Field only)

```
Compliance & Enforcement
├─ Workbench                    [all – role-aware landing already done]
├─ Field
│   ├─ Plans
│   │   ├─ Plan Builder
│   │   ├─ My Plans
│   │   └─ Plan Approvals       [Senior+]
│   ├─ Visits & Execution
│   │   ├─ Visit Workspace      (canonical execution entry)
│   │   └─ Audits
│   ├─ Employer
│   │   ├─ Employer 360°
│   │   └─ Employer Statements  [Senior+]
│   ├─ Findings & Reports
│   │   ├─ Findings
│   │   ├─ Submit Weekly Report
│   │   ├─ Weekly Reports
│   │   └─ Report Approvals     [Senior+]
│   └─ Sampling                 [Senior+]
├─ Violations
├─ Cases
├─ Enforcement                  (unchanged — already clean)
├─ Reports                      (analytics only — remove weekly/field-activity duplicates)
└─ Settings                     (admin)
```

**Naming fixes:** "Field Execution" → drop (Visit Workspace is canonical). "Plan Execution Dashboard" → demote (not in primary menu; remains accessible via direct URL). "Employer Visit Workspace" → drop duplicate (Visit Workspace covers it).

### 3. Old → New mapping

| Old menu item | New location | Action |
|---|---|---|
| Plan Builder | Field › Plans | move under sub-group |
| My Plans | Field › Plans | move |
| Plan Approvals | Field › Plans | move (Senior+) |
| Plan Execution Dashboard | — | hide from menu (route kept) |
| Visit Workspace | Field › Visits & Execution | canonical |
| Field Execution | — | hide (duplicate of Visit Workspace) |
| Employer Visit Workspace | — | hide (duplicate) |
| Audit Management | Field › Visits & Execution | move + rename "Audits" |
| Employer 360° | Field › Employer | move |
| Employer Statements | Field › Employer | move (Senior+) |
| Findings | Field › Findings & Reports | move |
| Submit Weekly Report | Field › Findings & Reports | move |
| Weekly Reports | Field › Findings & Reports | move |
| Report Approvals | Field › Findings & Reports | move (Senior+) |
| Sampling | Field › Sampling | keep |
| Weekly Plan Compliance (in Reports) | — | hide (already in Field) |
| Field Activities Summary (in Reports) | — | hide (already in Field) |

### 4. Navigation fixes
- All routes preserved — only `parent_id`, `sort_order`, `display_name`, `show_in_menu` change.
- 4 sub-group container modules created under Field: `ce_field_plans`, `ce_field_execution_grp`, `ce_field_employer`, `ce_field_findings`. (Container-only, `route=NULL`, `routes_enabled=false`.)
- 2 demoted modules: `show_in_menu=false` (Plan Execution Dashboard, legacy Field Execution if separate from Visit Workspace).
- 2 duplicate report entries hidden from `Reports` group.

### 5. Role-based visibility
Already partially done in Phase 1. Refine via `role_permissions`:
- **Inspector**: revoke `view` on Plan Approvals, Report Approvals, Sampling, Employer Statements (leave plans/visits/findings/employer-360/weekly-submit/own-violations/own-cases).
- **SeniorInspector**: keep all Field items + approvals + sampling. Add explicit `view` for the 4 new container groups.
- **ComplianceHead**: full module access (already granted).
- Containers granted to all 3 roles so sub-items are reachable.

### 6. Permissions
- Use existing `module_actions.action_name='view'` rows.
- For each new container module → add a `view` action + grant to inspector/senior/head.
- For revoked items above → set `is_granted=false` on inspector role rows (keep row for auditability).

### 7. Backward compatibility
- ✅ Zero routes deleted, zero components touched.
- ✅ All hidden items remain reachable by direct URL (admins can re-enable via Settings).
- ✅ Admin sees same items because admin bypasses permission filter; admin WILL see new sub-groups (visible improvement).
- ✅ Existing Phase-1 hidden items stay hidden.
- ✅ Cache: users may need one hard refresh post-migration; sidebar will pick up new structure on next `get_user_accessible_modules` call.

### 8. Files changed
- **1 migration** — all `app_modules` + `module_actions` + `role_permissions` updates in one transaction.
- **0 code files** — sidebar is DB-driven; no React changes needed.

### 9. What I will NOT touch
- No new screens, no workflow changes, no new permission system, no admin menu changes, no top-level group renames, no route renames, no component edits.

