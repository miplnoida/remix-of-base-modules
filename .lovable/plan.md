
## Goal

On the **Case Details** page, give the assigned officer a one-click way to nominate the case's employer for a field inspection. The nomination lands in the officer's existing **Pending Planning** queue (same tray auto-scored candidates already sit in) so they can pull it into their weekly plan; the Compliance Head then approves the plan as they do today. No parallel planning system is created.

## Why here (and not the violation page)

A case bundles multiple violations for one employer. Deciding to inspect is an **employer/case-level** decision, not a per-violation one. Putting the button on the case avoids duplicate nominations when several violations under the same case would each be flagged.

## Where it fits in the existing pipeline

Today (confirmed by reading the code and DB):

- Candidates come from `fn_ce_score_candidates_batch` / view `ce_v_weekly_plan_candidates` (server-scored, employer-level, with reason codes such as `OPEN_VIOLATION`, `HIGH_RISK`, …). Rendered by `CandidateQueuePanel` on the Weekly Plan builder.
- Officers pull a candidate into a day → writes a row to `ce_weekly_plan_items` (`source_type`, `source_id`, `employer_id`, `visit_type`, `priority`, …) tied to the officer's `ce_weekly_plans` row.
- Officer submits the weekly plan → Compliance Head approves via existing weekly-plan approval flow (`plannerApprovalService`, `ce_weekly_plan_reviews`).

We reuse this pipeline. We introduce **one new candidate source**: `MANUAL_CASE_NOMINATION`.

## Changes

### 1. Data (single migration)

Extend `ce_planner_candidate_actions` usage — no new table. It already supports manual planner actions (`action_type`, `linked_case_id`, `approval_status`, `is_active`, `requested_by_user_code`). We use it as the durable record of the nomination:

- `action_type = 'NOMINATE_FOR_PLANNING'`
- `linked_case_id = <case.id>`, `employer_id = <case.employer_id>`
- `week_start_date = next Monday` (default) — officer can change on the plan builder
- `approval_required = false`, `approval_status = 'AUTO_APPROVED'` (nomination itself needs no approval; the weekly plan does)
- `requested_by_user_code = current officer`
- `reason` = "Officer nomination from Case <case_no>"

Add a small view `ce_v_pending_case_nominations` (SECURITY INVOKER) that lists active nominations not yet consumed by a `ce_weekly_plan_items` row for the same officer+employer+week. Grant `SELECT` to `authenticated`.

Update `fn_ce_score_candidates_batch` / `fn_ce_score_candidates_v3` to `UNION` in rows from that view with `candidate_source = 'MANUAL_CASE_NOMINATION'` and `candidate_reason = 'OFFICER_NOMINATED'`, priority boosted so they sort to the top of the officer's queue. Nominations are scoped to the officer who made them.

Add a uniqueness guard: one active nomination per `(employer_id, case_id, requested_by_user_code, week_start_date)` — prevents accidental duplicates when the officer clicks twice.

### 2. Services

- `src/services/inspectionNominationService.ts` (new):
  - `nominateCaseForInspection({ caseId, employerId, employerName, weekStartDate?, notes? })` → inserts into `ce_planner_candidate_actions`.
  - `withdrawNomination(nominationId)` → sets `is_active = false`.
  - `listMyPendingNominations()` → queries `ce_v_pending_case_nominations`.
- `planCandidateService`: no behavioural change; automatically surfaces the new rows through the RPCs.
- Add a candidate reason label + colour for `OFFICER_NOMINATED` in `planCandidateService.CANDIDATE_REASON_LABELS`.

### 3. UI — Case Details page

In the case header action row (next to Assign / Escalate):

- **Button:** `Add to Inspection Planning`
  - Visible only to the assigned officer (UUID/code match, same resolver already used on `AssignedCases`) or a Compliance Head.
  - Disabled + tooltip "Already in your pending planning list" when a nomination already exists for this case/officer for the current or next week.
  - On click → small dialog: read-only employer + case, optional target week (defaults next Monday), optional visit purpose note, Confirm.
- After success: toast "Added to your pending planning list — schedule it from Weekly Plan". Provide a link to `/compliance/weekly-plan`.
- **Withdraw:** If nomination exists and not yet placed on the plan, show `Remove from Planning` in an overflow menu.

### 4. UI — Weekly Plan builder

`CandidateQueuePanel` already renders scored candidates; the new source flows in for free. Two small tweaks:

- Show a distinct badge "Officer nomination" for `candidate_source = 'MANUAL_CASE_NOMINATION'`.
- In the source popover, deep-link back to the originating case (`/compliance/cases/:id`).

### 5. UI — My Work Queue

Add a compact "Pending planning nominations" strip (count + link to Weekly Plan) so officers don't forget items they nominated. Reuses `listMyPendingNominations()`.

## Permissions

- Nominate: assigned officer for the case, or Compliance Head. Gated via existing `useHasCapability` for `COMPLIANCE_CAPABILITIES.PLANNING_WRITE` (falls back to case-assignment check when capability not present).
- View own nominations: any authenticated compliance user (RLS filters to `requested_by_user_code = current user`).
- Approval of the weekly plan itself continues to sit with Compliance Head/Admin — unchanged.

## Out of scope

- No change to weekly-plan approval workflow.
- No auto-scheduling of nominations onto a specific day; the officer still drags them onto a day in the plan builder.
- No new communications/notifications beyond the existing plan-submission events.

## Files touched (technical)

- Migration: `ce_planner_candidate_actions` uniqueness index; new view `ce_v_pending_case_nominations`; update `fn_ce_score_candidates_batch` and `fn_ce_score_candidates_v3` to UNION nominations.
- `src/services/inspectionNominationService.ts` (new).
- `src/services/planCandidateService.ts` — add reason label.
- `src/pages/compliance/cases/CaseDetails.tsx` (and its header actions component) — add button, dialog, withdraw.
- `src/components/compliance/weekly-plan/CandidateCard.tsx` — nomination badge + case deep link.
- `src/pages/compliance/MyWorkQueue.tsx` — pending nominations strip.

## Verification

- Nominate from a case → row appears in officer's Pending Planning within the Weekly Plan builder with the "Officer nomination" badge.
- Drag onto a day → `ce_weekly_plan_items` row created; nomination disappears from Pending list (view excludes consumed items).
- Second click on the button is disabled with correct tooltip.
- Withdraw → nomination hidden from candidates; button re-enabled.
- Non-assigned, non-Head user does not see the button.
