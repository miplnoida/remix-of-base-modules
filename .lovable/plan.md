

# Internal Audit Module — Gap Analysis (Plan vs. Implementation)

Compared against `.lovable/plan.md`, here is the status of every promised deliverable across all 8 phases, plus the "Remaining" section.

---

## Phase 1: Ad-hoc Audits + Plan Amendments — COMPLETE

| Deliverable | Status |
|---|---|
| `audit_type` column on `ia_department_audits` | Implemented |
| `annual_plan_id` nullable for ad-hoc audits | Implemented |
| `ia_plan_amendments` table | Implemented |
| Ad-hoc audit creation + type filter in `AuditPlansNew.tsx` | Implemented |
| `DepartmentAuditForm.tsx` ad-hoc mode | Implemented |
| `PlanAmendmentHistory.tsx` component | Implemented |

No gaps.

---

## Phase 2: Enhanced Approval Workflow + Email Notifications — COMPLETE

| Deliverable | Status |
|---|---|
| `ia_approval_actions` table | Implemented |
| Tabbed PlanApproval (Pending/Dept Acceptance/Decided/History) | Implemented |
| Dept Head acceptance step | Implemented |
| Approval comments on all decisions | Implemented |
| `send-notification` edge function with Resend | Implemented |
| `auditNotificationService.ts` | Implemented (used in PlanApproval + FindingsManagement) |

No gaps.

---

## Phase 3: Auto Corrective Actions + Reminders — COMPLETE

| Deliverable | Status |
|---|---|
| Auto-generate corrective action on finding creation | Implemented in `useIAFindingMutations` |
| 30-day due date auto-set | Implemented |
| Notification to dept head on finding creation | Implemented |
| `audit-due-date-reminders` edge function | Implemented |

**GAP: Cron job for `audit-due-date-reminders` is NOT set up** (listed in "Remaining" section of plan). The edge function exists but has no scheduled trigger.

---

## Phase 4: Audit Preparation Screen — COMPLETE

| Deliverable | Status |
|---|---|
| `ia_preparation_checklists` + `ia_preparation_documents` tables | Implemented |
| `AuditPreparation.tsx` page | Implemented |
| Checklist/Documents/Team tabs | Implemented |
| Status transitions | Implemented |
| Route, sidebar, feature flag | All present |

No gaps.

---

## Phase 5: Discussion Threads — COMPLETE

| Deliverable | Status |
|---|---|
| `ia_discussion_threads` + `ia_discussion_comments` tables | Implemented |
| Realtime enabled on `ia_discussion_comments` | Implemented |
| `DiscussionThread.tsx` reusable component | Implemented |
| Embedded in Findings, ActivityWorkbench, AuditPlans view modals | All 3 confirmed |
| `useAuditDiscussions.ts` hook | Implemented |

No gaps.

---

## Phase 6: Risk-History Integration + Reporting — PARTIAL (as noted in plan)

| Deliverable | Status |
|---|---|
| `historical_risk_adjustment` column on `ia_department_functions` | Implemented |
| `RiskHeatMap.tsx` component | Implemented |
| `AuditHistoryTimeline.tsx` component | Implemented |
| DB function for risk adjustment | **GAP** — Deferred to Phase 7 (later completed there) |
| Dashboard integration of RiskHeatMap/Timeline | **GAP** — These components exist but are **not embedded** in any page (Executive Dashboard does not use them) |

---

## Phase 7: Gap Analysis Resolution — COMPLETE

| Deliverable | Status |
|---|---|
| Root cause fields on `ia_findings` | Implemented |
| Root Cause Analysis section in FindingsManagement | Implemented |
| `calculate_historical_risk_adjustment` DB function + trigger | Implemented |
| RiskAssessment displays historical adjustment | Implemented |
| `ia_config_change_requests` table | Implemented |
| Config Approvals tab in AuditConfig | Implemented |
| `useConfigChangeRequests.ts` hook | Implemented |

No gaps.

---

## Phase 8: Architecture Cleanup — COMPLETE

| Deliverable | Status |
|---|---|
| Audit Universe removed | Confirmed removed |
| `risk_owner` column on `ia_rcm_risks` | Implemented |
| "Critical" severity added to findings | Implemented |
| Sidebar restructured into lifecycle groups | Confirmed (9 section labels in sidebar) |

No gaps.

---

## "Remaining (Next Iteration)" from plan.md

| Item | Status |
|---|---|
| Apply approved config changes automatically | **NOT IMPLEMENTED** — approval/rejection is recorded, but approved changes are not auto-applied to the target config tables |
| Set up cron job for `audit-due-date-reminders` | **NOT IMPLEMENTED** — edge function exists but no scheduled trigger |

---

## Summary of All Gaps

```text
┌───┬──────────────────────────────────────────────────┬──────────┐
│ # │ Gap                                              │ Priority │
├───┼──────────────────────────────────────────────────┼──────────┤
│ 1 │ RiskHeatMap not embedded in any dashboard/page   │ Medium   │
│ 2 │ AuditHistoryTimeline not embedded in any page    │ Medium   │
│ 3 │ Approved config changes not auto-applied         │ High     │
│ 4 │ Cron job for due-date reminders not configured   │ High     │
└───┴──────────────────────────────────────────────────┴──────────┘
```

**4 gaps total** out of ~50 deliverables. Phases 1, 2, 4, 5, 7, 8 are fully complete. Phase 3 is complete except for the cron trigger. Phase 6 has unused components.

### Recommended Implementation Order
1. **Embed RiskHeatMap + AuditHistoryTimeline** into the Executive Dashboard — low effort, high visibility.
2. **Auto-apply approved config changes** — write logic in `useConfigChangeRequests` review mutation to update the target config table after approval.
3. **Set up cron schedule** for `audit-due-date-reminders` via a database `pg_cron` job or external scheduler.

