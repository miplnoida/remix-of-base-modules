## What's happening

Two separate things, both confirmed against the DB and code:

### 1. Why "All Violations" appears almost empty
The DB actually has **4,349 auto-generated `DETECTION_RULE` violations** (plus 14 manual, 3 manual penalty, etc.). The screen shows only **11** because of a hidden default filter inside `buildViolationFilterConditions` in `src/services/complianceDataService.ts`:

```
const targetMonth = filters.month || (!hasActiveFilter
  ? new Date().toISOString().slice(0, 7)   // ← silently defaults to current month
  : undefined);
```

So when you open `/compliance/violations` with no filters, the query silently adds `created_at >= 2026-06-01 AND < 2026-07-01`. Since the last scan ran on **2026-04-14**, June only contains the manual/seed rows — hence 11. The comment in `ViolationsManagement.tsx` ("Leave month empty…") was correct intent, but the service layer overrides it.

### 2. Where to manually fire violation generation
The detection engine is already wired up — it's the **`JOB-VIOLATION-SCAN`** automation job:

```text
ce_automation_jobs.JOB-VIOLATION-SCAN
  ↓ (run-compliance-job edge function)
ce-violation-scan edge function
  ↓
loads active ce_detection_rules → evaluates → inserts ce_violations
  (source_type = 'DETECTION_RULE')
```

It is enabled but **not scheduled** (no cron registered), and the last run was 2026‑04‑14. You can run it on demand from:

`/compliance/admin/automation/jobs` → row "Daily Violation Scan" → **Dry Run** or **Run**

This is the same engine the Rule Simulator uses for evaluation — Simulator is read-only, this job actually persists the rows.

---

## Plan

### Fix A — Stop hiding old auto-generated violations
File: `src/services/complianceDataService.ts`

Remove the implicit current-month default in `buildViolationFilterConditions`. Always honour `filters.month`; never inject a month when the caller passes none. This makes `/compliance/violations` show every non-deleted violation by default, matching the existing comment in `ViolationsManagement.tsx` and your expectation.

Counts at the top of the page ("Total / Open / Under Review / Escalated") will then reflect the real DB totals across all periods.

### Fix B — Make manual triggering discoverable from the Violations screen
File: `src/pages/compliance/violations/ViolationsManagement.tsx`

Add a small **"Run Detection Now"** button in the page header (next to "Create Manual Violation"), visible only to admins/compliance managers (`PermissionWrapper` on `manage_compliance` already gates the page; we'll additionally check the existing `compliance.risk.automation_jobs` feature flag so it disappears when automation is off).

On click:
1. Open a confirm dialog: "Run violation detection now? Choose Dry Run to preview without creating rows."
2. Two buttons: **Dry Run** and **Run Now**.
3. Calls the existing `useRunComplianceJob` hook with `jobCode: 'JOB-VIOLATION-SCAN'`. No new backend code, no new edge function — just exposing the existing job at the place users look.
4. On success, invalidate the violations queries so the table refreshes.

This avoids forcing every admin to remember the `/compliance/admin/automation/jobs` route while leaving that full screen intact for power users.

### Fix C — Tiny clarifying note on the simulator
File: `src/components/compliance/simulator/SimulationResults.tsx` (header area only)

Add a one-line helper under the results title:
> "Simulator is read-only. To actually create violations, use **Run Detection Now** on All Violations or the Violation Scan job under Automation."

No logic change.

---

## Out of scope

- No cron scheduling — you said keep it manual for now. We can add a `pg_cron` entry later in one migration when you're ready.
- No changes to the detection engine itself (`ce-violation-scan`), no schema changes, no RLS work.
- No changes to dedup, period coverage, or the manual-entry / simulator improvements already shipped.

## Technical summary (for reference)

- Code edits: 3 files (`complianceDataService.ts`, `ViolationsManagement.tsx`, `SimulationResults.tsx`).
- New component: `RunDetectionNowButton.tsx` under `src/components/compliance/violations/` reusing `useRunComplianceJob`.
- No new DB objects, no migration.
- Verification: after Fix A, `/compliance/violations` count badge should jump from 11 to ~4,382; after Fix B, clicking "Run Now" should toast "Created N violations" and the list refreshes with newly-dated `DETECTION_RULE` rows.
