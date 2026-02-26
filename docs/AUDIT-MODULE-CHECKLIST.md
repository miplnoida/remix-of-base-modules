# Internal Audit Module — Activation Checklist

## Status Legend
- ✅ **Functional** — Page loads, sidebar navigates correctly, feature flag enabled
- 🔲 **Placeholder** — Routes to "Under Activation" page (feature flag disabled)

## Module Status

| # | Module | Path | Status | Feature Flag |
|---|--------|------|--------|--------------|
| 1 | Auditor Profiles | `/audit/auditors` | ✅ Functional | `FEATURE_AUDIT_AUDITOR_PROFILES` |
| 2 | Workload & Capacity | `/audit/workload` | ✅ Functional | `FEATURE_AUDIT_WORKLOAD_CAPACITY` |
| 3 | Leave & Vacation Management | `/audit/leave` | ✅ Functional | `FEATURE_AUDIT_LEAVE_MANAGEMENT` |
| 4 | Holiday Management | `/audit/holidays` | ✅ Functional | `FEATURE_AUDIT_HOLIDAY_MANAGEMENT` |
| 5 | Audit Plans | `/audit/plans` | ✅ Functional | `FEATURE_AUDIT_PLANS` |
| 6 | Plan Approval | `/audit/approvals` | ✅ Functional | `FEATURE_AUDIT_PLAN_APPROVAL` |
| 7 | Activity Calendar | `/audit/calendar` | ✅ Functional | `FEATURE_AUDIT_ACTIVITY_CALENDAR` |
| 8 | Activity Workbench | `/audit/workbench` | ✅ Functional | `FEATURE_AUDIT_ACTIVITY_WORKBENCH` |
| 9 | Evidence Management | `/audit/evidence` | ✅ Functional | `FEATURE_AUDIT_EVIDENCE_MANAGEMENT` |
| 10 | Working Papers | `/audit/working-papers` | ✅ Functional | `FEATURE_AUDIT_WORKING_PAPERS` |
| 11 | Findings & Recommendations | `/audit/findings` | ✅ Functional | `FEATURE_AUDIT_FINDINGS` |
| 12 | Management Responses | `/audit/responses` | ✅ Functional | `FEATURE_AUDIT_MANAGEMENT_RESPONSES` |
| 13 | Action Tracking | `/audit/actions` | ✅ Functional | `FEATURE_AUDIT_ACTION_TRACKING` |
| 14 | Follow-Up Tracker | `/audit/followups` | ✅ Functional | `FEATURE_AUDIT_FOLLOWUP_TRACKER` |
| 15 | Plan Closeout | `/audit/closeout` | ✅ Functional | `FEATURE_AUDIT_PLAN_CLOSEOUT` |
| 16 | Audit Reports | `/audit/reports` | ✅ Functional | `FEATURE_AUDIT_REPORTS` |
| 17 | Letter Generation | `/audit/letters` | ✅ Functional | `FEATURE_AUDIT_LETTER_GENERATION` |
| 18 | Report Builder | `/audit/report-builder` | ✅ Functional | `FEATURE_AUDIT_REPORT_BUILDER` |
| 19 | Communication Center | `/audit/communication-center` | ✅ Functional | `FEATURE_AUDIT_COMMUNICATION_CENTER` |
| 20 | System Configuration | `/audit/config` | ✅ Functional | `FEATURE_AUDIT_SYSTEM_CONFIG` |
| 21 | Department Master | `/audit/departments` | ✅ Functional | `FEATURE_AUDIT_DEPARTMENT_MASTER` |
| 22 | Function Master | `/audit/functions` | ✅ Functional | `FEATURE_AUDIT_FUNCTION_MASTER` |
| 23 | Templates | `/audit/templates` | ✅ Functional | `FEATURE_AUDIT_TEMPLATES` |

## How to Disable a Module

To disable any module (e.g., for rollback), set its flag to `false` in `src/config/auditRouteConfig.ts`:

```typescript
export const AUDIT_FEATURE_FLAGS = {
  // ...
  FEATURE_AUDIT_REPORT_BUILDER: false, // ← disables this module
  // ...
};
```

The route will automatically show the "Under Activation" placeholder page instead.

## Architecture

- **Route Config**: `src/config/auditRouteConfig.ts` — single source of truth
- **Feature Gate**: `src/components/audit/AuditFeatureGate.tsx` — wraps routes
- **Placeholder**: `src/pages/audit/AuditModuleUnderActivation.tsx` — safe fallback
- **Sidebar**: `src/components/sidebar/menuItems/auditMenuItems.ts` — navigation items
- **Router**: `src/components/routing/AppRoutes.tsx` — all routes registered
