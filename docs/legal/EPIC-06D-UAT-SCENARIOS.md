# EPIC-06D — UAT Scenarios

All scenarios assume a user in role `LEGAL_MANAGER` (maps to `LG_ADMIN`). Replace amounts and identifiers as needed.

## Scenario 1 — Bulk Arrears Assignment

**Precondition:** ≥ 5 `lg_recoverable_liability` rows in ACTIVE / PENDING state; one `lg_recovery_campaign` created (e.g. `ARREARS_DRIVE_2026`).

1. Navigate `/legal/recovery/assignments`. Confirm KPI chips render.
2. Click **New Assignment**. Provide title, link 5 liabilities, set campaign and strategy `DEMAND`.
3. Assign to officer `OFF-001`. Assignment moves `DRAFT → ASSIGNED`.
4. Open the assignment; verify **rollups** = sum of linked liabilities.
5. Move to `ACTIVE`. Diary entry added (`CALL`, subject "Initial outreach").
6. Next Recommended Action recomputes to `PHONE` / `VISIT` depending on last_action_at.
7. Payment posted against a liability (via existing `lgLiabilityService`) → assignment `total_paid` and `recovery_pct` auto-update via trigger.
8. Move to `COMPLETED` when recovery_pct ≥ 100, then `CLOSED`.

**Expected:** history has 4 STATUS_CHANGE rows; audit has field-diff entries for every officer change.

## Scenario 2 — Escalation & Transfer

1. Set an assignment's `last_action_at` to > 30 days ago (via diary).
2. Trigger recompute (open workspace) — Next Action shows `VISIT` / reason "No contact for … days".
3. Officer requests transfer to `OFF-002` with reason. `transfer_pending = true`.
4. Manager opens Transfers tab and approves.
5. Assignment officer changes; `transfer_pending = false`; audit + history records both events.

## Scenario 3 — Court-Linked Assignment

1. Assignment has a liability linked to a court order via `lg_order_liability`.
2. Rollup shows `order_count ≥ 1`.
3. Missed compliance date raises health to `CRITICAL` on next update.
4. Next Recommended Action returns `Court follow-up` with reason "Order outstanding, no action for N days".
5. Officer escalates → status `ESCALATED`, escalation_reason captured, notification dispatched via `lgNotificationRuleEngine`.

## Scenario 4 — Campaign Rollup

1. Create campaign `OVERPAYMENT_RECOV_Q1`.
2. Add 3 assignments to it. Each has different `total_paid`.
3. Call `recomputeCampaignRollup(id)` — campaign `actual_recovered_amount` = sum of assignment `total_paid`; `actual_assignment_count = 3`.

---

## Rollback

All EPIC-06D tables are additive. To rollback: drop the four triggers and the ten `lg_recovery_*` tables. No existing tables or services are altered.

---

## Scenario 5 — Terminology Alignment (EPIC-06D Finalization)

1. Open the Legal sidebar. Under **Legal Recovery**, verify the four items: **Legal Recovery Assignments**, **My Legal Recoveries**, **Team Legal Recoveries**, **Legal Recovery Campaigns**, and the **Legal Recovery Admin** sub-group.
2. Navigate to `/legal/lg/recovery-assignments`. Page title reads **"Legal Recovery Assignments"**.
3. Click **New Assignment** — the *New Legal Recovery Assignment* dialog opens; provide a title and press **Create Assignment**. Toast confirms `Legal Recovery Assignment <code> created` and navigation lands on `/legal/lg/recovery-assignments/:id`.
4. On the workspace, the back link reads **"← Legal Recovery Assignments"** and routes to `/legal/lg/recovery-assignments`.
5. Existing routes `/legal/recovery/assignments(/:id)` continue to redirect (backward compatibility).

**Expected:** All user-facing labels use "Legal Recovery". Underlying tables, services and technical route paths are unchanged.
