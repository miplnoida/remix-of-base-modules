# EPIC-06B — Judicial Orders, Appeals & Enforcement

**Status:** stabilized after EPIC-06B.1 (integration wave).
**Foundation:** EPIC-06A Recoverable Liability.

## Routes

| Route | Purpose | Menu |
| --- | --- | --- |
| `/legal/lg/orders` | Judicial Orders & Judgments workbench (grid + KPIs + filters) | ✅ visible |
| `/legal/lg/orders/:id` | Order detail — liabilities, compliance, appeals, enforcement, activity | ❌ deep-link only |
| `/legal/lg/cases/:id` (tabs Orders / Appeals / Enforcement) | Matter Workspace surfaces | via case detail |

## Menu changes (EPIC-06B.1)

`src/components/sidebar/menuItems/legalManagementMenuItems.ts` — section
**Court Orders & Enforcement** now contains:

1. Judicial Orders & Judgments → `/legal/lg/orders` (new, primary)
2. Court Orders (Legacy) → `/legal/court-orders`
3. Enforcement Actions → `/legal/enforcement`
4. Payment Plans → `/legal/payment-plans`

Only the workbench is exposed. The detail route stays deep-link only.

## Lifecycle

```
Hearing → Order (DRAFT → FILED → GRANTED → ACTIVE)
                                      ↓
                          Compliance events (PAYMENT / MISSED / BREACH)
                                      ↓
                     COMPLIED  |  BREACHED → Enforcement → Recovery
                                      ↓                       ↓
                                  Appeal (any stage)       Payment allocation
                                      ↓
                                  CLOSED
```

State machines:
- `src/services/legal/lgOrderStateMachine.ts`
- `src/services/legal/lgAppealStateMachine.ts`
- `src/services/legal/lgEnforcementStateMachine.ts`

## Permissions

Added to `useLgAccess.ts` (EPIC-06B):
`lg_order.view/create/edit/change_status/close`,
`lg_appeal.view/file/edit/decide`,
`lg_enforcement.view/create/execute/close`,
`lg_order_compliance.log/breach_sweep`.
Applied consistently to workbench, detail, and case tabs.

## Liability integration (EPIC-06A)

- `lg_order_liability`, `lg_appeal_liability`, `lg_enforcement_liability` junction tables.
- Rollup triggers update liability outstanding / recovered totals.
- `LiabilityLinkDialog` reused across order, appeal, and enforcement scopes.

## Matter Workspace integration (EPIC-06B.1)

- `/legal/lg/cases/:id?tab=orders` → `LgCaseOrdersTab` (existing, EPIC-06A).
- `/legal/lg/cases/:id?tab=appeals` → **`CaseAppealsTab`** (new, EPIC-06B.1) —
  lists every appeal on the case with quick link to parent order.
- `/legal/lg/cases/:id?tab=enforcement` → **`CaseEnforcementTab`** (new, EPIC-06B.1) —
  lists all enforcement actions with recovered/target amounts and agency.
- Snapshot rail and Unified Timeline already read from `lg_order` / `lg_appeal` /
  `lg_enforcement_action` so they surface automatically.

## Court Operations integration (EPIC-06B.1)

`HearingOutcomeDialog` — when outcome code matches
`ORDER|JUDG|GRANT|DECREE`, the dialog raises a **"Draft Order"** toast that
navigates to `/legal/lg/orders?caseId=…&hearingId=…&court=…&draft=1`. The
Orders workbench draft dialog reads those params to pre-fill case, hearing,
court, and (via liability retrofit) the currently linked liabilities.

## Recovery Workbench integration

- Liability child drawers already display order / appeal / enforcement rollups
  from the EPIC-06A junctions.
- Health engine (`lgRecoveryHealth.ts`) already accepts inputs for breached
  order, active appeal, active enforcement, compliance due, outstanding order —
  stays wired through EPIC-06B.

## Documents & Notices (EPIC-06B.1)

`src/components/legal/order/JudicialTemplateActions.tsx` renders one action per
template code and looks each up in `core_template`. Missing templates render
disabled with **"Template not configured"** — no dead actions.

Template codes:
- `LG_ORDER_COPY`, `LG_JUDGMENT_COPY`
- `LG_ORDER_COMPLIANCE`, `LG_ORDER_BREACH`
- `LG_APPEAL_NOTICE`, `LG_ENFORCEMENT_NOTICE`

## Rule-based task creation (EPIC-06B.1)

`src/services/legal/lgJudicialTaskAutomation.ts` — every insert writes a
`lg_case_activity` entry (`AUTO_TASK_CREATED`) for audit.

| Trigger | Task | Priority | Due |
| --- | --- | --- | --- |
| Order → ACTIVE/GRANTED | Compliance follow-up | HIGH | order compliance date or +14d |
| Order → ACTIVE/GRANTED (amount > 0) | Payment monitoring | MEDIUM | +30d |
| Appeal filed | Deadline reminder | HIGH | deadline − 7d |
| Compliance BREACH / MISSED | Breach review | URGENT | +3d |
| Enforcement created | Enforcement preparation | HIGH | +5d |

Automation is fire-and-forget — no order/appeal/enforcement write path fails
if task insert errors.

## Remaining gaps

1. Court Operations still opens Draft Order via URL params + toast; a deep
   embedded dialog inside the hearing outcome flow is deferred to EPIC-07.
2. Templates ship as codes only — the actual DOCX / PDF renderers for the six
   `LG_*` codes will be seeded during Templates & DMS EPIC.
3. Enforcement liability drilldown drawer is available in the workbench but not
   yet mirrored inside the case-level `CaseEnforcementTab` (link-out only).
4. Auto-tasks assume default `sla_hours` — priority-specific SLAs will be
   introduced with Tasks & SLA v2.

## UAT scenarios

1. Log in as Legal Handler. Sidebar shows **Judicial Orders & Judgments**.
   Click it → workbench opens with KPI cards.
2. Open a case with an active hearing. Record outcome `ORDER_ISSUED`. A toast
   "Outcome implies an order — Draft Order" appears. Click it → workbench opens
   with case/hearing prefilled.
3. Draft an order, link two liabilities, transition through FILED → GRANTED →
   ACTIVE. Confirm an auto-task **"Compliance follow-up for order …"** is
   created and audit logged as `AUTO_TASK_CREATED`.
4. On the order, log a compliance event `BREACH_RECORDED`. Confirm auto-task
   **"Breach review — order …"** appears with URGENT priority.
5. File an appeal with a deadline. Confirm reminder task appears dated
   deadline − 7d.
6. Create an enforcement action. Confirm preparation task exists.
7. Open the case detail Appeals tab → all appeals across the case list, each
   with a quick link back to its order. Same for Enforcement tab.
8. Open Recovery Workbench, expand a liability. Order, appeal, enforcement
   status appear at liability level.
9. Click a document action whose template is not seeded — button is disabled
   with "not configured" hint. Never a dead click.
