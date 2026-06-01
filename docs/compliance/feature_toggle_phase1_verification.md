# Phase 1 Feature Toggle — Runtime Verification Guide

**Diagnostics URL (UAT-only, direct link):**
`/compliance/admin/feature-toggle-diagnostics`

Login as a user with **Compliance Setup / Feature Toggles** permission
(e.g. `mipl.student+compliance.admin@gmail.com`).

---

## Manual UAT steps

For each Phase 1 flag, do the OFF run, then the ON run.

### A. Verification Queue — `compliance.core.verification_queue`

| Step | OFF (toggle off in Setup → Feature Toggles) | ON |
| --- | --- | --- |
| 1. Diagnostics page §2 DB value | `OFF` | `ON` |
| 2. Diagnostics page §3 `violations.verificationQueue` | `OFF` | `ON` |
| 3. Open `/compliance/violations/verification-queue` directly | Shows **`FeatureDisabled`** card | Shows normal Verification Queue |
| 4. Confirm/Reject mutation (`verificationQueueService`) | Throws "Verification Queue is disabled…" | Works normally |

### B. Payment Arrangement — `compliance.payment.arrangement`

| Step | OFF | ON |
| --- | --- | --- |
| 1. Diagnostics §2 DB value | `OFF` | `ON` |
| 2. Diagnostics §3 helpers (`arrangements.*`) | All `OFF` | All `ON` |
| 3. `/compliance/arrangements/new` | `FeatureDisabled` | Normal page |
| 4. `/compliance/arrangements/active` | `FeatureDisabled` | Normal page |
| 5. `/compliance/arrangements/pending-approval` | `FeatureDisabled` | Normal page |
| 6. `/compliance/arrangements/installments-due` | `FeatureDisabled` | Normal page |
| 7. `/compliance/arrangements/payment-allocation` | `FeatureDisabled` | Normal page |
| 8. Programmatic create via `arrangementWorkflowService` / `centralPaymentArrangementService` | Throws "Payment Arrangement is disabled…" | Succeeds |

### C. Automation Jobs — `compliance.risk.automation_jobs`

| Step | OFF | ON |
| --- | --- | --- |
| 1. Diagnostics §2 DB value | `OFF` | `ON` |
| 2. Diagnostics §3 `reports.automationJobs` | `OFF` | `ON` |
| 3. `/compliance/admin/automation/jobs` | `FeatureDisabled` | Normal page |
| 4. `/compliance/reports/automation-jobs` | `FeatureDisabled` | Normal page |
| 5. **Run Now / Dry Run** mutation (`useRunComplianceJob`) | Toast: "Automation Jobs is disabled in Setup → Feature Toggles." | Job runs |
| 6. Direct edge-function call `run-compliance-job` (server) | Returns `{ ok: false, error: 'feature_disabled' }` | Runs |

---

## Expected diagnostics page values

When `compliance.core.verification_queue = false` and the rest are ON,
the diagnostics page should show:

- §1 Cache loaded: **ON**
- §2 `compliance.core.verification_queue`: **OFF**
- §3 `violations.verificationQueue`: **OFF**
- §3 every `arrangements.*` row: **ON**
- §4 `/compliance/violations/verification-queue` row shows DB = **OFF**, expected = `FeatureDisabled`

Click **Refresh flags** after every Setup-side change.

---

## Remaining limitations

- Sidebar (DB-driven `app_modules`) does **not** hide menu links when a
  Phase 1 flag is OFF — clicking the link lands on the `FeatureDisabled`
  page. Menu-level hiding is deferred to Phase 2.
- The legacy unmounted `src/pages/compliance/Routes.tsx` /
  `ComplianceRouteGate.tsx` are dead code (documented in
  `feature_toggle_runtime_debug.md`).
- Phase 2/3 toggles (legal, risk scoring, notices, inspections, etc.)
  remain persistence-only.
