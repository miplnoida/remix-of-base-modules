
## You're right — that arrangement should not have been created

Your understanding of the workflow is correct. The intended sequence is:

```text
Case opens
   → Officer assigned (case.assigned_officer_id set)
   → Officer contacts / visits the employer
   → Officer + employer agree on schedule (down payment, installments, frequency, terms)
   → Officer creates arrangement as DRAFT
   → Supervisor approves (approved_by, approved_at)
   → Employer signs (agreement_signed, signed_at, signature_data)
   → Status flips to ACTIVE, first installment scheduled
```

PA-UAT-2026-0001 skipped almost every gate. From the database:

```text
case.assigned_officer_id = NULL         ← no officer on the case
arrangement.status       = ACTIVE       ← should have been DRAFT
arrangement.approved_by  = 'UAT_B4'     ← a seed tag, not a supervisor user
arrangement.approved_at  = 07:35:50     ← 6 min after case opened at 07:29:02
arrangement.agreement_signed = true
arrangement.signed_at    = NULL         ← contradicts agreement_signed=true
arrangement.signature_data = NULL       ← contradicts agreement_signed=true
arrangement.created_by   = 'UAT_B4'
```

## Why it happened

The record was **not created through the app UI**. Two creation paths exist:

1. **UI path** — `CasePaymentArrangementDialog` → `centralPaymentArrangementService.createArrangementFromCase(...)`. This is what an officer would use.
2. **Seed path** — `supabase/seeds/phase5_demo.sql` and the UAT Batch 4 script (`docs/compliance/uat/BATCH_4_EXECUTION_REPORT.md`) do a **direct `INSERT INTO ce_payment_arrangements`** tagged `created_by = 'UAT_B4'`, `approved_by = 'UAT_B4'`, `status = 'ACTIVE'`.

The Batch 4 seed writes straight to the table and bypasses officer assignment, draft state, supervisor approval, and signature capture entirely. That is how the UAT scenario ended up with an ACTIVE arrangement on an unassigned case.

## Two independent issues to record

**Issue A (seed-only, no production risk).** UAT Batch 4 seeded an ACTIVE arrangement on a case with no assigned officer. Real users cannot reproduce this — the UI path requires opening the case, which is where officer assignment happens — but the UAT dataset misrepresents the intended workflow. This is what surprised you.

**Issue B (workflow enforcement gap in the real code path).** Even in the UI path, `CasePaymentArrangementDialog` and `centralPaymentArrangementService.createArrangementFromCase` do **not** currently check `case.assigned_officer_id IS NOT NULL` or enforce a DRAFT → APPROVED → ACTIVE transition. Today an officer with the right permission could create an ACTIVE arrangement on any case, even one that has no officer on it. That is a real hardening gap.

## Options — pick one for each issue

### Issue A — UAT seed

- **A1 (recommended, fastest).** Amend the Batch 4 seed so that before inserting PA-UAT-2026-0001 it:
  1. Sets `ce_cases.assigned_officer_id` on the target case to a UAT officer user (e.g. `UAT_OFFICER_1` — a real row in `staff` / `user_roles`).
  2. Inserts the arrangement as `status='DRAFT'`, `approved_by=NULL`, `approved_at=NULL`, `agreement_signed=false`, `signed_at=NULL`.
  3. Runs a second step that mirrors the supervisor-approval action (sets `status='ACTIVE'`, `approved_by='UAT_SUPERVISOR_1'`, `approved_at`) if the UAT flow expects an active arrangement at the end.
  4. Runs a third step that mirrors employer signing (sets `agreement_signed=true`, `signed_at`, `signature_data='UAT seed acknowledgement'`).
- **A2 (docs-only).** Leave the seed alone, document in `UAT_END_TO_END_FLOW_GUIDE.md` §4.4 that PA-UAT-2026-0001 is a **precomputed** ACTIVE arrangement that intentionally skips officer assignment for schedule reasons, and add a UAT step "Assign officer to CC-2026-f3856b before running further arrangement scenarios". Register as **G22 — Documented**.
- **A3.** Delete PA-UAT-2026-0001 from the seed entirely and require testers to create it via the UI after assigning an officer. Highest fidelity to real workflow but breaks any UAT step that assumes an ACTIVE arrangement is already present at Batch-5 start.

### Issue B — enforcement in the UI/service path

- **B1 (recommended).** In `centralPaymentArrangementService.createArrangementFromCase` add guards:
  - Reject if `case.assigned_officer_id IS NULL` with a clear message: "Assign an officer to this case before creating an arrangement."
  - Force new rows to `status = 'DRAFT'`, ignore any client-supplied status.
  - Move the ACTIVE flip into a separate `approveArrangement` action that requires a supervisor role and writes `approved_by` / `approved_at` from `auth.uid()` / `now()`.
  - Move `agreement_signed=true` into a separate `recordEmployerSignature` action that requires `signed_at` and `signature_data` to be present together.
  - In `CasePaymentArrangementDialog`, disable the "Create Arrangement" submit button when `case.assigned_officer_id` is null and show an inline hint.
  - Register as **G23 — Open**.
- **B2 (UI-only softening).** Just disable the dialog trigger in `CaseDetailView.tsx` when `c.assigned_officer_id` is null. Faster, but leaves the service open to programmatic misuse. Register as **G23 — Partial**.
- **B3.** Do nothing in code; document the expected officer-first sequence in the UAT guide only. Not recommended — the "Officer: Unassigned" panel in the screenshot is exactly the state the app should refuse.

## What I'd do

- **A1 + B1**, together, tracked as **G22** (seed corrected) and **G23** (service/UI hardened).
- No schema change required for either. `case.assigned_officer_id` and the DRAFT/APPROVED/ACTIVE states already exist on the tables.
- Also update the **previous plan's UI fix** (already applied) with a small addition: in the Case → Arrangements tab row, prefix a warning icon when `case.assigned_officer_id IS NULL` and `arrangement.status = 'ACTIVE'`. Pure presentation.

## Also worth noting

- The screenshot shows **Officer: Unassigned** on CC-2026-f3856b. Under B1 that alone would prevent the "New Arrangement" button from being clickable, and the current record would be flagged as a workflow anomaly in a supervisor dashboard (out of scope here — mention only).
- **G20** (cross-case arrangement visibility, Options A/B) and **G21** (arrangement total vs case total, S1/S2/S3) from the previous plan are still awaiting your decision.

Please confirm:
- A1 or A2 or A3 for the UAT seed?
- B1 or B2 or B3 for the workflow guard?
- Any change to G20 / G21 given this context?
